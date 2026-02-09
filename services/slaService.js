const { pool } = require('../config/database');
const moment = require('moment');
const workingHours = require('./workingHoursService');

class SLAService {
  
  // Obtener todos los tickets con información completa desde tabla tickets
  async getTicketsWithSLA(filters = {}) {
    const { startDate, endDate, organizationId, ownerId, state, ticketNumber, calendarType = 'laboral' } = filters;
    
    let query = `
      SELECT 
        t.id,
        t.number as ticket_number,
        t.title,
        t.type,
        t.organization_id,
        o.name as organization_name,
        o.bld_cliente_padre,
        t.owner_id,
        CONCAT(u.firstname, ' ', u.lastname) as owner_name,
        t.customer_id,
        CONCAT(c.firstname, ' ', c.lastname) as customer_name,
        t.state_id,
        ts.name as state_name,
        t.priority_id,
        tp.name as priority_name,
        t.created_at,
        t.updated_at,
        t.close_at,
        t.created_by_id,
        t.updated_by_id,
        t.bld_ticket_fase,
        t.bld_ticket_espera_motivo,
        t.bld_responsable,
        t.bld_prority_customer,
        t.bld_cliente,
        CONCAT(ub.firstname, ' ', ub.lastname) as created_by_name,
        CONCAT(uu.firstname, ' ', uu.lastname) as updated_by_name
      FROM tickets t
      LEFT JOIN organizations o ON t.organization_id = o.id
      LEFT JOIN users u ON t.owner_id = u.id
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users ub ON t.created_by_id = ub.id
      LEFT JOIN users uu ON t.updated_by_id = uu.id
      LEFT JOIN ticket_states ts ON t.state_id = ts.id
      LEFT JOIN ticket_priorities tp ON t.priority_id = tp.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (startDate) {
      query += ` AND t.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND t.created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    if (organizationId) {
      query += ` AND t.organization_id = $${paramCount}`;
      params.push(organizationId);
      paramCount++;
    }
    
    if (ownerId) {
      query += ` AND t.owner_id = $${paramCount}`;
      params.push(ownerId);
      paramCount++;
    }
    
    if (state) {
      query += ` AND ts.name = $${paramCount}`;
      params.push(state);
      paramCount++;
    }
    
    if (ticketNumber) {
      query += ` AND t.number = $${paramCount}`;
      params.push(ticketNumber);
      paramCount++;
    }
    
    query += ` ORDER BY t.created_at DESC`;
    
    try {
      const result = await pool.query(query, params);
      
      // Procesar cada ticket para calcular tiempos laborales correctamente
      const processedTickets = await Promise.all(
        result.rows.map(async (ticket) => {
          // Calcular Tiempo Hightech: excluir Espera, Resuelto, Cerrado
          const highTechMinutes = await this.calculateHighTechTime(ticket.id, ticket.created_at, ticket.close_at || new Date(), calendarType);
          
          // Calcular Tiempo Cliente: solo cuando está en "Espera"
          const clientMinutes = await this.calculateClientWaitingTime(ticket.id, calendarType);
          
          return {
            ...ticket,
            hightech_time_minutes: highTechMinutes,
            client_time_minutes: clientMinutes,
            hightech_time_formatted: workingHours.formatMinutes(highTechMinutes, calendarType),
            client_time_formatted: workingHours.formatMinutes(clientMinutes, calendarType),
            empresa: this.getEmpresaNombre(ticket.bld_cliente_padre)
          };
        })
      );
      
      return processedTickets;
    } catch (error) {
      console.error('Error en getTicketsWithSLA:', error);
      throw error;
    }
  }

