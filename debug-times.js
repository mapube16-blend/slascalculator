const { pool } = require('./config/database');
const moment = require('moment');
const workingHours = require('./services/workingHoursService');

async function debugTimesCalculation() {
  try {
    console.log('\n📊 DIAGNÓSTICO DE CÁLCULO DE TIEMPOS\n');

    // 1. Obtener un ticket de prueba
    console.log('1️⃣ Buscando un ticket de prueba...');
    const ticketResult = await pool.query(`
      SELECT t.id, t.number, t.title, t.created_at, t.close_at, 
             ts.name as state_name, t.state_id
      FROM tickets t
      LEFT JOIN ticket_states ts ON t.state_id = ts.id
      LIMIT 1
    `);

    if (ticketResult.rows.length === 0) {
      console.log('❌ No hay tickets en la base de datos');
      process.exit(1);
    }

    const ticket = ticketResult.rows[0];
    console.log(`✓ Ticket encontrado: #${ticket.number} - "${ticket.title}"`);
    console.log(`  ID: ${ticket.id}`);
    console.log(`  Estado: ${ticket.state_name}`);
    console.log(`  Creado: ${moment(ticket.created_at).format('DD/MM/YYYY HH:mm')}`);
    console.log(`  Cerrado: ${ticket.close_at ? moment(ticket.close_at).format('DD/MM/YYYY HH:mm') : 'NO'}\n`);

    // 2. Obtener el historial de cambios de estado
    console.log('2️⃣ Buscando historial de cambios de estado...');
    const historiesResult = await pool.query(`
      SELECT 
        h.id,
        h.created_at,
        h.value_from,
        h.value_to,
        h.history_attribute_id
      FROM histories h
      WHERE h.o_id = $1
        AND h.history_attribute_id = 13
      ORDER BY h.created_at ASC
    `, [ticket.id]);

    console.log(`✓ Se encontraron ${historiesResult.rows.length} cambios de estado:\n`);
    historiesResult.rows.forEach((change, index) => {
      console.log(`  ${index + 1}. ${moment(change.created_at).format('DD/MM/YYYY HH:mm')}`);
      console.log(`     ${change.value_from} → ${change.value_to}`);
    });
    console.log();

    // 3. Calcular Tiempo Hightech manualmente
    console.log('3️⃣ Calculando Tiempo Hightech (excluyendo Espera, Resuelto, Cerrado)...\n');
    
    const excludedStates = ['Espera', 'En Espera', 'Resuelto', 'Cerrado'];
    let totalHighTechMinutes = 0;
    let currentStateStart = ticket.created_at;
    const endDate = ticket.close_at || new Date();

    historiesResult.rows.forEach((change, index) => {
      const stateEnd = change.created_at;
      const isExcluded = excludedStates.includes(change.value_from);
      
      if (!isExcluded) {
        const minutes = workingHours.calculateWorkingMinutes(currentStateStart, stateEnd);
        totalHighTechMinutes += minutes;
        console.log(`  Período ${index + 1}: ${moment(currentStateStart).format('DD/MM HH:mm')} → ${moment(stateEnd).format('DD/MM HH:mm')}`);
        console.log(`    Estado: ${change.value_from} (INCLUIDO - ${minutes} minutos laborales)`);
      } else {
        console.log(`  Período ${index + 1}: ${moment(currentStateStart).format('DD/MM HH:mm')} → ${moment(stateEnd).format('DD/MM HH:mm')}`);
        console.log(`    Estado: ${change.value_from} (EXCLUIDO)`);
      }

      currentStateStart = stateEnd;
    });

    // Sumar tiempo final
    const currentStateResult = await pool.query(`
      SELECT ts.name as state_name
      FROM tickets t
      JOIN ticket_states ts ON t.state_id = ts.id
      WHERE t.id = $1
    `, [ticket.id]);

    if (currentStateResult.rows.length > 0) {
      const finalState = currentStateResult.rows[0].state_name;
      const isExcluded = excludedStates.includes(finalState);
      
      if (!isExcluded) {
        const minutes = workingHours.calculateWorkingMinutes(currentStateStart, endDate);
        totalHighTechMinutes += minutes;
        console.log(`  Período Final: ${moment(currentStateStart).format('DD/MM HH:mm')} → ${moment(endDate).format('DD/MM HH:mm')}`);
        console.log(`    Estado: ${finalState} (INCLUIDO - ${minutes} minutos laborales)`);
      } else {
        console.log(`  Período Final: ${moment(currentStateStart).format('DD/MM HH:mm')} → ${moment(endDate).format('DD/MM HH:mm')}`);
        console.log(`    Estado: ${finalState} (EXCLUIDO)`);
      }
    }

    console.log(`\n  ✓ TOTAL TIEMPO HIGHTECH: ${totalHighTechMinutes} minutos`);
    console.log(`  ✓ FORMATEADO: ${workingHours.formatMinutes(totalHighTechMinutes)}\n`);

    // 4. Calcular Tiempo Cliente
    console.log('4️⃣ Calculando Tiempo Cliente (solo estados Espera/En Espera)...\n');
    
    const waitStates = ['Espera', 'En Espera'];
    let totalWaitingMinutes = 0;
    let waitingStart = null;

    historiesResult.rows.forEach((change, index) => {
      if (waitStates.includes(change.value_to) && !waitingStart) {
        waitingStart = change.created_at;
        console.log(`  ${moment(change.created_at).format('DD/MM/YYYY HH:mm')} - ⏸️ ENTRA en espera`);
      } 
      else if (waitStates.includes(change.value_from) && change.value_to !== change.value_from && waitingStart) {
        const minutes = workingHours.calculateWorkingMinutes(waitingStart, change.created_at);
        totalWaitingMinutes += minutes;
        console.log(`  ${moment(change.created_at).format('DD/MM/YYYY HH:mm')} - ▶️ SALE de espera (${minutes} minutos laborales)`);
        waitingStart = null;
      }
    });

    // Si todavía está en espera
    if (waitingStart) {
      const minutes = workingHours.calculateWorkingMinutes(waitingStart, new Date());
      totalWaitingMinutes += minutes;
      console.log(`  ⏳ SIGUE en espera desde ${moment(waitingStart).format('DD/MM HH:mm')} (${minutes} minutos laborales hasta ahora)`);
    }

    console.log(`\n  ✓ TOTAL TIEMPO CLIENTE: ${totalWaitingMinutes} minutos`);
    console.log(`  ✓ FORMATEADO: ${workingHours.formatMinutes(totalWaitingMinutes)}\n`);

    // 5. Verificar función formatMinutes
    console.log('5️⃣ Verificando función formatMinutes...\n');
    const testMinutes = [45, 120, 480, 930, 5400, 10800, 57600];
    testMinutes.forEach(mins => {
      console.log(`  ${mins} minutos → ${workingHours.formatMinutes(mins)}`);
    });

    console.log('\n✅ Diagnóstico completado\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    process.exit(1);
  }
}

debugTimesCalculation();
