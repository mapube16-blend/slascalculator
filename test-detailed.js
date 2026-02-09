const slaService = require('./services/slaService');
const { pool } = require('./config/database');
const moment = require('moment');

async function testGetTicketsDetailed() {
  try {
    console.log('\n🧪 TEST DETALLADO DE getTicketsWithSLA\n');

    // Obtener el ticket #20502 directamente de la BD
    const ticketRow = await pool.query(`
      SELECT 
        t.id,
        t.number as ticket_number,
        t.title,
        t.type,
        t.organization_id,
        t.owner_id,
        t.customer_id,
        t.state_id,
        t.priority_id,
        t.created_at,
        t.updated_at,
        t.close_at,
        t.bld_ticket_fase,
        t.bld_responsable,
        o.name as organization_name,
        o.bld_cliente_padre,
        ts.name as state_name,
        tp.name as priority_name
      FROM tickets t
      LEFT JOIN organizations o ON t.organization_id = o.id
      LEFT JOIN ticket_states ts ON t.state_id = ts.id
      LEFT JOIN ticket_priorities tp ON t.priority_id = tp.id
      WHERE t.number = $1::text
    `, ['20502']);

    if (ticketRow.rows.length === 0) {
      console.log('Ticket no encontrado');
      process.exit(1);
    }

    const ticket = ticketRow.rows[0];
    console.log(`Ticket encontrado: #${ticket.ticket_number} - "${ticket.title}"`);
    console.log(`Estado: ${ticket.state_name}`);
    console.log(`Creado: ${moment(ticket.created_at).format('DD/MM/YYYY HH:mm')}`);
    console.log(`Cerrado: ${ticket.close_at ? moment(ticket.close_at).format('DD/MM/YYYY HH:mm') : 'Sin cerrar'}\n`);

    // Simular lo que getTicketsWithSLA hace
    console.log('Calculando Tiempo Hightech (como lo haría getTicketsWithSLA)...\n');
    
    const startTime = Date.now();
    const highTechMinutes = await slaService.calculateHighTechTime(
      ticket.id,
      ticket.created_at,
      ticket.close_at || new Date()
    );
    const clientMinutes = await slaService.calculateClientWaitingTime(ticket.id);
    const elapsed = Date.now() - startTime;

    console.log(`✓ Tiempo Hightech: ${highTechMinutes} minutos → "${require('./services/workingHoursService').formatMinutes(highTechMinutes)}"`);
    console.log(`✓ Tiempo Cliente: ${clientMinutes} minutos → "${require('./services/workingHoursService').formatMinutes(clientMinutes)}"`);
    console.log(`✓ Tiempo de cálculo: ${elapsed}ms\n`);

    // Ahora simular cómo se procesaría en getTicketsWithSLA
    console.log('Simulando objeto de salida de getTicketsWithSLA:\n');
    const workingHours = require('./services/workingHoursService');
    const processedTicket = {
      ...ticket,
      hightech_time_minutes: highTechMinutes,
      client_time_minutes: clientMinutes,
      hightech_time_formatted: workingHours.formatMinutes(highTechMinutes),
      client_time_formatted: workingHours.formatMinutes(clientMinutes),
      empresa: slaService.getEmpresaNombre(ticket.bld_cliente_padre)
    };

    console.log(`{
      ticket_number: ${processedTicket.ticket_number},
      title: "${processedTicket.title}",
      state_name: "${processedTicket.state_name}",
      hightech_time_minutes: ${processedTicket.hightech_time_minutes},
      hightech_time_formatted: "${processedTicket.hightech_time_formatted}",
      client_time_minutes: ${processedTicket.client_time_minutes},
      client_time_formatted: "${processedTicket.client_time_formatted}",
      empresa: "${processedTicket.empresa}"
    }`);

    console.log('\n✅ Test completado');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testGetTicketsDetailed();
