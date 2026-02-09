const ExcelJS = require('exceljs');
const moment = require('moment');

class ExcelService {
  
  async generateSLAReport(tickets, metrics, filters) {
    const workbook = new ExcelJS.Workbook();
    
    // Metadatos del archivo
    workbook.creator = 'Zammad SLA Reporter';
    workbook.created = new Date();
    
    // Hoja 1: Resumen Ejecutivo
    this.createSummarySheet(workbook, metrics, filters);
    
    // Hoja 2: Detalle de Tickets
    this.createTicketsSheet(workbook, tickets);
    
    // Hoja 3: Métricas por Agente
    this.createAgentMetricsSheet(workbook, metrics.by_agent);
    
    // Hoja 4: Métricas por Organización/Proyecto
    this.createOrganizationMetricsSheet(workbook, metrics.by_organization);
    
    return workbook;
  }

  createSummarySheet(workbook, metrics, filters) {
    const sheet = workbook.addWorksheet('Resumen Ejecutivo');
    
    // Configurar anchos de columnas
    sheet.columns = [
      { width: 30 },
      { width: 20 },
      { width: 15 }
    ];
    
    // Título
    sheet.mergeCells('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'REPORTE DE SLA - ZAMMAD';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;
    
    // Información de filtros
    let row = 3;
    sheet.getCell(`A${row}`).value = 'Período del Reporte:';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = filters.startDate && filters.endDate 
      ? `${moment(filters.startDate).format('DD/MM/YYYY')} - ${moment(filters.endDate).format('DD/MM/YYYY')}`
      : 'Todos los tickets';
    
    row += 2;
    
    // Métricas generales
    sheet.getCell(`A${row}`).value = 'MÉTRICAS GENERALES';
    sheet.getCell(`A${row}`).font = { size: 12, bold: true, color: { argb: 'FF0066CC' } };
    row++;
    
    const generalMetrics = [
      ['Total de Tickets', metrics.total_tickets],
      ['Tickets Cerrados', metrics.closed_tickets],
      ['Tickets Abiertos', metrics.open_tickets]
    ];
    
    generalMetrics.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      sheet.getCell(`B${row}`).numFmt = '#,##0';
      row++;
    });
    
    row += 2;
    
    // Métricas de Primera Respuesta
    sheet.getCell(`A${row}`).value = 'PRIMERA RESPUESTA - SLA';
    sheet.getCell(`A${row}`).font = { size: 12, bold: true, color: { argb: 'FF0066CC' } };
    row++;
    
    const firstResponseMetrics = [
      ['Total con SLA definido', metrics.first_response.total_with_sla],
      ['SLA Cumplido', metrics.first_response.met],
      ['SLA Incumplido', metrics.first_response.breached],
      ['Tasa de Cumplimiento', `${metrics.first_response.compliance_rate}%`],
      ['Tiempo Promedio (minutos)', parseFloat(metrics.first_response.avg_time_minutes)]
    ];
    
    firstResponseMetrics.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      if (typeof value === 'number') {
        sheet.getCell(`B${row}`).numFmt = '#,##0.00';
      }
      
