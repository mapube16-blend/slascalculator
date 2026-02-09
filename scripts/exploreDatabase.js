const { pool } = require('../config/database');

async function exploreDatabase() {
  try {
    // Obtener estructura de la tabla tickets
    console.log('\n📋 ESTRUCTURA DE TABLA: tickets\n');
    const ticketsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tickets'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas de tickets:');
    ticketsStructure.rows.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '(nullable)' : '(NO NULL)'}`);
    });
    
    // Obtener un ejemplo de ticket
    console.log('\n\n📊 EJEMPLO DE TICKET:\n');
    const exampleTicket = await pool.query(`SELECT * FROM tickets LIMIT 1`);
    if (exampleTicket.rows.length > 0) {
      const ticket = exampleTicket.rows[0];
      Object.keys(ticket).forEach(key => {
        console.log(`${key}: ${ticket[key]}`);
      });
    }
    
    // Verificar tablas relacionadas
    console.log('\n\n📦 TABLAS RELACIONADAS:\n');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tablas disponibles:');
    tables.rows.forEach(t => {
      console.log(`- ${t.table_name}`);
    });

    // Buscar columnas de "responsable" o "module"
    console.log('\n\n🔍 BUSCANDO CAMPOS ESPECÍFICOS:\n');
    const customFields = await pool.query(`
      SELECT column_name, table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND (
        column_name LIKE '%modul%'
        OR column_name LIKE '%categor%'
        OR column_name LIKE '%resp%'
        OR column_name LIKE '%tech%'
        OR column_name LIKE '%func%'
        OR column_name LIKE '%bld_%'
      )
      ORDER BY table_name
    `);
    
    console.log('Campos personalizados encontrados:');
    customFields.rows.forEach(col => {
      console.log(`${col.table_name}.${col.column_name}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

exploreDatabase();
