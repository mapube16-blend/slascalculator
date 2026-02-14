const slaService = require('./services/slaService');
const moment = require('moment');

async function testGetTicketsWithSLA() {
  try {
    console.log('\n🧪 TEST DE getTicketsWithSLA() CON FILTRO ESPECÍFICO\n');

    const filters = {
      startDate: moment('2025-12-15').toDate(),
      endDate: moment('2026-01-10').toDate(),
      organizationId: null,
      ownerId: null,
      state: null
    };

    console.log('Filtros:');
    console.log(`  Fecha: ${moment(filters.startDate).format('DD/MM/YYYY')} - ${moment(filters.endDate).format('DD/MM/YYYY')}`);

    console.log('\nLlamando a getTicketsWithSLA()...\n');
    const tickets = await slaService.getTicketsWithSLA(filters);

    console.log(`Total de tickets: ${tickets.length}`);

    // Buscar el ticket #20502
    const ticket20502 = tickets.find(t => t.ticket_number === 20502);

    if (ticket20502) {
      console.log('\n✓ TICKET #20502 ENCONTRADO:\n');
      console.log(`  Número: #${ticket20502.ticket_number}`);
      console.log(`  Título: "${ticket20502.title}"`);
      console.log(`  Estado: ${ticket20502.state_name}`);
      console.log(`  Creado: ${moment(ticket20502.created_at).format('DD/MM/YYYY HH:mm')}`);
      console.log(`  Cerrado: ${ticket20502.close_at ? moment(ticket20502.close_at).format('DD/MM/YYYY HH:mm') : 'Sin cerrar'}`);
      console.log(`\n  TIEMPOS:`);
      console.log(`  Tiempo Hightech (minutos): ${ticket20502.hightech_time_minutes}`);
      console.log(`  Tiempo Hightech (formateado): "${ticket20502.hightech_time_formatted}"`);
      console.log(`  Tiempo Cliente (minutos): ${ticket20502.client_time_minutes}`);
      console.log(`  Tiempo Cliente (formateado): "${ticket20502.client_time_formatted}"`);
      console.log(`  Empresa: "${ticket20502.empresa}"`);
      
      if (ticket20502.hightech_time_minutes === 0) {
        console.log('\n⚠️  PROBLEMA: Tiempo Hightech es 0');
      } else {
        console.log('\n✅ EXCELENTE: Tiempo Hightech tiene valor');
      }
    } else {
      console.log('\n❌ TICKET #20502 NO ENCONTRADO');
      console.log('\nPrimeros 10 tickets:');
      tickets.slice(0, 10).forEach((t, i) => {
        console.log(`  ${i+1}. #${t.ticket_number} - ${moment(t.created_at).format('DD/MM/YYYY HH:mm')} - Hightech: ${t.hightech_time_minutes}m`);
      });
    }

    // Mostrar estadísticas
    console.log('\n📊 ESTADÍSTICAS DE TIEMPOS:');
    const withHightech = tickets.filter(t => t.hightech_time_minutes > 0);
    const withClient = tickets.filter(t => t.client_time_minutes > 0);
    console.log(`  Tickets con Tiempo Hightech > 0: ${withHightech.length}/${tickets.length}`);
    console.log(`  Tickets con Tiempo Cliente > 0: ${withClient.length}/${tickets.length}`);

    if (withHightech.length > 0) {
      const avgHightech = Math.round(withHightech.reduce((sum, t) => sum + t.hightech_time_minutes, 0) / withHightech.length);
      console.log(`  Tiempo Hightech promedio: ${require('./services/workingHoursService').formatMinutes(avgHightech)}`);
    }

    console.log('\n✅ Test completado');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testGetTicketsWithSLA();
