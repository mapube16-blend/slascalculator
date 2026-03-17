/**
 * Constants and Configuration Values
 * Centralized location for all magic numbers and strings used across the application
 */

// Database Query Configuration
const DATABASE = {
  BATCH_SIZE: 200, // Number of tickets to process per batch to avoid connection saturation
  HISTORY_ATTRIBUTE_IDS: {
    STATE_CHANGE: 13, // history_attribute_id for ticket state changes
    OWNER_CHANGE: 14, // history_attribute_id for ticket owner/agent changes
  },
  // UTC offset for Colombia (UTC-5). The DB stores timestamps with this offset.
  // Update this constant if the server timezone changes, instead of modifying each service.
  DB_UTC_OFFSET: -5
};

// Ticket State Names (as stored in database)
const TICKET_STATES = {
  DIAGNOSTICO: 'Diagnostico',
  CLASIFICACION: 'Clasificacion',
  RECEPCION: 'Recepcion',
  WAITING: 'En Espera',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
  CANCELED: 'Cancelado'
};

// State groups for time calculations
const STATE_GROUPS = {
  // States where ticket is waiting for customer response
  CUSTOMER_WAITING: ['En Espera'],

  // States excluded from HighTech time calculation (customer or finished states)
  HIGHTECH_EXCLUDED: ['En Espera', 'Resuelto', 'Cerrado', 'Cancelado'],

  // Final states (ticket is finished)
  FINAL_STATES: ['Resuelto', 'Cerrado', 'Cancelado']
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
    MAX_REQUESTS: 1000         // max requests per window (increased for dev)
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

// Company name lookup by bld_cliente_padre ID.
// TODO: Move to database table when DB schema allows it.
const EMPRESA_NAMES = {
  '1':  'Policía Nacional',
  '2':  'Universidad Nacional',
  '3':  'Coljuegos',
  '4':  'Alcaldía de Cali',
  '5':  'Banco Interamericano de Desarrollo',
  '6':  'Blend360',
  '7':  'BTG',
  '8':  'Cámara de Comercio de Cali',
  '9':  'Consejo Superior de la Judicatura',
  '10': 'DIAN',
  '11': 'Fiduagraria',
  '12': 'Financiera Desarrollo Nacional',
  '13': 'Fondo Adaptación',
  '14': 'ICFES',
  '15': 'Justicia Penal Militar y Policial',
  '16': 'Metro de Medellín',
  '17': 'MinTIC',
  '18': 'Sanidad',
  '19': 'Secretaría Distrital del Hábitat',
  '20': 'Superintendencia de Servicios',
  '21': 'Superintendencia de Sociedades',
  '22': 'Unidad Administrativa Especial de Catastro Distrital',
  '23': 'Universidad de Caldas',
  '24': 'Universidad del Bosque',
  '25': 'Instituto Geográfico Militar',
  '26': 'Progresión'
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
  EMPRESA_NAMES,
  API,
  PAGINATION,
  EXCEL,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};
