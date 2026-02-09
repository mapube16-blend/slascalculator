const express = require('express');
const router = express.Router();
const slaService = require('../services/slaService');
const excelService = require('../services/excelService');

// Obtener proyectos disponibles
router.get('/projects', async (req, res) => {
  try {
    const projects = await slaService.getProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener proyectos' });
  }
});

// Obtener agentes disponibles
router.get('/agents', async (req, res) => {
  try {
    const agents = await slaService.getAgents();
    res.json({ success: true, data: agents });
  } catch (error) {
    console.error('Error al obtener agentes:', error);
    res.status(500).json({ success: false, error: 'Error al obtener agentes' });
  }
});

// Obtener métricas de SLA
router.post('/metrics', async (req, res) => {
  try {
    const filters = req.body;
    const metrics = await slaService.getSLAMetrics(filters);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error al obtener métricas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener métricas' });
  }
});

// Obtener tickets con SLA
router.post('/tickets', async (req, res) => {
  try {
    const filters = req.body;
    const tickets = await slaService.getTicketsWithSLA(filters);
    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ success: false, error: 'Error al obtener tickets' });
  }
});

// Obtener tickets con duraciones por estado
router.post('/tickets-with-durations', async (req, res) => {
  try {
    const filters = req.body;
    const calendarType = filters.calendarType || 'laboral';
    const ticketsWithDurations = await slaService.getTicketsWithStateDurations(filters, calendarType);
    res.json({ success: true, data: ticketsWithDurations });
  } catch (error) {
    console.error('Error al obtener tickets con duraciones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener tickets con duraciones' });
  }
});


router.get('/ticket-types', async (req, res) => {
  try {
    const types = await slaService.getTicketTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Obtener historial detallado de estados de un ticket
router.get('/ticket-history/:number', async (req, res) => {
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
router.post('/generate-report', async (req, res) => {
  try {
    const filters = req.body;
    
    // Obtener datos
    const tickets = await slaService.getTicketsWithSLA(filters);
    const metrics = await slaService.getSLAMetrics(filters);
    
    // Generar Excel
    const workbook = await excelService.generateSLAReport(tickets, metrics, filters);
    
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
router.post('/generate-filtered-report', async (req, res) => {
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
