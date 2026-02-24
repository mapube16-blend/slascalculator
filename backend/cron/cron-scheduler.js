const cron = require('node-cron');
const { exportSLAToQuickSight } = require('./sla-exporter-cron');
const logger = require('../utils/logger');

/**
 * Registrar todos los CRON jobs
 * Se ejecuta al iniciar el servidor
 */
function initializeCronJobs() {
  console.log('\n🔧 Inicializando CRON jobs...\n');

  // CRON: Exportar SLA cada 30 minutos
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ CRON TRIGGER: Hora de exportar SLA');
    try {
      await exportSLAToQuickSight();
    } catch (error) {
      console.error('❌ Error en CRON:', error.message);
      logger.error('Error en CRON', error);
    }
  }, {
    timezone: 'America/Bogota'
  });

  console.log('✓ CRON programado: Exportacion SLA cada 30 minutos');
  console.log('✓ Zona horaria: America/Bogota\n');
}

module.exports = { initializeCronJobs };
