const { Pool } = require('pg');

const pool = new Pool({
  host: 'bld-prod-aihelpdesk-database-2.cbm5sq1kjl57.us-east-1.rds.amazonaws.com',
  port: 5432,
  user: 'cloud',
  password: 'Cloud6398@$',
  database: 'postgres'
});

pool.query('SELECT id, name, active FROM ticket_states ORDER BY id', (err, res) => {
  if (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }

  console.log('\n========== TICKET_STATES ==========');
  if (res.rows.length === 0) {
    console.log('⚠️  LA TABLA ESTÁ VACÍA - Usando fallback en el código');
  } else {
    console.log(`✅ Se encontraron ${res.rows.length} estados:`);
    res.rows.forEach(row => {
      const active = row.active ? '✓' : '✗';
      console.log(`  [${active}] ID: ${row.id.toString().padStart(3)} | "${row.name}"`);
    });
  }
  console.log('====================================\n');
  
  pool.end();
});
