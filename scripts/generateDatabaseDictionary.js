const { pool } = require('../config/database');

const keyTables = [
  'tickets',
  'organizations', 
  'users',
  'ticket_states',
  'ticket_priorities',
  'ticket_articles',
  'histories',
  'history_attributes',
  'groups',
  'slas',
  'ticket_time_accounting_types',
  'ticket_time_accountings',
  'tags',
  'tag_objects',
  'tag_items',
  'calendars',
  'object_manager_attributes',
  'ticket_article_senders',
  'ticket_article_types'
];

async function generateDatabaseDictionary() {
  try {
    console.log('Generando diccionario de base de datos...\n');
    let markdown = '# 📊 Diccionario de Base de Datos - Zammad\n\n';
    markdown += '**Última actualización:** ' + new Date().toISOString() + '\n\n';
    markdown += '**Total de tablas en la BD:** 124\n\n';
    markdown += '---\n\n';

    // Obtener todas las tablas
    const allTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    // Documentar tablas clave
    for (const table of keyTables) {
      if (!allTables.rows.find(r => r.table_name === table)) continue;

      const columns = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      const fks = await pool.query(`
        SELECT 
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
      `, [table]);

      const count = await pool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);

      markdown += `## ${table.toUpperCase()}\n\n`;
      markdown += `**Registros:** ${count.rows[0].cnt}\n\n`;
      markdown += '| Columna | Tipo | Nullable | Descripción |\n';
      markdown += '|---------|------|----------|-------------|\n';

      columns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'Sí' : 'No';
        markdown += `| ${col.column_name} | ${col.data_type} | ${nullable} | |\n`;
      });

      if (fks.rows.length > 0) {
        markdown += '\n**Foreign Keys:**\n';
        fks.rows.forEach(fk => {
          markdown += `- ${fk.column_name} → ${fk.referenced_table}(${fk.referenced_column})\n`;
        });
      }

      markdown += '\n---\n\n';
    }

    // Listar todas las tablas
    markdown += '## LISTA COMPLETA DE TODAS LAS TABLAS\n\n';
    markdown += `Total: ${allTables.rows.length} tablas\n\n`;
    allTables.rows.forEach((t, i) => {
      markdown += `${i + 1}. ${t.table_name}\n`;
    });

    console.log(markdown);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

generateDatabaseDictionary();
