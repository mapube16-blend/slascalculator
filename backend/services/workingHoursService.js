const moment = require('moment');
require('moment-business-days');

/**
 * Servicio para calcular tiempo laboral según diferentes calendarios
 * Soporta:
 * - Laboral: Lunes-Viernes, 8:00 AM - 5:00 PM (9 horas)
 * - 24/7: Todos los días, todo el tiempo (sin exclusiones)
 * - Extendido: Lunes-Domingo, 8:00 AM - 10:00 PM (14 horas)
 */
class WorkingHoursService {
  
  constructor() {
    // Configurar días festivos de Colombia (para usar en calendarios que los requieran)
    this.setupColombianHolidays();
  }

  /**
   * Configurar días festivos de Colombia
   */
  setupColombianHolidays() {
    const year = new Date().getFullYear();
    
    // Feriados fijos de Colombia
    const fixedHolidays = [
      moment(`${year}-01-01`), // Año Nuevo
      moment(`${year}-01-08`), // Reyes Magos
      moment(`${year}-03-25`), // San José
      moment(`${year}-05-01`), // Día del Trabajo
      moment(`${year}-07-01`), // San Pedro y San Pablo
      moment(`${year}-07-20`), // Independencia
      moment(`${year}-08-07`), // Batalla de Boyacá
      moment(`${year}-08-15`), // Asunción
      moment(`${year}-11-01`), // Todos los Santos
      moment(`${year}-12-08`), // Inmaculada Concepción
      moment(`${year}-12-25`) // Navidad
    ];

    // Feriados móviles 2025-2026
    if (year === 2025) {
      fixedHolidays.push(moment('2025-04-18')); // Viernes Santo 2025
      fixedHolidays.push(moment('2025-05-12')); // Corpus Christi 2025
      fixedHolidays.push(moment('2025-05-19')); // Sagrado Corazón 2025
    }
    if (year === 2026) {
      fixedHolidays.push(moment('2026-04-03')); // Viernes Santo 2026
      fixedHolidays.push(moment('2026-05-28')); // Corpus Christi 2026
      fixedHolidays.push(moment('2026-06-04')); // Sagrado Corazón 2026
    }

    // Convertir a array de strings
    this.holidayDates = new Set(fixedHolidays.map(d => d.format('YYYY-MM-DD')));
  }

  /**
   * Seleccionar tipo de calendario y ajustar parámetros
   * @param {string} calendarType - 'laboral', '24-7', 'extended'
   */
  getCalendarConfig(calendarType) {
    const type = calendarType || 'laboral';
    const config = {
      type: type,
      holidayDates: this.holidayDates
    };
    
    switch(type) {
      case 'laboral':
        config.workStartHour = 8;      // 8 AM
        config.workEndHour = 17;       // 5 PM
        config.hoursPerDay = 9;        // 9 horas
        config.workingDays = [1, 2, 3, 4, 5]; // Lunes a Viernes
        config.excludeHolidays = true;
        break;
      
      case '24-7':
      case '24x7':
        config.workStartHour = 0;      // 12 AM
        config.workEndHour = 24;       // 11:59 PM
        config.hoursPerDay = 24;       // 24 horas
        config.workingDays = [0, 1, 2, 3, 4, 5, 6]; // Todos los días
        config.excludeHolidays = false; // No excluir festivos
        break;
      
      case 'extended':
        config.workStartHour = 8;      // 8 AM
        config.workEndHour = 22;       // 10 PM
        config.hoursPerDay = 14;       // 14 horas
        config.workingDays = [0, 1, 2, 3, 4, 5, 6]; // Todos los días (incluyendo fin de semana)
        config.excludeHolidays = false; // No excluir festivos
        break;
      
      default:
        return this.getCalendarConfig('laboral');
    }
    
    return config;
  }