  /**
   * Calcular Tiempo Hightech: suma de todos los períodos donde NO esté en Espera/Resuelto/Cerrado
   * @param {number} ticketId - ID del ticket
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @param {string} calendarType - Tipo de calendario ('laboral', '24-7', 'extended')
   */
  async calculateHighTechTime(ticketId, startDate, endDate, calendarType = 'laboral') {
    try {
      if (!startDate || !endDate) {
        return 0;
      }

      // Obtener todos los cambios de estado del ticket
      const histories = await pool.query(`
        SELECT 
          h.id,
          h.created_at,
          h.value_from,
          h.value_to
        FROM histories h
        WHERE h.o_id = $1
          AND h.history_attribute_id = 13
        ORDER BY h.created_at ASC
      `, [ticketId]);

      let totalHighTechMinutes = 0;
      const excludedStates = ['En Espera', 'Resuelto', 'Cerrado'];

      if (histories.rows.length === 0) {
        // Si no hay historial de cambios, el ticket nunca cambió de estado
        // Obtener estado del ticket para saber si contar tiempo
        const ticketResult = await pool.query(`
          SELECT ts.name as state_name
          FROM tickets t
          JOIN ticket_states ts ON t.state_id = ts.id
          WHERE t.id = $1
        `, [ticketId]);

        if (ticketResult.rows.length > 0) {
          const stateName = ticketResult.rows[0].state_name;
          // Si el estado actual no está excluido, contar todo el tiempo
          if (!excludedStates.includes(stateName)) {
            totalHighTechMinutes = workingHours.calculateWorkingMinutes(startDate, endDate, calendarType);
          }
        }
        return Math.round(totalHighTechMinutes);
      }

      // Si hay historial, procesar cada cambio de estado
      let currentPeriodStart = startDate;
      
      for (let i = 0; i < histories.rows.length; i++) {
        const change = histories.rows[i];
        
        // Contar tiempo del estado ANTERIOR a este cambio
        // Si el estado anterior no está excluido, sumamos el tiempo desde currentPeriodStart hasta el cambio
        if (!excludedStates.includes(change.value_from)) {
          const periodMinutes = workingHours.calculateWorkingMinutes(currentPeriodStart, change.created_at, calendarType);
          totalHighTechMinutes += periodMinutes;
        }
        
        // El siguiente período empieza cuando termina este cambio
        currentPeriodStart = change.created_at;
      }

      // Procesar el último período (desde el último cambio hasta el fin)
      const lastChange = histories.rows[histories.rows.length - 1];
      
      // Obtener estado actual del ticket
      const currentStateResult = await pool.query(`
        SELECT ts.name as state_name
        FROM tickets t
        JOIN ticket_states ts ON t.state_id = ts.id
        WHERE t.id = $1
      `, [ticketId]);

      if (currentStateResult.rows.length > 0) {
        const currentStateName = currentStateResult.rows[0].state_name;
        // Si el estado actual (que es el value_to del último cambio) no está excluido
        if (!excludedStates.includes(currentStateName)) {
          const periodMinutes = workingHours.calculateWorkingMinutes(currentPeriodStart, endDate, calendarType);
          totalHighTechMinutes += periodMinutes;
        }
      }

      return Math.round(totalHighTechMinutes);
    } catch (error) {
      console.error(`Error calculando Tiempo Hightech para ticket ${ticketId}:`, error);
      return 0;
    }
  }

  /**
   * Calcular Tiempo Cliente: suma de todos los períodos en estado "Espera"
   * @param {number} ticketId - ID del ticket
   * @param {string} calendarType - Tipo de calendario ('laboral', '24-7', 'extended')
   */
  async calculateClientWaitingTime(ticketId, calendarType = 'laboral') {
    try {
      const histories = await pool.query(`
        SELECT 
          h.created_at,
          h.value_from,
          h.value_to
        FROM histories h
        WHERE h.o_id = $1
          AND h.history_attribute_id = 13
        ORDER BY h.created_at ASC
      `, [ticketId]);

      let totalWaitingMinutes = 0;
      const waitStates = ['En Espera'];
      let waitingStart = null;

      // Procesar cada cambio de estado
      for (let i = 0; i < histories.rows.length; i++) {
        const change = histories.rows[i];

        // Si entra en estado de espera
        if (waitStates.includes(change.value_to) && !waitingStart) {
          waitingStart = change.created_at;
        }
        // Si sale del estado de espera
        else if (waitStates.includes(change.value_from) && change.value_to !== change.value_from) {
          if (waitingStart) {
            const minutes = workingHours.calculateWorkingMinutes(waitingStart, change.created_at, calendarType);
            totalWaitingMinutes += minutes;
            waitingStart = null;
          }
        }
      }

      // Si todavía está en espera, contar hasta ahora
      if (waitingStart) {
        const minutes = workingHours.calculateWorkingMinutes(waitingStart, new Date(), calendarType);
        totalWaitingMinutes += minutes;
      }

      return Math.round(totalWaitingMinutes);
    } catch (error) {
      console.error('Error calculando Tiempo Cliente:', error);
      return 0;
    }
  }

