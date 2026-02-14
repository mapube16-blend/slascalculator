const slaService = require('./services/slaService');
const moment = require('moment');

async function testHighTechNow() {
  try {
    console.log('\n🧪 TEST ESPECÍFICO DE TIEMPO HIGHTECH\n');

    // Buscar el mismo ticket del diagnóstico
    const { pool } = require('./config/database');
    const ticketResult = await pool.query(`
      SELECT id, number, title, created_at, close_at, state_id
      FROM tickets
      WHERE number = $1::text
      LIMIT 1
    `, ['20502']);

    if (ticketResult.rows.length === 0) {
      console.log('Ticket #20502 no encontrado');
      process.exit(1);
    }

    const ticket = ticketResult.rows[0];
    console.log(`Ticket encontrado: #${ticket.number}`);
    console.log(`Creado: ${moment(ticket.created_at).format('DD/MM/YYYY HH:mm')}`);
    console.log(`Cerrado: ${ticket.close_at ? moment(ticket.close_at).format('DD/MM/YYYY HH:mm') : 'NO'}\n`);

    // Llamar la función async directamente
    console.log('Calculando Tiempo Hightech usando calculateHighTechTime()...');
    const startTime = Date.now();
    const highTechMinutes = await slaService.calculateHighTechTime(
      ticket.id,
      ticket.created_at,
      ticket.close_at || new Date()
    );
    const elapsed = Date.now() - startTime;

    console.log(`✓ Tiempo Hightech: ${highTechMinutes} minutos`);
    console.log(`✓ Formateado: ${require('./services/workingHoursService').formatMinutes(highTechMinutes)}`);
    console.log(`✓ Tiempo de cálculo: ${elapsed}ms\n`);

    // Ahora probar a través de getTicketsWithSLA
    console.log('Probando con getTicketsWithSLA()...\n');
    const filters = {
      startDate: moment('2025-12-01').toDate(),
      endDate: moment('2026-01-10').toDate()
    };

    const tickets = await slaService.getTicketsWithSLA(filters);
    const foundTicket = tickets.find(t => t.ticket_number === 20502);

    if (foundTicket) {
      console.log(`Ticket encontrado en getTicketsWithSLA:`);
      console.log(`  Número: #${foundTicket.ticket_number}`);
      console.log(`  Tiempo Hightech (minutos): ${foundTicket.hightech_time_minutes}`);
      console.log(`  Tiempo Hightech (formateado): "${foundTicket.hightech_time_formatted}"`);
      console.log(`  Tiempo Cliente (minutos): ${foundTicket.client_time_minutes}`);
      console.log(`  Tiempo Cliente (formateado): "${foundTicket.client_time_formatted}"`);
    } else {
      console.log('❌ Ticket #20502 NO encontrado en getTicketsWithSLA');
      console.log(`Filtros: ${moment(filters.startDate).format('DD/MM/YYYY')} - ${moment(filters.endDate).format('DD/MM/YYYY')}`);
      console.log(`Total tickets encontrados: ${tickets.length}`);
    }

    console.log('\n✅ Test completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testHighTechNow();
