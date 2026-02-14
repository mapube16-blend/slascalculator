/**
 * Constants and Configuration Values
 * Centralized location for all magic numbers and strings used across the application
 */

// Database Query Configuration
const DATABASE = {
  BATCH_SIZE: 200, // Number of tickets to process per batch to avoid connection saturation
  HISTORY_ATTRIBUTE_IDS: {
    STATE_CHANGE: 13, // history_attribute_id for ticket state changes
  }
};

// Ticket State Names (as stored in database)
const TICKET_STATES = {
  WAITING: 'En Espera',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
  NEW: 'Nuevo',
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Progreso'
};

// State groups for time calculations
const STATE_GROUPS = {
  // States where ticket is waiting for customer response
  CUSTOMER_WAITING: ['En Espera'],

  // States excluded from HighTech time calculation (customer or finished states)
  HIGHTECH_EXCLUDED: ['En Espera', 'Resuelto', 'Cerrado'],

  // Final states (ticket is finished)
  FINAL_STATES: ['Resuelto', 'Cerrado']
};

// Ticket Types
const TICKET_TYPES = {
  INCIDENT: 'incidente',
  REQUEST: 'requerimiento'
};

// Priority Levels
const PRIORITIES = {
  CRITICAL: {
    id: 1,
    names: ['1', 'critico', 'crítico']
  },
  HIGH: {
    id: 2,
    names: ['2', 'alto', 'urgente', 'alta']
  },
  MEDIUM: {
    id: 3,
    names: ['3', 'medio', 'ordinaria', 'media']
  },
  LOW: {
    id: 4,
    names: ['4', 'bajo', 'leve', 'baja']
  },
  PLANNED: {
    id: 5,
    names: ['5', 'planeado']
  }
};

// Calendar Types
const CALENDAR_TYPES = {
  LABORAL: 'laboral',      // Mon-Fri 8:30-13:30, 15:00-18:00
  CONTINUO: 'continuo',    // Mon-Fri 8:30-18:00
  FULL: '24x7'             // 24/7 continuous
};

// Calendar Configurations
const CALENDAR_CONFIG = {
  laboral: {
    hours: [
      { start: '08:30', end: '13:30' },
      { start: '15:00', end: '18:00' }
    ],
    timezone: 'America/Mexico_City'
  },
  continuo: {
    hours: [
      { start: '08:30', end: '18:00' }
    ],
    timezone: 'America/Mexico_City'
  },
  '24x7': {
    hours: [
      { start: '00:00', end: '23:59' }
    ],
    timezone: 'America/Mexico_City'
  }
};

// SLA Time Targets (in working hours)
// These will be converted to minutes when used
const SLA_TARGETS = {
  incidente: {
    critico: { firstResponse: 1, resolution: 28 },
    alto: { firstResponse: 2, resolution: 44 },
    medio: { firstResponse: 4, resolution: 56 },
    bajo: { firstResponse: 8, resolution: 80 },
    planeado: { firstResponse: 8, resolution: 176 }
  },
  requerimiento: {
    critico: { firstResponse: 1, resolution: 28 },
    alto: { firstResponse: 2, resolution: 44 },
    medio: { firstResponse: 4, resolution: 56 },
    bajo: { firstResponse: 8, resolution: 80 },
    planeado: { firstResponse: 8, resolution: 176 }
  },
  default: {
    firstResponse: 4,
    resolution: 56
  }
};

// API Configuration
const API = {
  DEFAULT_PORT: 3000,
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100          // max requests per window
  }
};

// Pagination Configuration
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 500
};

// Excel Export Configuration
const EXCEL = {
  MAX_ROWS: 10000,
  CHART_WIDTH: 600,
  CHART_HEIGHT: 400
};

// Error Messages
const ERROR_MESSAGES = {
  INVALID_DATE_RANGE: 'El rango de fechas no es válido',
  INVALID_CALENDAR_TYPE: 'Tipo de calendario no válido',
  TICKET_NOT_FOUND: 'Ticket no encontrado',
  DATABASE_ERROR: 'Error al consultar la base de datos',
  VALIDATION_ERROR: 'Error de validación en los parámetros',
  UNAUTHORIZED: 'No autorizado',
  RATE_LIMIT_EXCEEDED: 'Demasiadas peticiones, intente más tarde'
};

// Success Messages
const SUCCESS_MESSAGES = {
  REPORT_GENERATED: 'Reporte generado exitosamente',
  DATA_FETCHED: 'Datos obtenidos correctamente'
};

module.exports = {
  DATABASE,
  TICKET_STATES,
  STATE_GROUPS,
  TICKET_TYPES,
  PRIORITIES,
  CALENDAR_TYPES,
  CALENDAR_CONFIG,
  SLA_TARGETS,
  API,
  PAGINATION,
  EXCEL,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};