  /**
   * Calcular minutos laborales entre dos fechas
   * @param {Date|string} startDate - Fecha de inicio
   * @param {Date|string} endDate - Fecha de fin
   * @param {string} calendarType - Tipo de calendario ('laboral', '24-7', 'extended')
   * @returns {number} Minutos laborales
   */
calculateWorkingMinutes(startDate, endDate, calendarType = 'laboral') {
    if (!startDate || !endDate) {
      return 0;
    }

    const config = this.getCalendarConfig(calendarType);

    // 1. Tomamos la fecha
    // 2. Restamos 5 horas para corregir el error de guardado de la DB
    // 3. Aplicamos utcOffset(-5) para ponerlo en hora colombiana
    const start = moment(startDate).subtract(5, 'hours').utcOffset(-5);
    const end = moment(endDate).subtract(5, 'hours').utcOffset(-5);

    if (end.isBefore(start)) {
      return 0;
    }

    // Si es la misma fecha, calcular solo horas dentro del horario laboral
    if (start.format('YYYY-MM-DD') === end.format('YYYY-MM-DD')) {
      return this.calculateMinutesInSameDay(start, end, config);
    }

    // Caso contrario, sumar días completos + fracciones de primer y último día
    let totalMinutes = 0;

    // Minutos restantes del primer día
    const firstDayMinutes = this.calculateMinutesUntilEndOfDay(start, config);
    totalMinutes += firstDayMinutes;

    // Días completos laborales (excluyendo primer y último día)
    let currentDay = moment(start).add(1, 'day').startOf('day');
    const endDay = moment(end).startOf('day');

    while (currentDay.isBefore(endDay)) {
      if (this.isWorkingDay(currentDay, config)) {
        totalMinutes += config.hoursPerDay * 60;
      }
      currentDay.add(1, 'day');
    }

    // Minutos desde inicio del día hasta la hora final del último día
    const lastDayMinutes = this.calculateMinutesFromStartOfDay(end, config);
    totalMinutes += lastDayMinutes;

    return Math.round(totalMinutes);
  }
  /**
   * Calcular minutos laborales en el mismo día
   */
  calculateMinutesInSameDay(startTime, endTime, config) {
    const start = moment(startTime);
    const end = moment(endTime);

    // Si no es día laboral, retornar 0
    if (!this.isWorkingDay(start, config)) {
      return 0;
    }

    // Ajustar horas a rango laboral
    let startHour = start.hour();
    let endHour = end.hour();
    let startMinute = start.minute();
    let endMinute = end.minute();

    // Si comienza antes del horario laboral
    if (startHour < config.workStartHour) {
      startHour = config.workStartHour;
      startMinute = 0;
    }

    // Si termina después del horario laboral
    if (endHour > config.workEndHour || (endHour === config.workEndHour && endMinute > 0)) {
      endHour = config.workEndHour;
      endMinute = 0;
    }

    // Calcular minutos
    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;

    return Math.max(0, endInMinutes - startInMinutes);
  }

  /**
   * Calcular minutos desde inicio del día laboral hasta cierta hora
   */
  calculateMinutesFromStartOfDay(time, config) {
    const m = moment(time);

    if (!this.isWorkingDay(m, config)) {
      return 0;
    }

    let hour = m.hour();
    let minute = m.minute();

    // Si es antes del inicio del horario laboral
    if (hour < config.workStartHour) {
      return 0;
    }

    // Si es después del final del horario laboral
    if (hour >= config.workEndHour) {
      return config.hoursPerDay * 60;
    }

    // Está dentro del horario laboral
    return (hour - config.workStartHour) * 60 + minute;
  }

  /**
   * Calcular minutos desde cierta hora hasta fin del día laboral
   */
  calculateMinutesUntilEndOfDay(time, config) {
    const m = moment(time);

    if (!this.isWorkingDay(m, config)) {
      return 0;
    }

    let hour = m.hour();
    let minute = m.minute();

    // Si es antes del inicio del horario laboral
    if (hour < config.workStartHour) {
      return config.hoursPerDay * 60;
    }

    // Si es después del final del horario laboral
    if (hour >= config.workEndHour) {
      return 0;
    }

    // Está dentro del horario laboral
    return (config.workEndHour - hour) * 60 - minute;
  }

  /**
   * Verificar si es día laboral según el calendario actual
   */
  isWorkingDay(date, config) {
    const m = moment(date);
    
    // Verificar si el día está en la lista de días laborales
    const dayOfWeek = m.day(); // 0 = Domingo, 1 = Lunes, etc.
    
    if (!config.workingDays.includes(dayOfWeek)) {
      return false;
    }

    // Verificar si es festivo (solo si excluimos festivos)
    if (config.excludeHolidays && config.holidayDates.has(m.format('YYYY-MM-DD'))) {
      return false;
    }

    return true;
  }

  /**
   * Convertir minutos a formato legible
   * @param {number} minutes - Minutos
   * @param {string} calendarType - Tipo de calendario para formateo correcto
   * @returns {string} Formato: "X minutos"
   */
  formatMinutes(minutes, calendarType = 'laboral') {
    if (!minutes || minutes === 0) return '0 minutos';

    const mins = Math.round(minutes);
    return `${mins} minutos`;
  }

  /**
   * Obtener información sobre el calendario actual
   */
  getCalendarInfo() {
    return this.getCalendarConfig('laboral');
  }
}

module.exports = new WorkingHoursService();
