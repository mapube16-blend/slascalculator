/**
 * Application State Management
 * Centralized state for the SLA Reporter application
 */

const AppState = {
  // Current metrics data
  currentMetrics: null,

  // Selected calendar type
  selectedCalendarType: 'laboral',

  // Tickets data
  allTickets: [],

  // Pagination state
  pagination: {
    currentPage: 1,
    itemsPerPage: 10
  },

  // Sorting state
  currentSort: {
    field: null,
    direction: 'asc'
  },

  // Modal state
  modal: {
    type: null,
    status: null
  },

  // Chart instances (for cleanup)
  chartInstances: {},

  // DOM elements cache
  elements: {},

  // Initialize state
  init() {
    this.loadFromSessionStorage();
  },

  // Save state to session storage
  saveToSessionStorage() {
    try {
      sessionStorage.setItem('slaReporterState', JSON.stringify({
        selectedCalendarType: this.selectedCalendarType,
        pagination: this.pagination,
        currentSort: this.currentSort
      }));
    } catch (e) {
      console.warn('Could not save state to session storage', e);
    }
  },

  // Load state from session storage
  loadFromSessionStorage() {
    try {
      const saved = sessionStorage.getItem('slaReporterState');
      if (saved) {
        const state = JSON.parse(saved);
        this.selectedCalendarType = state.selectedCalendarType || 'laboral';
        this.pagination = state.pagination || this.pagination;
        this.currentSort = state.currentSort || this.currentSort;
      }
    } catch (e) {
      console.warn('Could not load state from session storage', e);
    }
  },

  // Update pagination
  updatePagination(page, itemsPerPage) {
    this.pagination.currentPage = page;
    if (itemsPerPage !== undefined) {
      this.pagination.itemsPerPage = itemsPerPage;
    }
    this.saveToSessionStorage();
  },

  // Update sorting
  updateSort(field, direction) {
    this.currentSort = { field, direction };
    this.saveToSessionStorage();
  },

  // Clear all tickets
  clearTickets() {
    this.allTickets = [];
    this.pagination.currentPage = 1;
  }
};

// Export for use in other modules
window.AppState = AppState;
