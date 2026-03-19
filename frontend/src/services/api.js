import axios from 'axios';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Crear error personalizado para conectividad VPN
class VPNError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VPNError';
    this.isVPNError = true;
  }
}

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
        // Lanzar error de VPN específico
        const vpnError = new VPNError('Servicio no disponible - Verifica la VPN');
        return Promise.reject(vpnError);
      }

      return Promise.reject(data.error || error.message);
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta - probablemente sin VPN
      console.error('No hay respuesta del servidor - Posiblemente sin VPN. Verifica tu conexión VPN.');
      const vpnError = new VPNError('No se pudo conectar con el servidor. Verifica tu conexión VPN.');
      return Promise.reject(vpnError);
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network') || error.message?.includes('ENOTFOUND')) {
      // Error de red puro
      console.error('Error de red puro - Probablemente VPN desconectada');
      const vpnError = new VPNError('Sin conexión de red. Por favor verifica tu conexión VPN.');
      return Promise.reject(vpnError);
    } else {
      // Algo pasó al configurar la petición
      console.error('Error al configurar la petición:', error.message);
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

  /**
   * Obtener estados de tickets desde Zammad
   */
  getTicketStates: async () => {
    const response = await api.get('/ticket-states');
    return response.data.data || [];
  },

  getTeams: async () => {
    const response = await api.get('/teams');
    return response.data.data || [];
  },

  // ==================== MÉTRICAS Y TICKETS ====================

  /**
   * Obtener métricas de SLA
   * @param {Object} filters - Filtros (startDate, endDate, organizationId, ownerId, state, type, calendarType)
   */
  getMetrics: async (filters) => {
    const filteredData = filterNullValues(filters);
    const response = await api.post('/metrics', filteredData);

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

    return transformed;
  },

  /**
   * Obtener tickets con información de SLA
   * @param {Object} filters - Filtros (startDate, endDate, organizationId, ownerId, state, type, calendarType)
   */
  getTickets: async (filters) => {
    const filteredData = filterNullValues(filters);
    const response = await api.post('/tickets', filteredData);
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
  /**
   * Verificar conectividad con el servidor (health check)
   * @returns {Promise<boolean>} true si hay conexión, lanza VPNError si no
   */
  checkConnectivity: async () => {
    try {
      // Intentar hacer una petición muy ligera
      const response = await api.get('/ticket-types', { timeout: 5000 });
      return true;
    } catch (error) {
      // Si es un error de VPN, lo relanzamos
      if (error instanceof VPNError || error?.isVPNError) {
        throw error;
      }
      // Si es otro error, también lo consideramos como VPN
      throw new VPNError('No se pudo conectar con el servidor. Verifica tu conexión VPN.');
    }
  },

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

export { VPNError };
export default apiService;
