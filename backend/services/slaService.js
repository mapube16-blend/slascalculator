const { pool } = require('../config/database');
const moment = require('moment');
const workingHours = require('./workingHoursService');
const logger = require('../utils/logger');
const { DATABASE, STATE_GROUPS, EMPRESA_NAMES } = require('../config/constants');
const dynamoService = require('./dynamoService');

// Cache TTL para getTicketsWithSLA (5 minutos)
const _cache = new Map();
const _inflight = new Map(); // Deduplicación de requests simultáneos
const CACHE_TTL_MS = 5 * 60 * 1000;

function _cacheKey(filters) {
  return JSON.stringify(Object.keys(filters).sort().reduce((acc, k) => {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') acc[k] = filters[k];
    return acc;
  }, {}));
}

function _cacheGet(filters) {
  const key = _cacheKey(filters);
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function _cacheSet(filters, data) {
  _cache.set(_cacheKey(filters), { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Si ya hay una request con los mismos filtros en vuelo, reutilizar su Promise
function _getOrCompute(filters, computeFn) {
  const cached = _cacheGet(filters);
  if (cached) return Promise.resolve(cached);

  const key = _cacheKey(filters);
  if (_inflight.has(key)) return _inflight.get(key);

  const promise = computeFn()
    .then(data => { _cacheSet(filters, data); _inflight.delete(key); return data; })
    .catch(err => { _inflight.delete(key); throw err; });

  _inflight.set(key, promise);
  return promise;
}

// Alias local para legibilidad — definido en constants.js (DATABASE.DB_UTC_OFFSET)
const DB_UTC_OFFSET = DATABASE.DB_UTC_OFFSET;

// CONFIGURACIÓN DE SLAs (Reglas de Negocio)
// Tiempos en HORAS laborales (se convierten a minutos en getSLATargets)
const SLA_CONFIG = {
  // Tiempos para Incidentes
  'incidente': {
    // 1. Crítico (Inferior a 1 hora / 28 horas)
    '1': { firstResponse: 1, resolution: 28 },
    'critico': { firstResponse: 1, resolution: 28 },
    
    // 2. Urgente o Alto (Inferior a 2 horas / 44 horas)
    '2': { firstResponse: 2, resolution: 44 },
    'alto': { firstResponse: 2, resolution: 44 },
    'urgente': { firstResponse: 2, resolution: 44 },
    'alta': { firstResponse: 2, resolution: 44 }, // Compatibilidad con nombres anteriores

    // 3. Ordinarias o Medio (Inferior a 4 horas / 56 horas)
    '3': { firstResponse: 4, resolution: 56 },
    'medio': { firstResponse: 4, resolution: 56 },
    'ordinaria': { firstResponse: 4, resolution: 56 },
    'media': { firstResponse: 4, resolution: 56 }, // Compatibilidad

    // 4. Leves o Bajo (Inferior a 8 horas / 80 horas)
    '4': { firstResponse: 8, resolution: 80 },
    'bajo': { firstResponse: 8, resolution: 80 },
    'leve': { firstResponse: 8, resolution: 80 },
    'baja': { firstResponse: 8, resolution: 80 }, // Compatibilidad

    // 5. Planeado (Inferior a 8 horas / 176 horas)
    '5': { firstResponse: 8, resolution: 176 },
    'planeado': { firstResponse: 8, resolution: 176 }
  },
  // Tiempos para Requerimientos
  'requerimiento': {
    // Se aplican las mismas reglas que para incidentes por ahora
    'critico': { firstResponse: 1, resolution: 28 },
    'alto': { firstResponse: 2, resolution: 44 },
    'medio': { firstResponse: 4, resolution: 56 },
    'bajo': { firstResponse: 8, resolution: 80 },
    'planeado': { firstResponse: 8, resolution: 176 }
  },
  // Configuración por defecto (si no coincide tipo/prioridad)
  'default': {
    firstResponse: 4, // 4 horas
    resolution: 56    // 56 horas (Medio)
  }
};

class SLAService {

  /**
   * Helper: Obtener la hora actual ajustada a Colombia (UTC-5).
   * Todos los timestamps del sistema se normalizan a este offset para
   * que los cálculos de horas laborales sean consistentes.
   */
  _getNowInDbFormat() {
    return moment().utcOffset(DB_UTC_OFFSET).toDate();
  }

  /**
   * Helper: Get ticket state histories from database
   * Consolidates repeated history queries across the service
   * @param {number|Array} ticketIds - Single ticket ID or array of IDs
   * @returns {Object|Array} - History rows (object with ticketId keys if array input)
   */
  async _getTicketHistories(ticketIds) {
    const isArray = Array.isArray(ticketIds);
    const ids = isArray ? ticketIds : [ticketIds];

    if (!ids || ids.length === 0) return isArray ? {} : [];

    try {
      // Process in batches to avoid connection saturation
      const historiesMap = {};
      const batchSize = DATABASE.BATCH_SIZE;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);

        const result = await pool.query(`
          SELECT
            o_id,
            created_at,
            value_from,
            value_to
          FROM histories
          WHERE o_id = ANY($1::int[])
            AND history_attribute_id = $2
          ORDER BY o_id, created_at ASC
        `, [batchIds, DATABASE.HISTORY_ATTRIBUTE_IDS.STATE_CHANGE]);

        result.rows.forEach(h => {
          if (!historiesMap[h.o_id]) historiesMap[h.o_id] = [];
          historiesMap[h.o_id].push({
            ...h,
            created_at: h.created_at ? moment(h.created_at).utcOffset(DB_UTC_OFFSET).toDate() : null
          });
        });
      }

      // If single ID requested, return just that array
      return isArray ? historiesMap : (historiesMap[ids[0]] || []);
    } catch (error) {
      logger.error('Error fetching ticket histories', error, { ticketIds: ids });
      return isArray ? {} : [];
    }
  }

  /**
   * Helper: Get ticket owner change histories from database (attribute_id = 14)
   * @param {Array} ticketIds - Array of ticket IDs
   * @returns {Object} - Map of ticketId -> array of owner change events
   */
  async _getOwnerHistories(ticketIds) {
    const ids = Array.isArray(ticketIds) ? ticketIds : [ticketIds];
    if (!ids || ids.length === 0) return {};

    try {
      const historiesMap = {};
      const batchSize = DATABASE.BATCH_SIZE;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        const result = await pool.query(`
          SELECT o_id, created_at, value_from, value_to
          FROM histories
          WHERE o_id = ANY($1::int[])
            AND history_attribute_id = $2
          ORDER BY o_id, created_at ASC
        `, [batchIds, DATABASE.HISTORY_ATTRIBUTE_IDS.OWNER_CHANGE]);

        result.rows.forEach(h => {
          if (!historiesMap[h.o_id]) historiesMap[h.o_id] = [];
          historiesMap[h.o_id].push({
            ...h,
            created_at: h.created_at ? moment(h.created_at).utcOffset(DB_UTC_OFFSET).toDate() : null
          });
        });
      }
      return historiesMap;
    } catch (error) {
      logger.error('Error fetching owner histories', error, { ticketIds: ids });
      return {};
    }
  }

  /**
   * Construir linea de tiempo aplanada para todos los tickets.
   * Mergea cambios de estado + cambios de owner cronologicamente.
   * Cada fila = un periodo donde el ticket estuvo en X estado con Y responsable.
   * @param {Array} tickets - Tickets from getTicketsWithSLA (con raw_history)
   * @param {string} calendarType - Tipo de calendario
   * @returns {Array} - Array aplanado de periodos de timeline
   */
  async buildTicketTimelines(tickets, calendarType = 'laboral') {
    if (!tickets || tickets.length === 0) return [];

    const ticketIds = tickets.map(t => t.id);
    const ownerHistoriesMap = await this._getOwnerHistories(ticketIds);

    const excludedStates = STATE_GROUPS.HIGHTECH_EXCLUDED;
    const waitStates = STATE_GROUPS.CUSTOMER_WAITING;
    const allTimelines = [];

    for (const ticket of tickets) {
      const stateEvents = (ticket.raw_history || []).map(h => ({
        time: new Date(h.created_at).getTime(),
        type: 'state',
        from: h.value_from,
        to: h.value_to
      }));

      const ownerEvents = (ownerHistoriesMap[ticket.id] || []).map(h => ({
        time: new Date(h.created_at).getTime(),
        type: 'owner',
        from: h.value_from,
        to: h.value_to
      }));

      // Determinar estado y owner inicial (antes de cualquier cambio)
      let currentState = stateEvents.length > 0
        ? (stateEvents[0].from || 'Nuevo')
        : ticket.state_name;
      let currentOwner = ownerEvents.length > 0
        ? (ownerEvents[0].from || 'Sin asignar')
        : ticket.owner_name;
      if (currentOwner === '-' || !currentOwner) currentOwner = 'Sin asignar';

      // Agrupar eventos por timestamp (estado + owner pueden cambiar juntos)
      const eventGroups = {};
      for (const event of [...stateEvents, ...ownerEvents]) {
        if (!eventGroups[event.time]) eventGroups[event.time] = [];
        eventGroups[event.time].push(event);
      }

      const timestamps = Object.keys(eventGroups).map(Number).sort((a, b) => a - b);
      let periodStart = ticket.created_at;
      const endTime = ticket.close_at || this._getNowInDbFormat();
      let step = 1;

      for (const ts of timestamps) {
        const eventTime = new Date(ts);
        // Calcular duracion del periodo ANTERIOR a este evento
        const duration = workingHours.calculateWorkingMinutes(periodStart, eventTime, calendarType);
        const isWaiting = waitStates.includes(currentState);
        const isExcluded = excludedStates.includes(currentState);
        const periodType = isWaiting ? 'Cliente' : (isExcluded ? 'Excluido' : 'Empresa');

        allTimelines.push({
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          organization: ticket.organization_name,
          empresa: ticket.empresa,
          state: currentState,
          owner: currentOwner,
          start_time: moment(periodStart).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
          end_time: moment(eventTime).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
          duration_minutes: Math.round(duration),
          period_type: periodType,
          step: step++
        });

        // Aplicar todos los cambios de este timestamp
        for (const event of eventGroups[ts]) {
          if (event.type === 'state') currentState = event.to;
          if (event.type === 'owner') currentOwner = event.to || 'Sin asignar';
          if (currentOwner === '-' || !currentOwner) currentOwner = 'Sin asignar';
        }
        periodStart = eventTime;
      }

      // Periodo final (ultimo evento -> cierre o ahora)
      const finalDuration = workingHours.calculateWorkingMinutes(periodStart, endTime, calendarType);
      const isWaiting = waitStates.includes(currentState);
      const isExcluded = excludedStates.includes(currentState);

      allTimelines.push({
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        organization: ticket.organization_name,
        empresa: ticket.empresa,
        state: currentState,
        owner: currentOwner,
        start_time: moment(periodStart).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
        end_time: moment(endTime).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
        duration_minutes: Math.round(finalDuration),
        period_type: isWaiting ? 'Cliente' : (isExcluded ? 'Excluido' : 'Empresa'),
        step: step
      });
    }

    return allTimelines;
  }

  // Obtener todos los tickets con información completa desde tabla tickets
  getTicketsWithSLA(filters = {}) {
    return _getOrCompute(filters, () => this._computeTicketsWithSLA(filters));
  }

  async _computeTicketsWithSLA(filters = {}) {
    const { startDate, endDate, organizationId, ownerId, teamId, state, ticketNumber, calendarType = 'laboral', type } = filters;
    logger.debug('[SLAService] getTicketsWithSLA', { startDate, endDate, organizationId, ownerId, teamId, state, ticketNumber, calendarType, type });

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

    if (type) {
      query += ` AND t.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    
    query += ` ORDER BY t.created_at DESC`;

    logger.debug('[SLAService] getTicketsWithSLA query', { query, params });

    // Precargar maps de DynamoDB una sola vez para todos los tickets
    let projectsMap = {};
    let agentTeamMap = {};
    try {
      [projectsMap, agentTeamMap] = await Promise.all([
        dynamoService.getProjectsMap(),
        dynamoService.getAgentTeamMap()
      ]);
    } catch (e) {
      logger.error('[SLAService] No se pudo cargar DynamoDB, usando fallback de constants', e);
    }

    // FIX: Aplicar filtro de teamId si está presente
    // agentTeamMap es {agentId → {id: teamId, name}}
    if (teamId && agentTeamMap && Object.keys(agentTeamMap).length > 0) {
      const agentIdsInTeam = Object.keys(agentTeamMap)
        .filter(agentId => agentTeamMap[agentId]?.id === teamId)
        .map(Number);
      
      logger.debug('[SLAService] Filtro de equipo aplicado', { teamId, agentIdsInTeam });
      
      if (agentIdsInTeam.length > 0) {
        query += ` AND t.owner_id = ANY($${paramCount}::int[])`;
        params.push(agentIdsInTeam);
        paramCount++;
      } else {
        // Si no hay agentes en el equipo, retornar lista vacía
        logger.warn('[SLAService] No se encontraron agentes para el equipo', { teamId });
        return [];
      }
    }

    try {
      const result = await pool.query(query, params);
      logger.debug('[SLAService] Tickets encontrados en DB', { count: result.rows?.length });
      // Normalizar timestamps de tickets a objetos Date en UTC-5
      result.rows = result.rows.map(t => ({
        ...t,
        created_at: t.created_at ? moment(t.created_at).utcOffset(DB_UTC_OFFSET).toDate() : null,
        updated_at: t.updated_at ? moment(t.updated_at).utcOffset(DB_UTC_OFFSET).toDate() : null,
        close_at: t.close_at ? moment(t.close_at).utcOffset(DB_UTC_OFFSET).toDate() : null
      }));

      // OPTIMIZACIÓN: Obtener historial de todos los tickets en una sola consulta
      const ticketIds = result.rows.map(t => t.id);
      const historiesMap = await this._getTicketHistories(ticketIds);

      // Procesar cada ticket para calcular tiempos laborales correctamente
      const processedTickets = await Promise.all(
        result.rows.map(async (ticket) => {
          const ticketHistories = historiesMap[ticket.id] || [];

          // EVALUAR SLA — usar config del proyecto si existe, si no usar global
          const projectConfig = projectsMap[ticket.bld_cliente_padre?.toString()];
          const slaTargets = this.getSLATargets(ticket.type, ticket.priority_name, projectConfig);

          // Usar calendar_type del proyecto si está definido, si no el global del filtro
          const ticketCalendarType = projectConfig?.calendar_type || calendarType;

          // Calcular Tiempo Hightech: excluir Espera, Resuelto, Cerrado
          const highTechMinutes = await this.calculateHighTechTime(ticket.id, ticket.created_at, ticket.close_at || this._getNowInDbFormat(), ticketCalendarType, ticketHistories, ticket.state_name);

          // Calcular Tiempo Cliente: solo cuando está en "Espera"
          const clientMinutes = await this.calculateClientWaitingTime(ticket.id, ticketCalendarType, ticketHistories, ticket.created_at);

          // Calcular Tiempo Primera Respuesta
          const firstResponseMinutes = await this.calculateFirstResponseTime(ticket.id, ticket.created_at, ticketCalendarType, ticketHistories);

          const firstResponseMet = firstResponseMinutes <= slaTargets.firstResponse;
          const resolutionMet = highTechMinutes <= slaTargets.resolution;

          // Lookup empresa y equipo del agente desde DynamoDB (O(1))
          const empresa = projectConfig?.empresa || this.getEmpresaNombre(ticket.bld_cliente_padre);
          const team = agentTeamMap[ticket.owner_id] || null;

          return {
            ...ticket,
            hightech_time_minutes: highTechMinutes,
            client_time_minutes: clientMinutes,
            first_response_time_minutes: firstResponseMinutes,
            hightech_time_formatted: workingHours.formatMinutes(highTechMinutes, ticketCalendarType),
            client_time_formatted: workingHours.formatMinutes(clientMinutes, ticketCalendarType),

            // Resultados de SLA
            sla_config: slaTargets,
            first_response_sla_met: firstResponseMet,
            resolution_sla_met: resolutionMet,

            empresa,
            team_id: team?.id || null,
            team_name: team?.name || null,
            raw_history: ticketHistories // OPTIMIZACIÓN: Devolver historial para reutilizar
          };
        })
      );

      // Filtrar por equipo si se especificó teamId
      // Se busca directamente el equipo en DynamoDB para obtener sus agent_ids,
      // ya que agentTeamMap solo mapea cada agente a UN equipo (el último procesado)
      // y los agentes pertenecen a múltiples equipos (área + gerencia)
      if (teamId) {
        try {
          const team = await dynamoService.getTeam(teamId);
          if (team && team.agent_ids && team.agent_ids.length > 0) {
            const agentIdSet = new Set(team.agent_ids.map(id => Number(id)));
            return processedTickets.filter(t => agentIdSet.has(Number(t.owner_id)));
          }
        } catch (e) {
          logger.error('[SLAService] Error obteniendo equipo para filtrar', e);
        }
        return [];
      }

      return processedTickets;
    } catch (error) {
      logger.error('Error en _computeTicketsWithSLA', error, { filters });
      throw error;
    }
  }

  /**
   * Calcular Tiempo Hightech: suma de todos los períodos donde NO esté en Espera/Resuelto/Cerrado
   * @param {number} ticketId - ID del ticket
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @param {string} calendarType - Tipo de calendario ('laboral', '24-7', 'extended')
   * @param {Array} preFetchedHistories - (Opcional) Historial precargado para evitar queries
   * @param {string} currentStateName - (Opcional) Estado actual para evitar queries
   */
  async calculateHighTechTime(ticketId, startDate, endDate, calendarType = 'laboral', preFetchedHistories = null, currentStateName = null) {
    try {
      if (!startDate || !endDate) {
        return 0;
      }

      // Obtener todos los cambios de estado del ticket
      let historiesRows = preFetchedHistories;
      if (!historiesRows) {
        const res = await pool.query(`SELECT created_at, value_from, value_to FROM histories WHERE o_id = $1 AND history_attribute_id = 13 ORDER BY created_at ASC`, [ticketId]);
        historiesRows = res.rows.map(r => ({ ...r, created_at: r.created_at ? moment(r.created_at).utcOffset(DB_UTC_OFFSET).toDate() : null }));
      }

      let totalHighTechMinutes = 0;
      const excludedStates = STATE_GROUPS.HIGHTECH_EXCLUDED;

      if (historiesRows.length === 0) {
        // Si no hay historial de cambios, el ticket nunca cambió de estado
        // Obtener estado del ticket para saber si contar tiempo
        let stateName = currentStateName;
        if (!stateName) {
          const ticketResult = await pool.query(`SELECT ts.name as state_name FROM tickets t JOIN ticket_states ts ON t.state_id = ts.id WHERE t.id = $1`, [ticketId]);
          if (ticketResult.rows.length > 0) stateName = ticketResult.rows[0].state_name;
        }

        if (stateName) {
          // Si el estado actual no está excluido, contar todo el tiempo
          if (!excludedStates.includes(stateName)) {
            totalHighTechMinutes = workingHours.calculateWorkingMinutes(startDate, endDate, calendarType);
          }
        }
        return Math.round(totalHighTechMinutes);
      }

      // Si hay historial, procesar cada cambio de estado
      let currentPeriodStart = startDate;
      
      for (let i = 0; i < historiesRows.length; i++) {
        const change = historiesRows[i];
        
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
      // const lastChange = historiesRows[historiesRows.length - 1]; // No se usa directamente, pero el estado actual es el que importa
      
      // Obtener estado actual del ticket
      let currentTicketState = currentStateName;
      if (!currentTicketState) {
        const currentStateResult = await pool.query(`SELECT ts.name as state_name FROM tickets t JOIN ticket_states ts ON t.state_id = ts.id WHERE t.id = $1`, [ticketId]);
        if (currentStateResult.rows.length > 0) currentTicketState = currentStateResult.rows[0].state_name;
      }

      if (currentTicketState) {
        // Si el estado actual (que es el value_to del último cambio) no está excluido
        if (!excludedStates.includes(currentTicketState)) {
          const periodMinutes = workingHours.calculateWorkingMinutes(currentPeriodStart, endDate, calendarType);
          totalHighTechMinutes += periodMinutes;
        }
      }

      return Math.round(totalHighTechMinutes);
    } catch (error) {
      logger.error(`Error calculando Tiempo Hightech para ticket ${ticketId}`, error, {
        ticketId,
        calendarType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      // Return 0 but log the error for investigation
      return 0;
    }
  }

  /**
   * Calcular Tiempo Cliente: suma de todos los períodos en estado "Espera"
   * @param {number} ticketId - ID del ticket
   * @param {string} calendarType - Tipo de calendario ('laboral', '24-7', 'extended')
   * @param {Array} preFetchedHistories - (Opcional) Historial precargado
   * @param {Date} ticketCreatedAt - (Opcional) Fecha de creación para calcular espera inicial
   */
  async calculateClientWaitingTime(ticketId, calendarType = 'laboral', preFetchedHistories = null, ticketCreatedAt = null) {
    try {
      let historiesRows = preFetchedHistories;
      if (!historiesRows) {
        const res = await pool.query(`SELECT created_at, value_from, value_to FROM histories WHERE o_id = $1 AND history_attribute_id = 13 ORDER BY created_at ASC`, [ticketId]);
        historiesRows = res.rows.map(r => ({ ...r, created_at: r.created_at ? moment(r.created_at).utcOffset(DB_UTC_OFFSET).toDate() : null }));
      }

      let totalWaitingMinutes = 0;
      const waitStates = STATE_GROUPS.CUSTOMER_WAITING;
      let waitingStart = null;

      // CORRECCIÓN: Verificar si el ticket nació en estado de espera (periodo inicial)
      if (historiesRows.length > 0 && ticketCreatedAt) {
        const firstChange = historiesRows[0];
        if (waitStates.includes(firstChange.value_from)) {
          const initialWait = workingHours.calculateWorkingMinutes(ticketCreatedAt, firstChange.created_at, calendarType);
          totalWaitingMinutes += initialWait;
        }
      }

      // Procesar cada cambio de estado
      for (let i = 0; i < historiesRows.length; i++) {
        const change = historiesRows[i];

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
        const minutes = workingHours.calculateWorkingMinutes(waitingStart, this._getNowInDbFormat(), calendarType);
        totalWaitingMinutes += minutes;
      }

      return Math.round(totalWaitingMinutes);
    } catch (error) {
      logger.error('Error calculando Tiempo Cliente', error, { ticketId, calendarType });
      // Return 0 but log the error for investigation
      return 0;
    }
  }

  /**
   * Calcular Tiempo de Primera Respuesta (Creación -> Primer cambio de estado relevante)
   */
  async calculateFirstResponseTime(ticketId, createdAt, calendarType, preFetchedHistories = null) {
    try {
      let historiesRows = preFetchedHistories;
      if (!historiesRows) {
        const res = await pool.query(`SELECT created_at FROM histories WHERE o_id = $1 AND history_attribute_id = 13 ORDER BY created_at ASC LIMIT 1`, [ticketId]);
        historiesRows = res.rows.map(r => ({ ...r, created_at: r.created_at ? moment(r.created_at).utcOffset(DB_UTC_OFFSET).toDate() : null }));
      }

      if (historiesRows.length > 0) {
        // El primer cambio de estado se considera la primera respuesta/atención
        const firstInteraction = historiesRows[0].created_at;
        return workingHours.calculateWorkingMinutes(createdAt, firstInteraction, calendarType);
      }

      // Si no hay historial, calcular tiempo hasta ahora (ticket sin tocar)
      return workingHours.calculateWorkingMinutes(createdAt, this._getNowInDbFormat(), calendarType);

    } catch (error) {
      logger.error('Error calculando Primera Respuesta', error, { ticketId, calendarType });
      // Return 0 but log the error for investigation
      return 0;
    }
  }

  /**
   * Obtener objetivos de SLA según Tipo y Prioridad.
   * Si el proyecto tiene sla_targets personalizados en DynamoDB, los usa.
   * @param {string} type
   * @param {string} priority
   * @param {Object|null} projectConfig - Proyecto desde DynamoDB (puede tener sla_targets)
   */
  getSLATargets(type, priority, projectConfig = null) {
    const typeKey = (type || '').toLowerCase();
    const priorityKey = (priority || '').toLowerCase();

    // Usar targets del proyecto si están definidos
    const source = (projectConfig?.sla_targets) || SLA_CONFIG;

    let config = null;

    if (source[typeKey] && source[typeKey][priorityKey]) {
      config = source[typeKey][priorityKey];
    } else if (source[typeKey]) {
      // Coincidencia parcial en prioridad (ej: "2 media" vs "media")
      const priorities = Object.keys(source[typeKey]);
      const match = priorities.find(p => priorityKey.includes(p) || p.includes(priorityKey));
      if (match) config = source[typeKey][match];
    }

    // Si no hay coincidencia, usar default (del proyecto o global)
    if (!config) config = source['default'] || SLA_CONFIG['default'];

    return {
      firstResponse: config.firstResponse * 60,
      resolution: config.resolution * 60
    };
  }

  /**
   * Obtener nombre de empresa desde bld_cliente_padre.
   * El mapa de IDs vive en config/constants.js → EMPRESA_NAMES.
   * TODO: Mover a tabla de BD cuando el esquema lo permita.
   */
  getEmpresaNombre(bldClientePadre) {
    if (!bldClientePadre) return 'Otro';
    return EMPRESA_NAMES[bldClientePadre.toString()] || 'Otro';
  }

  // Obtener métricas agregadas de SLA
  async getSLAMetrics(filters = {}) {
    logger.debug('[SLAService] getSLAMetrics', { filters });
    const tickets = await this.getTicketsWithSLA(filters);
    logger.debug('[SLAService] Tickets procesados', { count: tickets?.length });

    const metrics = {
      total_tickets: tickets.length,
      closed_tickets: tickets.filter(t => t.close_at).length,
      open_tickets: tickets.filter(t => !t.close_at).length,
      
      // Métricas de primera respuesta
      first_response: {
        total_with_sla: tickets.length, // Asumimos que todos tienen SLA configurado por defecto
        met: tickets.filter(t => t.first_response_sla_met === true).length,
        breached: tickets.filter(t => t.first_response_sla_met === false).length,
        compliance_rate: 0,
        avg_time_minutes: 0
      },
      
      // Métricas de resolución
      resolution: {
        total_with_sla: tickets.length,
        met: tickets.filter(t => t.resolution_sla_met === true).length,
        breached: tickets.filter(t => t.resolution_sla_met === false).length,
        compliance_rate: 0,
        avg_time_minutes: 0
      },
      
      // Métricas por agente
      by_agent: {},
      
      // Métricas por organización/proyecto
      by_organization: {},

      // Métricas por tipo (Incidente, RFC, RFI)
      by_type: {
        'Incidente': { total: 0, closed: 0, open: 0 },
        'RFC': { total: 0, closed: 0, open: 0 },
        'RFI': { total: 0, closed: 0, open: 0 }
      },

      // Métricas por equipo (desde DynamoDB teams)
      by_team: {}
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
      .filter(t => t.first_response_time_minutes > 0)
      .map(t => t.first_response_time_minutes);
    
    if (firstResponseTimes.length > 0) {
      metrics.first_response.avg_time_minutes = 
        (firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length).toFixed(2);
    }
    
    const resolutionTimes = tickets
      .filter(t => t.hightech_time_minutes > 0) // Usamos hightech como tiempo de resolución
      .map(t => t.hightech_time_minutes);
    
    if (resolutionTimes.length > 0) {
      metrics.resolution.avg_time_minutes = 
        (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(2);
    }
    
    // Agrupar por agente, organización y tipo en una sola pasada
    const slaBucket = () => ({
      total: 0, closed: 0,
      first_response_met: 0, first_response_breached: 0,
      resolution_met: 0, resolution_breached: 0
    });

    tickets.forEach(ticket => {
      // --- Por agente ---
      if (ticket.owner_name) {
        if (!metrics.by_agent[ticket.owner_name]) metrics.by_agent[ticket.owner_name] = slaBucket();
        const agent = metrics.by_agent[ticket.owner_name];
        agent.total++;
        if (ticket.close_at)                          agent.closed++;
        if (ticket.first_response_sla_met === true)   agent.first_response_met++;
        if (ticket.first_response_sla_met === false)  agent.first_response_breached++;
        if (ticket.resolution_sla_met === true)       agent.resolution_met++;
        if (ticket.resolution_sla_met === false)      agent.resolution_breached++;
      }

      // --- Por equipo ---
      if (ticket.team_name) {
        if (!metrics.by_team[ticket.team_name]) metrics.by_team[ticket.team_name] = slaBucket();
        const team = metrics.by_team[ticket.team_name];
        team.total++;
        if (ticket.close_at)                          team.closed++;
        if (ticket.first_response_sla_met === true)   team.first_response_met++;
        if (ticket.first_response_sla_met === false)  team.first_response_breached++;
        if (ticket.resolution_sla_met === true)       team.resolution_met++;
        if (ticket.resolution_sla_met === false)      team.resolution_breached++;
      }

      // --- Por organización ---
      if (ticket.organization_name) {
        if (!metrics.by_organization[ticket.organization_name]) metrics.by_organization[ticket.organization_name] = slaBucket();
        const org = metrics.by_organization[ticket.organization_name];
        org.total++;
        if (ticket.close_at)                          org.closed++;
        if (ticket.first_response_sla_met === true)   org.first_response_met++;
        if (ticket.first_response_sla_met === false)  org.first_response_breached++;
        if (ticket.resolution_sla_met === true)       org.resolution_met++;
        if (ticket.resolution_sla_met === false)      org.resolution_breached++;
      }

      // --- Por tipo (Incidente, RFC, RFI) ---
      // Normalizar: minúsculas y sin acentos (para 'Petición', 'Análisis', etc.)
      const typeLower = (ticket.type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let typeKey = null;
      if (typeLower.includes('incident') || typeLower.includes('problem') || typeLower.includes('incidencia')) {
        typeKey = 'Incidente';
      } else if (typeLower.includes('rfc') || typeLower.includes('cambio') || typeLower.includes('change')) {
        typeKey = 'RFC';
      } else if (typeLower.includes('rfi') || typeLower.includes('requerimiento') || typeLower.includes('peticion') || typeLower.includes('solicitud') || typeLower.includes('request') || typeLower.includes('servicio')) {
        typeKey = 'RFI';
      }
      if (typeKey) {
        metrics.by_type[typeKey].total++;
        if (ticket.close_at) metrics.by_type[typeKey].closed++;
        else                 metrics.by_type[typeKey].open++;
      }
    });
    
    return metrics;
  }

  // Obtener lista de organizaciones/proyectos
  async getProjects() {
    try {
      const result = await pool.query(`
        SELECT id, name
        FROM organizations o
        WHERE o.active = true
        ORDER BY o.name
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name
      }));
    } catch (error) {
      logger.error('Error en getProjects', error);
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
      logger.error('Error en getAgents', error);
      return [];
    }
  }

  // Obtener lista de tipos de tickets
  async getTicketTypes() {
    try {
      const result = await pool.query(`
        SELECT DISTINCT type
        FROM tickets
        WHERE type IS NOT NULL AND type != ''
        ORDER BY type
      `);
      return result.rows.map(row => row.type);
    } catch (error) {
      logger.error('Error en getTicketTypes', error);
      return [];
    }
  }

  // Obtener lista de estados de tickets desde Zammad
  async getTicketStates() {
    try {
      const result = await pool.query(`
        SELECT id, name
        FROM ticket_states
        WHERE active = true
        ORDER BY id ASC
      `);
      return result.rows.map(row => row.name);
    } catch (error) {
      logger.error('Error en getTicketStates', error);
      return [];
    }
  }

  /**
   * Obtener historial detallado de estados de un ticket
   * Mergea cambios de estado + cambios de owner cronologicamente.
   * Cada entrada muestra: estado, responsable, duracion, tipo de periodo.
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

      // Obtener historial de cambios de estado Y de owner en paralelo
      const [stateHistResult, ownerHistResult] = await Promise.all([
        pool.query(`
          SELECT created_at, value_from, value_to
          FROM histories
          WHERE o_id = $1 AND history_attribute_id = $2
          ORDER BY created_at ASC
        `, [ticket.id, DATABASE.HISTORY_ATTRIBUTE_IDS.STATE_CHANGE]),
        pool.query(`
          SELECT created_at, value_from, value_to
          FROM histories
          WHERE o_id = $1 AND history_attribute_id = $2
          ORDER BY created_at ASC
        `, [ticket.id, DATABASE.HISTORY_ATTRIBUTE_IDS.OWNER_CHANGE])
      ]);

      const excludedStates = STATE_GROUPS.HIGHTECH_EXCLUDED;
      const waitStates = STATE_GROUPS.CUSTOMER_WAITING;

      // Normalizar created_at a Date (UTC-5) y mapear eventos
      const stateRows = stateHistResult.rows.map(r => ({ ...r, created_at: r.created_at ? moment(r.created_at).utcOffset(DB_UTC_OFFSET).toDate() : null }));
      const ownerRows = ownerHistResult.rows.map(r => ({ ...r, created_at: r.created_at ? moment(r.created_at).utcOffset(DB_UTC_OFFSET).toDate() : null }));

      const stateEvents = stateRows.map(h => ({
        time: new Date(h.created_at).getTime(), type: 'state', from: h.value_from, to: h.value_to
      }));
      const ownerEvents = ownerRows.map(h => ({
        time: new Date(h.created_at).getTime(), type: 'owner', from: h.value_from, to: h.value_to
      }));

      // Determinar estado y owner inicial
      let currentState = stateEvents.length > 0
        ? (stateEvents[0].from || 'Nuevo')
        : ticket.current_state;
      let currentOwner = ownerEvents.length > 0
        ? (ownerEvents[0].from || 'Sin asignar')
        : ticket.owner_name;
      if (currentOwner === '-' || !currentOwner) currentOwner = 'Sin asignar';

      // Agrupar eventos por timestamp
      const eventGroups = {};
      for (const event of [...stateEvents, ...ownerEvents]) {
        if (!eventGroups[event.time]) eventGroups[event.time] = [];
        eventGroups[event.time].push(event);
      }

      const timestamps = Object.keys(eventGroups).map(Number).sort((a, b) => a - b);
      let periodStart = ticket.created_at;
      const endTime = ticket.close_at || this._getNowInDbFormat();

      let stateHistory = [];
      let totalHighTechMinutes = 0;
      let totalClientMinutes = 0;

      for (const ts of timestamps) {
        const eventTime = new Date(ts);
        const duration = workingHours.calculateWorkingMinutes(periodStart, eventTime, calendarType);
        const isWaiting = waitStates.includes(currentState);
        const isExcluded = excludedStates.includes(currentState);
        const isHighTech = !isExcluded;
        const periodType = isWaiting ? 'Cliente' : (isExcluded ? 'Excluido' : 'Empresa');

        if (isHighTech) totalHighTechMinutes += duration;
        if (isWaiting) totalClientMinutes += duration;

        stateHistory.push({
          from: null,
          to: currentState,
          owner: currentOwner,
          startTime: moment(periodStart).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
          endTime: moment(eventTime).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
          durationMinutes: Math.round(duration),
          durationFormatted: workingHours.formatMinutes(duration, calendarType),
          type: periodType
        });

        // Aplicar cambios de este timestamp
        for (const event of eventGroups[ts]) {
          if (event.type === 'state') currentState = event.to;
          if (event.type === 'owner') currentOwner = event.to || 'Sin asignar';
        }
        periodStart = eventTime;
      }

      // Periodo final
      const finalDuration = workingHours.calculateWorkingMinutes(periodStart, endTime, calendarType);
      const isWaitingFinal = waitStates.includes(currentState);
      const isExcludedFinal = excludedStates.includes(currentState);
      const isHighTechFinal = !isExcludedFinal;

      if (isHighTechFinal) totalHighTechMinutes += finalDuration;
      if (isWaitingFinal) totalClientMinutes += finalDuration;

      const isCurrent = !ticket.close_at;
      stateHistory.push({
        from: null,
        to: currentState,
        owner: currentOwner,
        startTime: moment(periodStart).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
        endTime: moment(endTime).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
        durationMinutes: Math.round(finalDuration),
        durationFormatted: workingHours.formatMinutes(finalDuration, calendarType),
        type: isWaitingFinal ? 'Cliente' : (isExcludedFinal ? 'Excluido' : 'Empresa'),
        isCurrent
      });

      return {
        ticket: {
          number: ticket.number,
          title: ticket.title,
          created: moment(ticket.created_at).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
          closed: ticket.close_at ? moment(ticket.close_at).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss') : 'Abierto',
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
      logger.error('Error en getTicketHistoryDetail', error, { ticketNumber, calendarType });
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

    const excludedStates = STATE_GROUPS.FINAL_STATES;
    const waitStates = STATE_GROUPS.CUSTOMER_WAITING;

    // Procesar cada ticket para obtener duraciones por estado
    const processedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        // OPTIMIZACIÓN: Usar el historial que ya trajo getTicketsWithSLA
        const histories = ticket.raw_history || [];
        const stateHistory = [];

        if (histories.length === 0) {
          // Sin historial, todo el tiempo fue en un solo estado
          const endTime = ticket.close_at || this._getNowInDbFormat();
          const duration = workingHours.calculateWorkingMinutes(ticket.created_at, endTime, calendarType);
          
          stateHistory.push({
            from: null,
            to: ticket.state_name,
            durationMinutes: duration,
            durationFormatted: workingHours.formatMinutes(duration, calendarType)
          });
        } else {
          // Procesar cada período de estado
          
          // 1. CORRECCIÓN: Agregar periodo inicial (Creación -> Primer cambio)
          const firstChange = histories[0];
          const initialDuration = workingHours.calculateWorkingMinutes(ticket.created_at, firstChange.created_at, calendarType);
          const initialState = firstChange.value_from || 'Nuevo';
          
          // Solo agregar si tiene duración relevante (opcional, pero consistente con la tabla)
          stateHistory.push({
            from: null,
            to: initialState,
            durationMinutes: initialDuration,
            durationFormatted: workingHours.formatMinutes(initialDuration, calendarType),
            startTime: moment(ticket.created_at).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
            endTime: moment(firstChange.created_at).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss')
          });

          // 2. Procesar cambios subsiguientes
          for (let i = 0; i < histories.length; i++) {
            const change = histories[i];
            const nextChange = histories[i + 1];
            
            const periodStart = change.created_at;
            const periodEnd = nextChange ? nextChange.created_at : (ticket.close_at || this._getNowInDbFormat());

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
              durationFormatted: workingHours.formatMinutes(duration, calendarType),
              startTime: moment(periodStart).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss'),
              endTime: moment(periodEnd).utcOffset(DB_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss')
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
          history: stateHistory,
          hightech_time_minutes: ticket.hightech_time_minutes,
          bld_responsable: ticket.bld_responsable,
          first_response_time_minutes: ticket.first_response_time_minutes,
          sla_config: ticket.sla_config,
          first_response_sla_met: ticket.first_response_sla_met,
          resolution_sla_met: ticket.resolution_sla_met
        };
      })
    );

    return processedTickets;
  }
}

module.exports = new SLAService();
