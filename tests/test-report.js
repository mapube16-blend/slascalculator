const slaService = require('./services/slaService');
const excelService = require('./services/excelService');
const moment = require('moment');

async function testReportGeneration() {
  try {
    console.log('\n🧪 TEST DE GENERACIÓN DE REPORTE\n');

    // Simular filtros como vendrían desde el frontend
    const filters = {
      startDate: moment().subtract(30, 'days').toDate(),
      endDate: moment().toDate(),
      organizationId: null,
      ownerId: null,
      state: null
    };

    console.log('📋 Filtros aplicados:');
    console.log(`  - Fecha inicio: ${moment(filters.startDate).format('DD/MM/YYYY')}`);
    console.log(`  - Fecha fin: ${moment(filters.endDate).format('DD/MM/YYYY')}`);
    console.log(`  - Organización: ${filters.organizationId || 'TODAS'}`);
    console.log(`  - Agente: ${filters.ownerId || 'TODOS'}`);
    console.log(`  - Estado: ${filters.state || 'TODOS'}\n`);

    // 1. Obtener tickets con SLA
    console.log('1️⃣ Obteniendo tickets con cálculo de tiempos...');
    console.time('Tiempo de ejecución');
    const tickets = await slaService.getTicketsWithSLA(filters);
    console.timeEnd('Tiempo de ejecución');
    
    console.log(`✓ Se obtuvieron ${tickets.length} tickets\n`);

    // 2. Mostrar detalles de algunos tickets
    console.log('2️⃣ Primeros 5 tickets con sus tiempos:\n');
    tickets.slice(0, 5).forEach((ticket, index) => {
      console.log(`  Ticket ${index + 1}: #${ticket.ticket_number} - "${ticket.title}"`);
      console.log(`    Estado: ${ticket.state_name}`);
      console.log(`    Tiempo Hightech (minutos): ${ticket.hightech_time_minutes}`);
      console.log(`    Tiempo Hightech (formateado): "${ticket.hightech_time_formatted}"`);
      console.log(`    Tiempo Cliente (minutos): ${ticket.client_time_minutes}`);
      console.log(`    Tiempo Cliente (formateado): "${ticket.client_time_formatted}"`);
      console.log();
    });

    // 3. Verificar que los tiempos existan
    console.log('3️⃣ Validación de datos:\n');
    const ticketsWithHightech = tickets.filter(t => t.hightech_time_minutes > 0);
    const ticketsWithClient = tickets.filter(t => t.client_time_minutes > 0);
    const ticketsWithFormatted = tickets.filter(t => t.hightech_time_formatted && t.hightech_time_formatted !== '0m');

    console.log(`  ✓ Tickets con Tiempo Hightech > 0: ${ticketsWithHightech.length}/${tickets.length}`);
    console.log(`  ✓ Tickets con Tiempo Cliente > 0: ${ticketsWithClient.length}/${tickets.length}`);
    console.log(`  ✓ Tickets con formato Hightech: ${ticketsWithFormatted.length}/${tickets.length}\n`);

    // 4. Obtener métricas
    console.log('4️⃣ Obteniendo métricas...');
    const metrics = await slaService.getSLAMetrics(filters);
    console.log('✓ Métricas obtenidas\n');

    // 5. Generar reporte Excel
    console.log('5️⃣ Generando reporte Excel...');
    const workbook = await excelService.generateSLAReport(tickets, metrics, filters);
    
    // Ver lo que se escribió en la hoja de tickets
    const ticketsSheet = workbook.getWorksheet('Detalle de Tickets');
    if (ticketsSheet) {
      console.log('✓ Hoja de Tickets creada');
      console.log(`  - Filas: ${ticketsSheet.actualRowCount}`);
      console.log(`  - Columnas: ${ticketsSheet.actualColumnCount}`);
      
      // Mostrar encabezados
      console.log('\n  Encabezados de la hoja:');
      const headerRow = ticketsSheet.getRow(1);
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        console.log(`    ${colNumber}. ${cell.value}`);
      });

      // Mostrar datos de primer ticket
      console.log('\n  Datos del primer ticket en Excel:');
      const firstDataRow = ticketsSheet.getRow(2);
      const headers = ['Número', 'Creado en', 'Tipo', 'Estado', 'Empresa', 'Proyecto', 
                       'Título', 'Prioridad', 'Solicitante', 'Asignado a', 'Modif.', 'Fase', 
                       'Responsable', 'Tiempo Hightech', 'Tiempo Cliente'];
      
      firstDataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const headerName = headers[colNumber - 1] || `Col ${colNumber}`;
        console.log(`    ${headerName}: ${cell.value}`);
      });
    }

    console.log('\n✅ Test completado\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en test:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testReportGeneration();
