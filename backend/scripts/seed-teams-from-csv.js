/**
 * seed-teams-from-csv.js
 *
 * Lee el Communication Matrix CSV, filtra ex-empleados,
 * agrupa por GERENCIA y por AREA, resuelve logins a IDs de Zammad,
 * y sube los equipos a DynamoDB (sla-reporter-teams).
 *
 * Uso:
 *   cd backend
 *   node scripts/seed-teams-from-csv.js --csv /ruta/al/archivo.csv
 *   node scripts/seed-teams-from-csv.js --csv /ruta/al/archivo.csv --dry-run
 *
 * Requiere: VPN activa + variables de entorno en backend/.env
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const AWS = require('aws-sdk');

// ─── Config ───────────────────────────────────────────────────────────────────

const REGION         = process.env.AWS_REGION            || 'us-east-1';
const TEAMS_TABLE    = process.env.DYNAMO_TEAMS_TABLE     || 'sla-reporter-teams';
const DRY_RUN        = process.argv.includes('--dry-run');

const csvArgIndex = process.argv.indexOf('--csv');
const CSV_PATH = csvArgIndex !== -1
  ? process.argv[csvArgIndex + 1]
  : null;

if (!CSV_PATH) {
  console.error('Error: debes indicar la ruta al CSV con --csv /ruta/archivo.csv');
  process.exit(1);
}

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: REGION });

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'latin1'); // encoding para tildes
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    // Respetar comas dentro de comillas
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    cols.push(current.trim());

    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ''; });
    return row;
  });
}

// ─── Slugify ──────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nLeyendo CSV: ${CSV_PATH}`);
  const rows = parseCSV(CSV_PATH);
  console.log(`  Total filas: ${rows.length}`);

  // Filtrar ex-empleados
  const activos = rows.filter(r => !r['STATUS'].includes('Ex - Empleado') && r['USER TEAMS']);
  console.log(`  Empleados activos con login: ${activos.length}`);

  // Recopilar todos los emails únicos
  const allEmails = [...new Set(activos.map(r => r['EMAIL ADDRESS'].trim().toLowerCase()).filter(Boolean))];
  console.log(`  Emails únicos: ${allEmails.length}`);

  // ── Resolver emails → agent_ids en Zammad ─────────────────────────────────
  console.log('\nConectando a Zammad DB para resolver emails...');
  let emailToId = {};

  try {
    const client = await pool.connect();

    // Diagnóstico: ver qué formato tiene el login en Zammad
    const sample = await client.query(
      `SELECT id, login, email FROM users WHERE active = true LIMIT 3`
    );
    console.log('  Muestra de usuarios en Zammad:');
    sample.rows.forEach(r => console.log(`    id=${r.id} login="${r.login}" email="${r.email}"`));

    const placeholders = allEmails.map((_, i) => `$${i + 1}`).join(', ');
    const result = await client.query(
      `SELECT id, email FROM users WHERE LOWER(email) IN (${placeholders}) AND active = true`,
      allEmails
    );
    client.release();

    result.rows.forEach(row => { emailToId[row.email.toLowerCase()] = row.id; });
    console.log(`  Emails resueltos: ${result.rows.length}/${allEmails.length}`);

    const noMatch = allEmails.filter(e => !emailToId[e]);
    if (noMatch.length > 0) {
      console.log(`  Sin match en Zammad (${noMatch.length}): ${noMatch.slice(0, 5).join(', ')}${noMatch.length > 5 ? '...' : ''}`);
    }
  } catch (e) {
    console.error(`  Error DB: ${e.message}`);
    console.error('  Asegúrate de que la VPN esté activa y .env tenga las credenciales correctas.');
    process.exit(1);
  }

  // ── Agrupar por GERENCIA ───────────────────────────────────────────────────
  const byGerencia = {};
  const byArea     = {};

  for (const row of activos) {
    const email    = row['EMAIL ADDRESS'].trim().toLowerCase();
    const agentId  = emailToId[email];
    const gerencia = row['GERENCIA'].trim();
    const area     = row['AREA'].trim();

    if (!agentId) continue; // no está en Zammad como agente activo

    // Gerencia
    if (gerencia) {
      if (!byGerencia[gerencia]) byGerencia[gerencia] = new Set();
      byGerencia[gerencia].add(agentId);
    }

    // Area
    if (area) {
      if (!byArea[area]) byArea[area] = new Set();
      byArea[area].add(agentId);
    }
  }

  // ── Construir items DynamoDB ───────────────────────────────────────────────
  const items = [];

  for (const [nombre, ids] of Object.entries(byGerencia)) {
    items.push({
      id:        `gerencia-${slugify(nombre)}`,
      name:      nombre,
      type:      'gerencia',
      agent_ids: [...ids],
      active:    true,
    });
  }

  for (const [nombre, ids] of Object.entries(byArea)) {
    items.push({
      id:        `area-${slugify(nombre)}`,
      name:      nombre,
      type:      'area',
      agent_ids: [...ids],
      active:    true,
    });
  }

  console.log(`\nEquipos a cargar: ${items.length} (${Object.keys(byGerencia).length} gerencias + ${Object.keys(byArea).length} áreas)`);

  // ── Preview ────────────────────────────────────────────────────────────────
  console.log('\nResumen:');
  for (const item of items) {
    console.log(`  [${item.type.padEnd(8)}] ${item.id.padEnd(40)} → ${item.agent_ids.length} agentes`);
  }

  if (DRY_RUN) {
    console.log('\n-- DRY RUN: no se escribió nada en DynamoDB --');
    await pool.end();
    return;
  }

  // ── Insertar en DynamoDB ───────────────────────────────────────────────────
  console.log(`\nSubiendo a DynamoDB tabla: ${TEAMS_TABLE}`);
  let ok = 0;
  for (const item of items) {
    try {
      await dynamodb.put({ TableName: TEAMS_TABLE, Item: item }).promise();
      console.log(`  ✓ ${item.id}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${item.id} — ${e.message}`);
    }
  }

  console.log(`\n${ok}/${items.length} equipos cargados.`);
  await pool.end();
}

main().catch(e => {
  console.error('Error fatal:', e.message);
  process.exit(1);
});
