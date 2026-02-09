const { pool } = require('../config/database');

async function exploreDatabaseFull() {
  try {
    console.log('\n='.repeat(80));
    console.log('🔍 EXPLORACIÓN COMPLETA DE LA BASE DE DATOS');
    console.log('='.repeat(80));

    // 1. Obtener todas las tablas
    console.log('\n\n📦 TODAS LAS TABLAS:\n');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`Total de tablas: ${tables.rows.length}\n`);
    tables.rows.forEach((t, i) => {
      console.log(`${i + 1}. ${t.table_name}`);
    });

    // 2. Para cada tabla, obtener estructura
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 ESTRUCTURA DETALLADA DE CADA TABLA');
    console.log('='.repeat(80));

    for (const tableRow of tables.rows) {
      const tableName = tableRow.table_name;
      
      // Obtener columnas
      const columns = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      console.log(`\n\n📊 TABLA: ${tableName.toUpperCase()}`);
      console.log('-'.repeat(80));
      console.log(`Columnas: ${columns.rows.length}`);
      
      columns.rows.forEach((col, i) => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
        const defaultVal = col.column_default ? ` [default: ${col.column_default}]` : '';
        console.log(`  ${i + 1}. ${col.column_name} | ${col.data_type} | ${nullable}${defaultVal}`);
      });

      // Obtener foreign keys
      const fks = await pool.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
      `, [tableName]);

      if (fks.rows.length > 0) {
        console.log('\n  🔗 Foreign Keys:');
        fks.rows.forEach(fk => {
          console.log(`    - ${fk.column_name} → ${fk.referenced_table}(${fk.referenced_column})`);
        });
      }

      // Obtener índices
      const indexes = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1
      `, [tableName]);

      if (indexes.rows.length > 0) {
        console.log('\n  🔑 Índices:');
        indexes.rows.forEach(idx => {
          if (!idx.indexname.includes('pkey')) {
            console.log(`    - ${idx.indexname}`);
          }
        });
      }

      // Obtener cantidad de registros
      const count = await pool.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      console.log(`\n  📈 Registros: ${count.rows[0].cnt}`);

      // Obtener muestra de datos
      const sample = await pool.query(`SELECT * FROM "${tableName}" LIMIT 1`);
      if (sample.rows.length > 0) {
        console.log('\n  📝 Ejemplo de registro:');
        const record = sample.rows[0];
        Object.keys(record).forEach(key => {
          const value = record[key];
          const displayValue = value === null ? 'NULL' : 
                             typeof value === 'object' ? JSON.stringify(value).substring(0, 50) :
                             String(value).substring(0, 50);
          console.log(`    ${key}: ${displayValue}`);
        });
      }
    }

    // 3. Obtener relaciones (foreign keys) de forma global
    console.log('\n\n' + '='.repeat(80));
    console.log('🔗 RELACIONES (FOREIGN KEYS)');
    console.log('='.repeat(80) + '\n');

    const relations = await pool.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);

    relations.rows.forEach(rel => {
      console.log(`${rel.table_name}.${rel.column_name} → ${rel.referenced_table}.${rel.referenced_column}`);
    });

    // 4. Buscar campos de intéres específicos
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 BÚSQUEDA DE CAMPOS ESPECÍFICOS');
    console.log('='.repeat(80) + '\n');

    const patterns = ['modul', 'respons', 'custom', 'field', 'sla', 'time', 'group', 'tag'];
    
    for (const pattern of patterns) {
      const customFields = await pool.query(`
        SELECT column_name, table_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name ILIKE '%${pattern}%'
        ORDER BY table_name, column_name
      `);

      if (customFields.rows.length > 0) {
        console.log(`\n📌 Campos con patrón "${pattern}":`);
        customFields.rows.forEach(field => {
          console.log(`  - ${field.table_name}.${field.column_name} (${field.data_type})`);
        });
      }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ EXPLORACIÓN COMPLETADA');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

exploreDatabaseFull();