  /**
   * Obtener nombre de empresa desde bld_cliente_padre
   */
  getEmpresaNombre(bldClientePadre) {
    const empresas = {
      '1': 'Policía Nacional',
      '2': 'Universidad Nacional',
      '3': 'Coljuegos',
      '4': 'Alcaldía de Cali',
      '5': 'Banco Interamericano de Desarrollo',
      '6': 'Blend360',
      '7': 'BTG',
      '8': 'Cámara de Comercio de Cali',
      '9': 'Consejo Superior de la Judicatura',
      '10': 'DIAN',
      '11': 'Fiduagraria',
      '12': 'Financiera Desarrollo Nacional',
      '13': 'Fondo Adaptación',
      '14': 'ICFES',
      '15': 'Justicia Penal Militar y Policial',
      '16': 'Metro de Medellín',
      '17': 'MinTIC',
      '18': 'Sanidad',
      '19': 'Secretaría Distrital del Hábitat',
      '20': 'Superintendencia de Servicios',
      '21': 'Superintendencia de Sociedades',
      '22': 'Unidad Administrativa Especial de Catastro Distrital',
      '23': 'Universidad de Caldas',
      '24': 'Universidad del Bosque',
      '25': 'Instituto Geográfico Militar',
      '26': 'Progresión'
    };
    
    if (!bldClientePadre) return 'Otro';
    return empresas[bldClientePadre.toString()] || 'Otro';
  }

