const express = require('express');
const router = express.Router();
const slaService = require('../services/slaService');
const excelService = require('../services/excelService');
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
    handleApiError(res, error, 'proyectos');
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
    console.log('\n📊 [BACKEND /api/metrics] Petición recibida');
    console.log('📊 [BACKEND] Headers:', req.headers);
    console.log('📊 [BACKEND] Body:', req.body);
    const filters = req.body;
    console.log('📊 [BACKEND] Llamando a slaService.getSLAMetrics con filtros:', filters);
    const metrics = await slaService.getSLAMetrics(filters);
    console.log('📊 [BACKEND] Métricas obtenidas:', metrics);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('❌ [BACKEND /api/metrics] Error:', error);
    handleApiError(res, error, 'métricas');
  }
});

// Obtener tickets con SLA
router.post('/tickets', filtersValidation, validate, async (req, res) => {
  try {
    console.log('\n🎫 [BACKEND /api/tickets] Petición recibida');
    console.log('🎫 [BACKEND] Body:', req.body);
    const filters = req.body;
    console.log('🎫 [BACKEND] Llamando a slaService.getTicketsWithSLA con filtros:', filters);
    const tickets = await slaService.getTicketsWithSLA(filters);
    console.log('🎫 [BACKEND] Tickets obtenidos:', tickets?.length, 'tickets');
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
