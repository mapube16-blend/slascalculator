const cron = require('node-cron');
const { exportSLAToQuickSight } = require('./sla-exporter-cron');
const logger = require('../utils/logger');

/**
 * Registrar todos los CRON jobs
 * Se ejecuta al iniciar el servidor
 */
function initializeCronJobs() {
  // CRON desactivado temporalmente para evitar acumulación de archivos locales
  // (AWS_S3_BUCKET no configurado → los Parquet llenan el disco)
  // Para reactivar: descomentar el bloque cron.schedule de abajo
  console.log('CRON jobs desactivados (exportación Parquet pausada).');

  // console.log('\n🔧 Inicializando CRON jobs...\n');
  // cron.schedule('*/30 * * * *', async () => {
  //   console.log('⏰ CRON TRIGGER: Hora de exportar SLA');
  //   try {
  //     await exportSLAToQuickSight();
  //   } catch (error) {
  //     console.error('❌ Error en CRON:', error.message);
  //     logger.error('Error en CRON', error);
  //   }
  // }, {
  //   timezone: 'America/Bogota'
  // });
  // console.log('✓ CRON programado: Exportacion SLA cada 30 minutos');
  // console.log('✓ Zona horaria: America/Bogota\n');
}

module.exports = { initializeCronJobs };