      // Colorear cumplido/incumplido
      if (label === 'SLA Cumplido') {
        sheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else if (label === 'SLA Incumplido') {
        sheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6B6B' }
        };
      }
      row++;
    });
    
    row += 2;
    
    // Métricas de Resolución
    sheet.getCell(`A${row}`).value = 'RESOLUCIÓN - SLA';
    sheet.getCell(`A${row}`).font = { size: 12, bold: true, color: { argb: 'FF0066CC' } };
    row++;
    
    const resolutionMetrics = [
      ['Total con SLA definido', metrics.resolution.total_with_sla],
      ['SLA Cumplido', metrics.resolution.met],
      ['SLA Incumplido', metrics.resolution.breached],
      ['Tasa de Cumplimiento', `${metrics.resolution.compliance_rate}%`],
      ['Tiempo Promedio (minutos)', parseFloat(metrics.resolution.avg_time_minutes)]
    ];
    
    resolutionMetrics.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      if (typeof value === 'number') {
        sheet.getCell(`B${row}`).numFmt = '#,##0.00';
      }
      
      // Colorear cumplido/incumplido
      if (label === 'SLA Cumplido') {
        sheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else if (label === 'SLA Incumplido') {
        sheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6B6B' }
        };
      }
      row++;
    });
  }
  createTicketsSheet(workbook, tickets) {
    const sheet = workbook.addWorksheet('Detalle Completo');
    
    // Encabezados según requerimiento
    const headers = [
      'Número',
      'Creado en',
      'Tipo de Solicitud',
      'Estado',
      'Empresa',
      'Proyecto',
      'Título',
      'Prioridad',
      'Solicitante',
      'Asignado a',
      'Última Modificación',
      'Fase',
      'Responsable',
      'Tiempo Hightech',
      'Tiempo Cliente'
    ];
    
    sheet.addRow(headers);
    
    // Estilo de encabezados
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 30;
    
    // Ancho de columnas
    sheet.columns = [
      { width: 12 },  // Número
      { width: 18 },  // Creado en
      { width: 16 },  // Tipo
      { width: 14 },  // Estado
      { width: 20 },  // Empresa
      { width: 25 },  // Proyecto
      { width: 30 },  // Título
      { width: 10 },  // Prioridad
      { width: 18 },  // Solicitante
      { width: 18 },  // Asignado a
      { width: 18 },  // Última Modificación
      { width: 10 },  // Fase
      { width: 18 },  // Responsable
      { width: 14 },  // Tiempo Hightech
      { width: 14 }   // Tiempo Cliente
    ];
    
    // Datos
    tickets.forEach(ticket => {
      const row = sheet.addRow([
        ticket.ticket_number,
        ticket.created_at ? moment(ticket.created_at).format('DD/MM/YYYY HH:mm') : '',
        ticket.type || '',
        ticket.state_name,
        ticket.empresa || '',
        ticket.organization_name,
        ticket.title,
        ticket.priority_name,
        ticket.customer_name || '',
        ticket.owner_name || '',
        ticket.updated_at ? moment(ticket.updated_at).format('DD/MM/YYYY HH:mm') : '',
        ticket.bld_ticket_fase || '',
        ticket.bld_responsable || '',
        ticket.hightech_time_formatted || '0m',
        ticket.client_time_formatted || '0m'
      ]);
      
      // Alineación y formato
      row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
    
    // Filtros automáticos
    sheet.autoFilter = {
      from: 'A1',
      to: 'O1'
    };
  }

  createAgentMetricsSheet(workbook, agentMetrics) {
    const sheet = workbook.addWorksheet('Métricas por Agente');
    
    // Encabezados
    const headers = [
      'Agente',
      'Total Tickets',
      'Tickets Cerrados',
      '1ra Resp. Cumplido',
      '1ra Resp. Incumplido',
      'Resolución Cumplido',
      'Resolución Incumplido',
      '% Cumplimiento 1ra Resp.',
      '% Cumplimiento Resolución'
    ];
    
    sheet.addRow(headers);
    
    // Estilo de encabezados
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;
    
    // Datos
    Object.entries(agentMetrics).forEach(([agent, metrics]) => {
      const firstResponseTotal = metrics.first_response_met + metrics.first_response_breached;
      const resolutionTotal = metrics.resolution_met + metrics.resolution_breached;
      
      const firstResponseRate = firstResponseTotal > 0 
        ? ((metrics.first_response_met / firstResponseTotal) * 100).toFixed(2)
        : 0;
      
      const resolutionRate = resolutionTotal > 0
        ? ((metrics.resolution_met / resolutionTotal) * 100).toFixed(2)
        : 0;
      
      sheet.addRow([
        agent,
        metrics.total,
        metrics.closed,
        metrics.first_response_met,
        metrics.first_response_breached,
        metrics.resolution_met,
        metrics.resolution_breached,
        `${firstResponseRate}%`,
        `${resolutionRate}%`
      ]);
    });
    
    // Ajustar anchos
    sheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // Filtros automáticos
    sheet.autoFilter = {
      from: 'A1',
      to: 'I1'
    };
  }

  createOrganizationMetricsSheet(workbook, organizationMetrics) {
    const sheet = workbook.addWorksheet('Métricas por Organización');
    
    // Encabezados
    const headers = [
      'Organización/Proyecto',
      'Total Tickets',
      'Tickets Cerrados',
      '1ra Resp. Cumplido',
      '1ra Resp. Incumplido',
      'Resolución Cumplido',
      'Resolución Incumplido',
      '% Cumplimiento 1ra Resp.',
      '% Cumplimiento Resolución'
    ];
    
    sheet.addRow(headers);
    
    // Estilo de encabezados
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;
    
    // Datos
    Object.entries(organizationMetrics).forEach(([org, metrics]) => {
      const firstResponseTotal = metrics.first_response_met + metrics.first_response_breached;
      const resolutionTotal = metrics.resolution_met + metrics.resolution_breached;
      
      const firstResponseRate = firstResponseTotal > 0 
        ? ((metrics.first_response_met / firstResponseTotal) * 100).toFixed(2)
        : 0;
      
      const resolutionRate = resolutionTotal > 0
        ? ((metrics.resolution_met / resolutionTotal) * 100).toFixed(2)
        : 0;
      
      sheet.addRow([
        org,
        metrics.total,
        metrics.closed,
        metrics.first_response_met,
        metrics.first_response_breached,
        metrics.resolution_met,
        metrics.resolution_breached,
        `${firstResponseRate}%`,
        `${resolutionRate}%`
      ]);
    });
    
    // Ajustar anchos
    sheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // Filtros automáticos
    sheet.autoFilter = {
      from: 'A1',
      to: 'I1'
    };
  }
}

module.exports = new ExcelService();
