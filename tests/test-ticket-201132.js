const { pool } = require('./config/database');

(async () => {
  try {
    // Obtener todos los estados
    const statesResult = await pool.query('SELECT DISTINCT id, name FROM ticket_states ORDER BY name');
    
    console.log('\n=== ESTADOS EN BD ===');
    statesResult.rows.forEach(row => {
      console.log(`'${row.name}'`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
