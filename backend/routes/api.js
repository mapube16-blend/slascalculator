const express = require('express');
const router = express.Router();
const slaService = require('../services/slaService');
const excelService = require('../services/excelService');
const dynamoService = require('../services/dynamoService');
const {
  validate,
  filtersValidation,
  ticketHistoryValidation,
  generateReportValidation,
  generateFilteredReportValidation
} = require('../middleware/validators');

// Helper para manejar errores de conexión
const handleApiError = (res, error, context) => {
  console.error(`Error en ${context}:`, error.message);
  
  // Si es un error de conexión, devolver 503 para que el front recargue
  if (error.message.includes('ECONNRESET') || 
      error.message.includes('timeout') || 
      error.message.includes('Connection terminated')) {
    return res.status(503).json({ success: false, error: 'Conexión perdida. Recargando...', isConnectionError: true });
  }
  
  res.status(500).json({ success: false, error: `Error al obtener ${context}` });
};

// Obtener proyectos disponibles
router.get('/projects', async (req, res) => {
  try {
    const projects = await slaService.getProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    console.warn('⚠️ [PROJECTS] Error (fallback a array vacío):', error.message);
    // Fallback: retornar array vacío en lugar de error 500
    res.json({ success: true, data: [] });
  }
});

// Obtener equipos disponibles (desde DynamoDB)
router.get('/teams', async (req, res) => {
  try {
    const teams = await dynamoService.getAllTeams();
    const active = teams
      .filter(t => t.active !== false)
      .map(t => ({ id: t.id, name: t.name, type: t.type }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type < b.type ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    res.json({ success: true, data: active });
  } catch (error) {
    console.warn('⚠️ [TEAMS] DynamoDB error (fallback a array vacío):', error.message);
    // Fallback: retornar array vacío en lugar de error 500
    res.json({ success: true, data: [] });
  }
});

// Obtener agentes disponibles
router.get('/agents', async (req, res) => {
  try {
    const agents = await slaService.getAgents();
    res.json({ success: true, data: agents });
  } catch (error) {
    handleApiError(res, error, 'agentes');
  }
});

// Obtener métricas de SLA
router.post('/metrics', filtersValidation, validate, async (req, res) => {
  try {
    const filters = req.body;
    const metrics = await slaService.getSLAMetrics(filters);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('❌ [BACKEND /api/metrics] Error:', error);
    handleApiError(res, error, 'métricas');
  }
});

// Obtener tickets con SLA
router.post('/tickets', filtersValidation, validate, async (req, res) => {
  try {
    const filters = req.body;
    const tickets = await slaService.getTicketsWithSLA(filters);
    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('❌ [BACKEND /api/tickets] Error:', error);
    handleApiError(res, error, 'tickets');
  }
});

// Obtener tickets con duraciones por estado
router.post('/tickets-with-durations', filtersValidation, validate, async (req, res) => {
  try {
    const filters = req.body;
    const calendarType = filters.calendarType || 'laboral';
    const ticketsWithDurations = await slaService.getTicketsWithStateDurations(filters, calendarType);
    res.json({ success: true, data: ticketsWithDurations });
  } catch (error) {
    handleApiError(res, error, 'tickets con duraciones');
  }
});


router.get('/ticket-types', async (req, res) => {
  try {
    const types = await slaService.getTicketTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    handleApiError(res, error, 'tipos de tickets');
  }
});

// Obtener estados de tickets desde Zammad
router.get('/ticket-states', async (req, res) => {
  try {
    const states = await slaService.getTicketStates();
    res.json({ success: true, data: states });
  } catch (error) {
    handleApiError(res, error, 'estados de tickets');
  }
});


// Obtener historial detallado de estados de un ticket
router.get('/ticket-history/:number', ticketHistoryValidation, validate, async (req, res) => {
  try {
    const calendarType = req.query.calendarType || 'laboral';
    const historyDetail = await slaService.getTicketHistoryDetail(req.params.number, calendarType);

    if (!historyDetail) {
      return res.status(404).json({ success: false, error: 'Ticket no encontrado' });
    }

    res.json({ success: true, data: historyDetail });
  } catch (error) {
    console.error('Error al obtener historial del ticket:', error);
    res.status(500).json({ success: false, error: 'Error al obtener historial del ticket' });
  }
});

// Exportar datos consolidados para QuickSight (data aplanada, sin historial crudo)
// Siempre trae TODOS los tickets historicos, ignora fechas
router.post('/export/quicksight', async (req, res) => {
  try {
    // Ignorar startDate/endDate para traer todo el historico
    const { startDate, endDate, ...optionalFilters } = req.body || {};
    const filters = { ...optionalFilters };
    const exportTimestamp = new Date().toISOString();

    const calendarType = filters.calendarType || 'laboral';

    // Obtener tickets y métricas usando la lógica existente (sin filtro de fechas)
    const [tickets, metrics] = await Promise.all([
      slaService.getTicketsWithSLA(filters),
      slaService.getSLAMetrics(filters)
    ]);

    // Construir linea de tiempo con cambios de estado + responsable
    const ticketTimeline = await slaService.buildTicketTimelines(tickets, calendarType);

    // 1. Tickets aplanados (sin raw_history para reducir peso)
    const flatTickets = tickets.map(t => ({
      ticket_id: t.id,
      ticket_number: t.ticket_number,
      title: t.title,
      type: t.type,
      state: t.state_name,
      priority: t.priority_name,
      organization: t.organization_name,
      empresa: t.empresa,
      owner: t.owner_name,
      customer: t.customer_name,
      created_at: t.created_at,
      updated_at: t.updated_at,
      close_at: t.close_at,
      fase: t.bld_ticket_fase,
      responsable: t.bld_responsable,
      prioridad_cliente: t.bld_prority_customer,
      // Tiempos calculados (minutos)
      hightech_time_minutes: t.hightech_time_minutes,
      client_time_minutes: t.client_time_minutes,
      first_response_time_minutes: t.first_response_time_minutes,
      // Tiempos formateados
      hightech_time_formatted: t.hightech_time_formatted,
      client_time_formatted: t.client_time_formatted,
      // SLA targets y resultado
      sla_first_response_target_minutes: t.sla_config.firstResponse,
      sla_resolution_target_minutes: t.sla_config.resolution,
      first_response_sla_met: t.first_response_sla_met,
      resolution_sla_met: t.resolution_sla_met
    }));

    // 2. Resumen general
    const summary = {
      total_tickets: metrics.total_tickets,
      closed_tickets: metrics.closed_tickets,
      open_tickets: metrics.open_tickets,
      first_response_met: metrics.first_response.met,
      first_response_breached: metrics.first_response.breached,
      first_response_compliance_rate: metrics.first_response.compliance_rate,
      first_response_avg_minutes: metrics.first_response.avg_time_minutes,
      resolution_met: metrics.resolution.met,
      resolution_breached: metrics.resolution.breached,
      resolution_compliance_rate: metrics.resolution.compliance_rate,
      resolution_avg_minutes: metrics.resolution.avg_time_minutes
    };

    // 3. Métricas por agente (array aplanado)
    const byAgent = Object.entries(metrics.by_agent).map(([name, data]) => ({
      agent_name: name,
      total_tickets: data.total,
      closed_tickets: data.closed,
      first_response_met: data.first_response_met,
      first_response_breached: data.first_response_breached,
      resolution_met: data.resolution_met,
      resolution_breached: data.resolution_breached,
      first_response_compliance_rate: data.total > 0
        ? ((data.first_response_met / data.total) * 100).toFixed(2)
        : '0.00',
      resolution_compliance_rate: data.total > 0
        ? ((data.resolution_met / data.total) * 100).toFixed(2)
        : '0.00'
    }));

    // 4. Métricas por organización (array aplanado)
    const byOrganization = Object.entries(metrics.by_organization).map(([name, data]) => ({
      organization_name: name,
      total_tickets: data.total,
      closed_tickets: data.closed,
      first_response_met: data.first_response_met,
      first_response_breached: data.first_response_breached,
      resolution_met: data.resolution_met,
      resolution_breached: data.resolution_breached,
      first_response_compliance_rate: data.total > 0
        ? ((data.first_response_met / data.total) * 100).toFixed(2)
        : '0.00',
      resolution_compliance_rate: data.total > 0
        ? ((data.resolution_met / data.total) * 100).toFixed(2)
        : '0.00'
    }));

    // 5. Métricas por tipo (array aplanado)
    const byType = Object.entries(metrics.by_type).map(([name, data]) => ({
      type_name: name,
      total_tickets: data.total,
      closed_tickets: data.closed,
      open_tickets: data.open
    }));

    res.json({
      success: true,
      metadata: {
        exported_at: exportTimestamp,
        filters_applied: filters,
        total_records: flatTickets.length
      },
      data: {
        tickets: flatTickets,
        ticket_timeline: ticketTimeline,
        summary,
        by_agent: byAgent,
        by_organization: byOrganization,
        by_type: byType
      }
    });
  } catch (error) {
    handleApiError(res, error, 'exportación QuickSight');
  }
});

// Generar reporte Excel
router.post('/generate-report', generateReportValidation, validate, async (req, res) => {
  try {
    // AHORA: El body contiene filtros y las imágenes de las gráficas
    const { filters, charts } = req.body;

    // Obtener datos frescos para el reporte
    const tickets = await slaService.getTicketsWithSLA(filters);
    const metrics = await slaService.getSLAMetrics(filters);

    // Generar Excel, pasando las gráficas al servicio
    const workbook = await excelService.generateSLAReport(tickets, metrics, filters, charts);

    // Configurar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=SLA_Report_${Date.now()}.xlsx`);

    // Enviar archivo
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({ success: false, error: 'Error al generar reporte' });
  }
});

// Generar reporte Excel filtrado (desde modal)
router.post('/generate-filtered-report', generateFilteredReportValidation, validate, async (req, res) => {
  try {
    const { slaType, slaStatus, ...filters } = req.body;

    // Obtener todos los tickets con los filtros base
    const tickets = await slaService.getTicketsWithSLA(filters);

    // Filtrar en memoria según el tipo de SLA y estado
    const filteredTickets = tickets.filter(t => {
      if (slaType === 'first_response') {
        return slaStatus === 'met' ? t.first_response_sla_met === true : t.first_response_sla_met === false;
      } else if (slaType === 'resolution') {
        return slaStatus === 'met' ? t.resolution_sla_met === true : t.resolution_sla_met === false;
      }
      return true;
    });

    // Generar Excel solo con la lista
    const workbook = await excelService.generateTicketsListReport(filteredTickets);

    // Configurar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=SLA_Filtered_${Date.now()}.xlsx`);

    // Enviar archivo
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error al generar reporte filtrado:', error);
    res.status(500).json({ success: false, error: 'Error al generar reporte filtrado' });
  }
});

module.exports = router;
