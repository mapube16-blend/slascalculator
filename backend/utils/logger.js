/**
 * Simple Logger Service
 * Provides structured logging with different levels
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'INFO';
  }

  /**
   * Format log message with timestamp and context
   */
  _format(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(context).length > 0
      ? JSON.stringify(context)
      : '';

    return `[${timestamp}] [${level}] ${message} ${contextStr}`;
  }

  /**
   * Log error message
   */
  error(message, error = null, context = {}) {
    const logContext = { ...context };

    if (error instanceof Error) {
      logContext.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    } else if (error) {
      logContext.error = error;
    }

    console.error(this._format(LOG_LEVELS.ERROR, message, logContext));
  }

  /**
   * Log warning message
   */
  warn(message, context = {}) {
    console.warn(this._format(LOG_LEVELS.WARN, message, context));
  }

  /**
   * Log info message
   */
  info(message, context = {}) {
    console.log(this._format(LOG_LEVELS.INFO, message, context));
  }

  /**
   * Log debug message (only in development)
   */
  debug(message, context = {}) {
    if (process.env.NODE_ENV === 'development' || this.level === 'DEBUG') {
      console.log(this._format(LOG_LEVELS.DEBUG, message, context));
    }
  }

  /**
   * Log database query (for debugging)
   */
  query(query, params = [], duration = null) {
    if (this.level === 'DEBUG') {
      this.debug('Database Query', {
        query: query.substring(0, 200), // Limit query length
        params,
        duration: duration ? `${duration}ms` : null
      });
    }
  }

  /**
   * Log API request
   */
  request(req, duration = null) {
    this.info('API Request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      duration: duration ? `${duration}ms` : null
    });
  }
}

// Export singleton instance
module.exports = new Logger();
