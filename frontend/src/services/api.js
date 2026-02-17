import axios from 'axios';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);

    // Manejar errores específicos
    if (error.response) {
      // El servidor respondió con un código de error
      const { status, data } = error.response;

      if (status === 401) {
        console.error('No autorizado');
      } else if (status === 503) {
        console.error('Servicio no disponible - Verifica la VPN');
      }

      return Promise.reject(data.error || error.message);
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      return Promise.reject('No se pudo conectar con el servidor');
    } else {
      // Algo pasó al configurar la petición
      return Promise.reject(error.message);
    }
  }
);

// Helper: Filtrar valores null/undefined de objetos
// Los validadores del backend usan .optional() que solo ignora undefined,
// no null. Esta función limpia el objeto antes de enviarlo.
const filterNullValues = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  return Object.entries(obj).reduce((acc, [key, value]) => {
    // Mantener valores válidos: 0, false, "", pero eliminar null/undefined
    if (value !== null && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// Servicio API
export const apiService = {
  // ==================== ENDPOINTS BÁSICOS ====================

  /**
   * Obtener proyectos disponibles
   */
  getProjects: async () => {
    const response = await api.get('/projects');
    return response.data.data || [];
  },

  /**
   * Obtener agentes disponibles
   */
  getAgents: async () => {
    const response = await api.get('/agents');
    return response.data.data || [];
  },

  /**
   * Obtener tipos de tickets disponibles
   */
  getTicketTypes: async () => {
    const response = await api.get('/ticket-types');
    return response.data.data || [];
  },

  // ==================== MÉTRICAS Y TICKETS ====================

  /**
   * Obtener métricas de SLA
   * @param {Object} filters - Filtros (startDate, endDate, organizationId, ownerId, state, type, calendarType)
   */
  getMetrics: async (filters) => {
    console.log('📊 [API] getMetrics - Filtros originales:', filters);
    const filteredData = filterNullValues(filters);
    console.log('📊 [API] getMetrics - Filtros después de filtrar nulls:', filteredData);
    const response = await api.post('/metrics', filteredData);
    console.log('📊 [API] getMetrics - Respuesta:', response.data);

    // Transformar snake_case a camelCase y aplanar estructura
    const metrics = response.data.data;
    const transformed = {
      totalTickets: metrics.total_tickets || 0,
      closedTickets: metrics.closed_tickets || 0,
      openTickets: metrics.open_tickets || 0,

      // Primera respuesta - aplanar objeto
      firstResponseRate: parseFloat(metrics.first_response?.compliance_rate || 0),
      firstResponseMet: metrics.first_response?.met || 0,
      firstResponseBreached: metrics.first_response?.breached || 0,

      // Resolución - aplanar objeto
      resolutionRate: parseFloat(metrics.resolution?.compliance_rate || 0),
      resolutionMet: metrics.resolution?.met || 0,
      resolutionBreached: metrics.resolution?.breached || 0,

      // Mantener datos originales por si se necesitan
      _raw: metrics
    };

    console.log('📊 [API] getMetrics - Datos transformados:', transformed);
    return transformed;
  },

  /**
   * Obtener tickets con información de SLA
   * @param {Object} filters - Filtros (startDate, endDate, organizationId, ownerId, state, type, calendarType)
   */
  getTickets: async (filters) => {
    console.log('🎫 [API] getTickets - Filtros originales:', filters);
    const filteredData = filterNullValues(filters);
    console.log('🎫 [API] getTickets - Filtros después de filtrar nulls:', filteredData);
    const response = await api.post('/tickets', filteredData);
    console.log('🎫 [API] getTickets - Respuesta:', response.data);
    return response.data.data || [];
  },

  /**
   * Obtener tickets con duraciones por estado
   * @param {Object} filters - Filtros
   */
  getTicketsWithDurations: async (filters) => {
    const response = await api.post('/tickets-with-durations', filterNullValues(filters));
    return response.data.data || [];
  },

  /**
   * Obtener historial detallado de un ticket
   * @param {string} ticketNumber - Número del ticket
   * @param {string} calendarType - Tipo de calendario
   */
  getTicketHistory: async (ticketNumber, calendarType = 'laboral') => {
    const response = await api.get(`/ticket-history/${ticketNumber}`, {
      params: { calendarType }
    });
    return response.data.data;
  },

  // ==================== REPORTES ====================

  /**
   * Generar reporte Excel completo
   * @param {Object} filters - Filtros
   * @param {Object} charts - Gráficas en base64
   */
  generateReport: async (filters, charts) => {
    const response = await api.post('/generate-report',
      { filters: filterNullValues(filters), charts },
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Generar reporte Excel filtrado
   * @param {Object} params - Parámetros (slaType, slaStatus, ...filters)
   */
  generateFilteredReport: async (params) => {
    const response = await api.post('/generate-filtered-report',
      filterNullValues(params),
      { responseType: 'blob' }
    );
    return response.data;
  },

  // ==================== UTILIDADES ====================

  /**
   * Descargar blob como archivo
   * @param {Blob} blob - Blob del archivo
   * @param {string} filename - Nombre del archivo
   */
  downloadBlob: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

export default apiService;
