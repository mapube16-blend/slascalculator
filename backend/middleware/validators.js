const { body, query, param, validationResult } = require('express-validator');
const { CALENDAR_TYPES, ERROR_MESSAGES } = require('../config/constants');

/**
 * Middleware to handle validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.VALIDATION_ERROR,
      details: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for date ranges in filters
 */
const dateRangeValidation = [
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate debe ser una fecha válida en formato ISO 8601'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate debe ser una fecha válida en formato ISO 8601'),
  body('startDate').custom((value, { req }) => {
    if (value && req.body.endDate) {
      const start = new Date(value);
      const end = new Date(req.body.endDate);
      if (start > end) {
        throw new Error('startDate debe ser anterior a endDate');
      }
    }
    return true;
  })
];

/**
 * Validation rules for calendar type
 */
const calendarTypeValidation = [
  body('calendarType')
    .optional()
    .isIn([CALENDAR_TYPES.LABORAL, CALENDAR_TYPES.CONTINUO, CALENDAR_TYPES.FULL])
    .withMessage(`calendarType debe ser uno de: ${Object.values(CALENDAR_TYPES).join(', ')}`)
];

/**
 * Validation rules for filters (POST /tickets, /metrics, etc.)
 */
const filtersValidation = [
  ...dateRangeValidation,
  ...calendarTypeValidation,
  body('organizationId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('organizationId debe ser un número entero positivo'),
  body('ownerId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ownerId debe ser un número entero positivo'),
  body('state')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('state debe ser una cadena no vacía'),
  body('ticketNumber')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('ticketNumber debe ser una cadena no vacía'),
  body('type')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('type debe ser una cadena no vacía')
];

/**
 * Validation rules for ticket history endpoint
 */
const ticketHistoryValidation = [
  param('number')
    .notEmpty()
    .withMessage('El número de ticket es requerido')
    .isString()
    .trim(),
  query('calendarType')
    .optional()
    .isIn([CALENDAR_TYPES.LABORAL, CALENDAR_TYPES.CONTINUO, CALENDAR_TYPES.FULL])
    .withMessage(`calendarType debe ser uno de: ${Object.values(CALENDAR_TYPES).join(', ')}`)
];

/**
 * Validation rules for generate report endpoint
 */
const generateReportValidation = [
  body('filters')
    .exists()
    .withMessage('filters es requerido')
    .isObject()
    .withMessage('filters debe ser un objeto'),
  body('charts')
    .optional()
    .isObject()
    .withMessage('charts debe ser un objeto')
];

/**
 * Validation rules for filtered report endpoint
 */
const generateFilteredReportValidation = [
  body('slaType')
    .exists()
    .withMessage('slaType es requerido')
    .isIn(['first_response', 'resolution'])
    .withMessage('slaType debe ser "first_response" o "resolution"'),
  body('slaStatus')
    .exists()
    .withMessage('slaStatus es requerido')
    .isIn(['met', 'not_met'])
    .withMessage('slaStatus debe ser "met" o "not_met"'),
  ...dateRangeValidation,
  ...calendarTypeValidation
];

/**
 * Validation rules for pagination
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page debe ser un número entero mayor a 0'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('pageSize debe estar entre 1 y 500')
];

module.exports = {
  validate,
  filtersValidation,
  ticketHistoryValidation,
  generateReportValidation,
  generateFilteredReportValidation,
  paginationValidation,
  dateRangeValidation,
  calendarTypeValidation
};
