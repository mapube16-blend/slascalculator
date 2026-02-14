/**
 * Utility Functions
 * Common helper functions used across the application
 */

const Utils = {
  /**
   * Format minutes to hours and minutes
   */
  formatMinutes(minutes) {
    if (!minutes || minutes === 0) return '0 min';

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  },

  /**
   * Format date to locale string
   */
  formatDate(date, includeTime = false) {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    if (includeTime) {
      return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return d.toLocaleDateString('es-MX');
  },

  /**
   * Format number with separators
   */
  formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('es-MX');
  },

  /**
   * Calculate percentage
   */
  calculatePercentage(value, total) {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  },

  /**
   * Download blob as file
   */
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Show loading indicator
   */
  showLoading(show = true) {
    const loader = AppState.elements.loadingIndicator;
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  },

  /**
   * Show error message
   */
  showError(message, duration = 5000) {
    const errorEl = AppState.elements.errorMessage;
    if (!errorEl) return;

    errorEl.textContent = message;
    errorEl.style.display = 'block';

    if (duration > 0) {
      setTimeout(() => {
        errorEl.style.display = 'none';
      }, duration);
    }
  },

  /**
   * Hide error message
   */
  hideError() {
    const errorEl = AppState.elements.errorMessage;
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  },

  /**
   * Get filters from form
   */
  getFiltersFromForm() {
    const elements = AppState.elements;

    return {
      startDate: elements.startDate?.value || null,
      endDate: elements.endDate?.value || null,
      organizationId: elements.projectSelect?.value || null,
      ownerId: elements.agentSelect?.value || null,
      state: elements.stateSelect?.value || null,
      type: elements.typeSelect?.value || null,
      calendarType: AppState.selectedCalendarType
    };
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Sort array of objects by field
   */
  sortBy(array, field, direction = 'asc') {
    return [...array].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      // Handle null/undefined
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  },

  /**
   * Calendar names for display
   */
  calendarNames: {
    'laboral': 'Horario Laboral (L-V, 8:30-13:30, 15:00-18:00)',
    'continuo': 'Horario Continuo (L-V, 8:30-18:00)',
    '24x7': '24/7 Permanente'
  }
};

// Export for use in other modules
window.Utils = Utils;
