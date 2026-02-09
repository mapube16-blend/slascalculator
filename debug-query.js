const { pool } = require('./config/database');
const moment = require('moment');

async function debugQuery() {
  try {
    console.log('\n🔍 DEBUG DE QUERY EN getTicketsWithSLA\n');

    // Verificar si el ticket está en la BD
    const allTickets = await pool.query(`
      SELECT id, number, title, created_at
      FROM tickets
      WHERE number = $1::text
    `, ['20502']);

    console.log(`Total de tickets con número 20502: ${allTickets.rows.length}`);
    if (allTickets.rows.length > 0) {
      const t = allTickets.rows[0];
      console.log(`ID: ${t.id}, Número: ${t.number}, Creado: ${moment(t.created_at).format('DD/MM/YYYY HH:mm')}`);
    }

    // Simular la query de getTicketsWithSLA con filtros
    const filters = {
      startDate: moment('2025-12-01').toDate(),
      endDate: moment('2026-01-10').toDate(),
      organizationId: null,
      ownerId: null,
      state: null
    };

    console.log(`\nFiltros:`);
    console.log(`  Start: ${moment(filters.startDate).format('DD/MM/YYYY')}`);
    console.log(`  End: ${moment(filters.endDate).format('DD/MM/YYYY')}`);

    let query = `
      SELECT 
        t.id,
        t.number as ticket_number,
        t.title,
        t.created_at,
        ts.name as state_name,
        t.state_id
      FROM tickets t
      LEFT JOIN ticket_states ts ON t.state_id = ts.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (filters.startDate) {
      query += ` AND t.created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
      console.log(`  Agregando: created_at >= ${moment(filters.startDate).format('DD/MM/YYYY HH:mm')}`);
    }

    if (filters.endDate) {
      query += ` AND t.created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
      console.log(`  Agregando: created_at <= ${moment(filters.endDate).format('DD/MM/YYYY HH:mm')}`);
    }

    query += ` ORDER BY t.created_at DESC LIMIT 5`;

    console.log('\nBuscando tickets con esta query...\n');
    const result = await pool.query(query, params);

    console.log(`Total de tickets encontrados: ${result.rows.length}\n`);
    result.rows.forEach((t, i) => {
      console.log(`${i+1}. #${t.ticket_number} - ${moment(t.created_at).format('DD/MM/YYYY HH:mm')} - "${t.title}"`);
    });

    // Verificar si #20502 está en los últimos 511
    console.log('\nBuscando en todos los tickets del rango...');
    const allInRange = await pool.query(query.replace('LIMIT 5', ''), params);
    const found = allInRange.rows.find(t => t.ticket_number === '20502');
    
    if (found) {
      console.log(`✓ Ticket #20502 ENCONTRADO en getTicketsWithSLA`);
      console.log(`  Creado: ${moment(found.created_at).format('DD/MM/YYYY HH:mm')}`);
    } else {
      console.log(`❌ Ticket #20502 NO ENCONTRADO`);
      console.log(`Total en rango: ${allInRange.rows.length}`);
      
      // Buscar tickets creados en 17/12/2025
      const dateSpecific = await pool.query(`
        SELECT id, number, title, created_at, state_id
        FROM tickets
        WHERE created_at::date = '2025-12-17'
        ORDER BY created_at
      `);
      console.log(`\nTickets creados el 17/12/2025: ${dateSpecific.rows.length}`);
      dateSpecific.rows.slice(0, 5).forEach(t => {
        console.log(`  #${t.number} - ${moment(t.created_at).format('DD/MM/YYYY HH:mm')}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugQuery();
