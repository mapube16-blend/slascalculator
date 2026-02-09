const { pool } = require('../config/database');

async function exploreCustomFields() {
  try {
    // Vista de reportes
    console.log('\n📊 ESTRUCTURA: vista_reportes_zammad\n');
    const vistaStructure = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'vista_reportes_zammad'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas disponibles:');
    vistaStructure.rows.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type})`);
    });

    // Ejemplo de vista
    console.log('\n\n📋 EJEMPLO DE VISTA:\n');
    const exampleVista = await pool.query(`SELECT * FROM vista_reportes_zammad LIMIT 1`);
    if (exampleVista.rows.length > 0) {
      const row = exampleVista.rows[0];
      Object.keys(row).forEach(key => {
        console.log(`${key}: ${row[key]}`);
      });
    }

    // Tabla de contabilidad de tiempos
    console.log('\n\n⏱️ ESTRUCTURA: ticket_time_accountings\n');
    const timeAccounting = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'ticket_time_accountings'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas disponibles:');
    timeAccounting.rows.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type})`);
    });

    // Ejemplo de contabilidad
    console.log('\n\n📋 EJEMPLO DE CONTABILIDAD:\n');
    const exampleAccounting = await pool.query(`SELECT * FROM ticket_time_accountings LIMIT 1`);
    if (exampleAccounting.rows.length > 0) {
      const row = exampleAccounting.rows[0];
      Object.keys(row).forEach(key => {
        console.log(`${key}: ${row[key]}`);
      });
    }

    // Revisar historial para entender cambios de estado
    console.log('\n\n📝 MUESTRA DE HISTORIAL (10 registros):\n');
    const histories = await pool.query(`
      SELECT h.id, h.o_id, h.history_attribute_id, h.value_from, h.value_to, h.created_at
      FROM histories h
      JOIN tickets t ON t.id = h.o_id
      WHERE h.history_attribute_id = 13
      ORDER BY h.created_at DESC
      LIMIT 10
    `);
    
    console.log(`Total de cambios de estado encontrados: ${histories.rows.length}`);
    histories.rows.forEach(row => {
      console.log(`Ticket ${row.o_id}: ${row.value_from} → ${row.value_to} (${row.created_at})`);
    });

    // Ver usuarios que han actualizado tickets
    console.log('\n\n👥 USUARIOS QUE ACTUALIZAN TICKETS:\n');
    const updaters = await pool.query(`
      SELECT DISTINCT updated_by_id, firstname, lastname
      FROM tickets t
      JOIN users u ON u.id = t.updated_by_id
      LIMIT 20
    `);
    
    console.log('Usuarios que actualizan tickets:');
    updaters.rows.forEach(row => {
      console.log(`${row.updated_by_id}: ${row.firstname} ${row.lastname}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

exploreCustomFields();