  // Obtener métricas agregadas de SLA
  async getSLAMetrics(filters = {}) {
    const tickets = await this.getTicketsWithSLA(filters);
    
    const metrics = {
      total_tickets: tickets.length,
      closed_tickets: tickets.filter(t => t.close_at).length,
      open_tickets: tickets.filter(t => !t.close_at).length,
      
      // Métricas de primera respuesta
      first_response: {
        total_with_sla: tickets.filter(t => t.first_response_escalation_at).length,
        met: tickets.filter(t => t.first_response_sla_met === true).length,
        breached: tickets.filter(t => t.first_response_sla_met === false).length,
        compliance_rate: 0,
        avg_time_minutes: 0
      },
      
      // Métricas de resolución
      resolution: {
        total_with_sla: tickets.filter(t => t.close_escalation_at).length,
        met: tickets.filter(t => t.resolution_sla_met === true).length,
        breached: tickets.filter(t => t.resolution_sla_met === false).length,
        compliance_rate: 0,
        avg_time_minutes: 0
      },
      
      // Métricas por agente
      by_agent: {},
      
      // Métricas por organización/proyecto
      by_organization: {}
    };
    
    // Calcular tasas de cumplimiento
    if (metrics.first_response.total_with_sla > 0) {
      metrics.first_response.compliance_rate = 
        (metrics.first_response.met / metrics.first_response.total_with_sla * 100).toFixed(2);
    }
    
    if (metrics.resolution.total_with_sla > 0) {
      metrics.resolution.compliance_rate = 
        (metrics.resolution.met / metrics.resolution.total_with_sla * 100).toFixed(2);
    }
    
    // Calcular tiempos promedio
    const firstResponseTimes = tickets
      .filter(t => t.first_response_time_minutes !== null)
      .map(t => t.first_response_time_minutes);
    
    if (firstResponseTimes.length > 0) {
      metrics.first_response.avg_time_minutes = 
        (firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length).toFixed(2);
    }
    
    const resolutionTimes = tickets
      .filter(t => t.resolution_time_minutes !== null)
      .map(t => t.resolution_time_minutes);
    
    if (resolutionTimes.length > 0) {
      metrics.resolution.avg_time_minutes = 
        (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(2);
    }
    
    // Agrupar por agente
    tickets.forEach(ticket => {
      if (ticket.owner_name) {
        if (!metrics.by_agent[ticket.owner_name]) {
          metrics.by_agent[ticket.owner_name] = {
            total: 0,
            closed: 0,
            first_response_met: 0,
            first_response_breached: 0,
            resolution_met: 0,
            resolution_breached: 0
          };
        }
        
        metrics.by_agent[ticket.owner_name].total++;
        if (ticket.close_at) metrics.by_agent[ticket.owner_name].closed++;
        if (ticket.first_response_sla_met === true) metrics.by_agent[ticket.owner_name].first_response_met++;
        if (ticket.first_response_sla_met === false) metrics.by_agent[ticket.owner_name].first_response_breached++;
        if (ticket.resolution_sla_met === true) metrics.by_agent[ticket.owner_name].resolution_met++;
        if (ticket.resolution_sla_met === false) metrics.by_agent[ticket.owner_name].resolution_breached++;
      }
    });
    
    // Agrupar por organización/proyecto
    tickets.forEach(ticket => {
      if (ticket.organization_name) {
        if (!metrics.by_organization[ticket.organization_name]) {
          metrics.by_organization[ticket.organization_name] = {
            total: 0,
            closed: 0,
            first_response_met: 0,
            first_response_breached: 0,
            resolution_met: 0,
            resolution_breached: 0
          };
        }
        
        metrics.by_organization[ticket.organization_name].total++;
        if (ticket.close_at) metrics.by_organization[ticket.organization_name].closed++;
        if (ticket.first_response_sla_met === true) metrics.by_organization[ticket.organization_name].first_response_met++;
        if (ticket.first_response_sla_met === false) metrics.by_organization[ticket.organization_name].first_response_breached++;
        if (ticket.resolution_sla_met === true) metrics.by_organization[ticket.organization_name].resolution_met++;
        if (ticket.resolution_sla_met === false) metrics.by_organization[ticket.organization_name].resolution_breached++;
      }
    });
    
    return metrics;
  }

  // Obtener lista de organizaciones/proyectos
  async getProjects() {
    try {
      const result = await pool.query(`
        SELECT DISTINCT o.id, o.name
        FROM organizations o
        INNER JOIN tickets t ON t.organization_id = o.id
        ORDER BY o.name
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name
      }));
    } catch (error) {
      console.error('Error en getProjects:', error);
      return [];
    }
  }

  // Obtener lista de agentes
  async getAgents() {
    try {
      // Obtener usuarios activos que han sido asignados como propietarios de tickets
      const result = await pool.query(`
        SELECT DISTINCT u.id, u.firstname, u.lastname, CONCAT(u.firstname, ' ', u.lastname) as name 
        FROM users u
        INNER JOIN tickets t ON u.id = t.owner_id
        WHERE u.active = true
        ORDER BY u.firstname, u.lastname
      `);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name
      }));
    } catch (error) {
      console.error('Error en getAgents:', error);
      return [];
    }
  }

  /**
   * Obtener historial detallado de estados de un ticket
   * Muestra cada cambio de estado con duración en minutos laborales
   * @param {string} ticketNumber - Número del ticket
   * @param {string} calendarType - Tipo de calendario ('laboral', '24-7', 'extended')
   */
  async getTicketHistoryDetail(ticketNumber, calendarType = 'laboral') {
    try {
      // Obtener datos del ticket
      const ticketResult = await pool.query(`
        SELECT 
          t.id,
          t.number,
          t.title,
          t.created_at,
          t.close_at,
          t.state_id,
          ts.name as current_state,
          o.name as organization_name,
          o.bld_cliente_padre,
          CONCAT(u.firstname, ' ', u.lastname) as owner_name
        FROM tickets t
        LEFT JOIN organizations o ON t.organization_id = o.id
        LEFT JOIN users u ON t.owner_id = u.id
        LEFT JOIN ticket_states ts ON t.state_id = ts.id
        WHERE t.number = $1::text
      `, [ticketNumber]);

      if (ticketResult.rows.length === 0) {
        return null;
      }

      const ticket = ticketResult.rows[0];

      // Obtener historial de cambios de estado (ordenado por fecha)
      const historiesResult = await pool.query(`
        SELECT 
          h.created_at,
          h.value_from,
          h.value_to
        FROM histories h
        WHERE h.o_id = $1
          AND h.history_attribute_id = 13
        ORDER BY h.created_at ASC
      `, [ticket.id]);

      const excludedStates = ['En Espera', 'Resuelto', 'Cerrado'];
      const waitStates = ['En Espera'];
      
      let stateHistory = [];
      let totalHighTechMinutes = 0;
      let totalClientMinutes = 0;

      const histories = historiesResult.rows;
      
      // Si no hay historial, todo el tiempo fue en un solo estado
      if (histories.length === 0) {
        const endTime = ticket.close_at || new Date();
        const duration = workingHours.calculateWorkingMinutes(ticket.created_at, endTime, calendarType);
        const isHighTech = !excludedStates.includes(ticket.current_state);
        const isWaiting = waitStates.includes(ticket.current_state);
        
        if (isHighTech) {
          totalHighTechMinutes += duration;
        }
        if (isWaiting) {
          totalClientMinutes += duration;
        }

        stateHistory.push({
          from: null,
          to: ticket.current_state,
          startTime: moment(ticket.created_at).format('YYYY-MM-DD HH:mm:ss'),
          endTime: moment(endTime).format('YYYY-MM-DD HH:mm:ss'),
          durationMinutes: duration,
          durationFormatted: workingHours.formatMinutes(duration, calendarType),
          type: isWaiting ? 'Cliente' : (isHighTech ? 'Empresa' : 'Excluido')
        });
      } else {
        // Procesar cada período de estado
        for (let i = 0; i < histories.length; i++) {
          const change = histories[i];
          const nextChange = histories[i + 1];
          
          // Periodo: desde change.created_at hasta el siguiente cambio (o fin)
          const periodStart = change.created_at;
          const periodEnd = nextChange ? nextChange.created_at : (ticket.close_at || new Date());
          
          // El estado durante este período es el que se cambió a: change.value_to
          const stateAtPeriod = change.value_to;
          const isHighTech = !excludedStates.includes(stateAtPeriod);
          const isWaiting = waitStates.includes(stateAtPeriod);
          
          const duration = workingHours.calculateWorkingMinutes(periodStart, periodEnd, calendarType);
          
          if (isHighTech) {
            totalHighTechMinutes += duration;
          }
          if (isWaiting) {
            totalClientMinutes += duration;
          }

          stateHistory.push({
            from: change.value_from,
            to: stateAtPeriod,
            startTime: moment(periodStart).format('YYYY-MM-DD HH:mm:ss'),
            endTime: moment(periodEnd).format('YYYY-MM-DD HH:mm:ss'),
            durationMinutes: duration,
            durationFormatted: workingHours.formatMinutes(duration, calendarType),
            type: isWaiting ? 'Cliente' : (isHighTech ? 'Empresa' : 'Excluido')
          });
        }
        
        // Si el ticket tiene un estado actual que no es el último del historial, agregar período final
        const lastChange = histories[histories.length - 1];
        if (lastChange.value_to !== ticket.current_state) {
          const endTime = ticket.close_at || new Date();
          const duration = workingHours.calculateWorkingMinutes(lastChange.created_at, endTime, calendarType);
          const isHighTech = !excludedStates.includes(ticket.current_state);
          const isWaiting = waitStates.includes(ticket.current_state);
          
          if (isHighTech) {
            totalHighTechMinutes += duration;
          }
          if (isWaiting) {
            totalClientMinutes += duration;
          }

          stateHistory.push({
            from: lastChange.value_to,
            to: ticket.current_state,
            startTime: moment(lastChange.created_at).format('YYYY-MM-DD HH:mm:ss'),
            endTime: moment(endTime).format('YYYY-MM-DD HH:mm:ss'),
            durationMinutes: duration,
            durationFormatted: workingHours.formatMinutes(duration, calendarType),
            type: isWaiting ? 'Cliente' : (isHighTech ? 'Empresa' : 'Excluido'),
            isCurrent: true
          });
        }
      }

      return {
        ticket: {
          number: ticket.number,
          title: ticket.title,
          created: moment(ticket.created_at).format('YYYY-MM-DD HH:mm:ss'),
          closed: ticket.close_at ? moment(ticket.close_at).format('YYYY-MM-DD HH:mm:ss') : 'Abierto',
          currentState: ticket.current_state,
          organization: ticket.organization_name,
          empresa: this.getEmpresaNombre(ticket.bld_cliente_padre),
          owner: ticket.owner_name
        },
        summary: {
          totalHighTechMinutes: Math.round(totalHighTechMinutes),
          totalHighTechFormatted: workingHours.formatMinutes(totalHighTechMinutes, calendarType),
          totalClientMinutes: Math.round(totalClientMinutes),
          totalClientFormatted: workingHours.formatMinutes(totalClientMinutes, calendarType),
          totalWorkingMinutes: Math.round(totalHighTechMinutes + totalClientMinutes),
          totalWorkingFormatted: workingHours.formatMinutes(totalHighTechMinutes + totalClientMinutes, calendarType)
        },
        history: stateHistory
      };
    } catch (error) {
      console.error('Error en getTicketHistoryDetail:', error);
      throw error;
    }
  }

  // Obtener todos los tickets con duraciones por estado (para tabla en métricas)
  async getTicketsWithStateDurations(filters = {}, calendarType = 'laboral') {
    const { startDate, endDate, organizationId, ownerId, state } = filters;
    
    // Primero obtener todos los tickets con los filtros aplicados
    const tickets = await this.getTicketsWithSLA(filters);
    
    if (tickets.length === 0) {
      return [];
    }

    const ticketIds = tickets.map(t => t.id);

    // Obtener todos los historiales de cambios para estos tickets en una sola query
    const historiesResult = await pool.query(`
      SELECT 
        h.o_id as ticket_id,
        h.created_at,
        h.value_from,
        h.value_to
      FROM histories h
      WHERE h.o_id = ANY($1::int[])
        AND h.history_attribute_id = 13
      ORDER BY h.o_id, h.created_at ASC
    `, [ticketIds]);

    const historiesByTicketId = {};
    historiesResult.rows.forEach(row => {
      if (!historiesByTicketId[row.ticket_id]) {
        historiesByTicketId[row.ticket_id] = [];
      }
      historiesByTicketId[row.ticket_id].push(row);
    });

    const excludedStates = ['Resuelto', 'Cerrado'];
    const waitStates = ['En Espera'];

    // Procesar cada ticket para obtener duraciones por estado
    const processedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const histories = historiesByTicketId[ticket.id] || [];
        const stateHistory = [];

        if (histories.length === 0) {
          // Sin historial, todo el tiempo fue en un solo estado
          const endTime = ticket.close_at || new Date();
          const duration = workingHours.calculateWorkingMinutes(ticket.created_at, endTime, calendarType);
          
          stateHistory.push({
            from: null,
            to: ticket.state_name,
            durationMinutes: duration,
            durationFormatted: workingHours.formatMinutes(duration, calendarType)
          });
        } else {
          // Procesar cada período de estado
          for (let i = 0; i < histories.length; i++) {
            const change = histories[i];
            const nextChange = histories[i + 1];
            
            const periodStart = change.created_at;
            const periodEnd = nextChange ? nextChange.created_at : (ticket.close_at || new Date());
            
            const stateAtPeriod = change.value_to;
            
            // Calcular duración
            let duration = 0;
            if (!excludedStates.includes(stateAtPeriod)) {
              // Para estados de trabajo (no esperando)
              duration = workingHours.calculateWorkingMinutes(periodStart, periodEnd, calendarType);
            } else if (waitStates.includes(stateAtPeriod)) {
              // Para estados de espera
              duration = workingHours.calculateWorkingMinutes(periodStart, periodEnd, calendarType);
            }
            // Si está en excluidos y no es espera, duration = 0
            
            stateHistory.push({
              from: change.value_from,
              to: stateAtPeriod,
              durationMinutes: duration,
              durationFormatted: workingHours.formatMinutes(duration, calendarType)
            });
          }
        }

        return {
          number: ticket.ticket_number,
          title: ticket.title,
          organization: ticket.organization_name,
          owner: ticket.owner_name,
          created_at: ticket.created_at,
          close_at: ticket.close_at,
          state_name: ticket.state_name,
          history: stateHistory
        };
      })
    );

    return processedTickets;
  }
}

module.exports = new SLAService();
