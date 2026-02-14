/**
 * API Service
 * Handles all API calls to the backend
 */

const API = {
  baseURL: '/api',

  /**
   * Generic API call handler
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      // Handle non-JSON responses (like Excel downloads)
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        return response;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  /**
   * Get available projects
   */
  async getProjects() {
    const response = await this.request('/projects');
    return response.data || [];
  },

  /**
   * Get available agents
   */
  async getAgents() {
    const response = await this.request('/agents');
    return response.data || [];
  },

  /**
   * Get ticket types
   */
  async getTicketTypes() {
    const response = await this.request('/ticket-types');
    return response.data || [];
  },

  /**
   * Get ticket states
   */
  async getTicketStates() {
    // This would need to be implemented in the backend
    // For now, return hardcoded states
    return ['Nuevo', 'Abierto', 'En Progreso', 'En Espera', 'Resuelto', 'Cerrado'];
  },

  /**
   * Get SLA metrics
   */
  async getMetrics(filters) {
    const response = await this.request('/metrics', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
    return response.data;
  },

  /**
   * Get tickets with SLA data
   */
  async getTickets(filters) {
    const response = await this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
    return response.data || [];
  },

  /**
   * Get tickets with state durations
   */
  async getTicketsWithDurations(filters) {
    const response = await this.request('/tickets-with-durations', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
    return response.data || [];
  },

  /**
   * Get ticket history detail
   */
  async getTicketHistory(ticketNumber, calendarType) {
    const response = await this.request(`/ticket-history/${ticketNumber}?calendarType=${calendarType}`);
    return response.data;
  },

  /**
   * Generate Excel report
   */
  async generateReport(filters, charts) {
    const response = await this.request('/generate-report', {
      method: 'POST',
      body: JSON.stringify({ filters, charts })
    });

    // Handle blob response for file download
    const blob = await response.blob();
    return blob;
  },

  /**
   * Generate filtered Excel report
   */
  async generateFilteredReport(filters) {
    const response = await this.request('/generate-filtered-report', {
      method: 'POST',
      body: JSON.stringify(filters)
    });

    const blob = await response.blob();
    return blob;
  }
};

// Export for use in other modules
window.API = API;
