const fs = require('fs');
const path = require('path');
const moment = require('moment');
const parquet = require('parquetjs-lite');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SLAService = require('../services/slaService');
const logger = require('../utils/logger');

// AWS SDK (optional for S3)
let AWS;
let s3;
try {
  AWS = require('aws-sdk');
  s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
} catch (e) {
  logger.info('AWS SDK not available - using local storage only');
}

// S3 prefix base (matches Glue Crawler target)
const S3_PREFIX = process.env.AWS_S3_PREFIX || 'sla-data';

async function writeParquetFile(schema, rows, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const writer = await parquet.ParquetWriter.openFile(schema, filePath);
  for (const row of rows) {
    await writer.appendRow(row);
  }
  await writer.close();
}

/**
 * Upload a file to S3 with the correct structure for Glue:
 *   s3://bucket/<prefix>/<tableName>/data.parquet          (latest snapshot)
 *   s3://bucket/<prefix>-history/<tableName>/year=YYYY/month=MM/day=DD/data.parquet  (historical)
 */
async function uploadFileToS3(localPath, tableName, timestamp) {
  const body = fs.readFileSync(localPath);
  const locations = {};

  // 1) Latest snapshot — Glue Crawler points here
  const latestKey = `${S3_PREFIX}/${tableName}/data.parquet`;
  await s3.putObject({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: latestKey,
    Body: body,
    ContentType: 'application/octet-stream'
  }).promise();
  locations.latest = `s3://${process.env.AWS_S3_BUCKET}/${latestKey}`;

  // 2) Historical archive (Hive-style partitions for optional Athena queries)
  const year = moment().format('YYYY');
  const month = moment().format('MM');
  const day = moment().format('DD');
  const historyKey = `${S3_PREFIX}-history/${tableName}/year=${year}/month=${month}/day=${day}/data.parquet`;
  await s3.putObject({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: historyKey,
    Body: body,
    ContentType: 'application/octet-stream'
  }).promise();
  locations.history = `s3://${process.env.AWS_S3_BUCKET}/${historyKey}`;

  return locations;
}

async function exportSLAToQuickSight() {
  const startTime = Date.now();

  try {
    console.log('\n==============================================');
    console.log('CRON: SLA export to Parquet');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('==============================================\n');

    // 1) Extract data
    console.log('1) Extracting data...');
    const [tickets, metrics] = await Promise.all([
      SLAService.getTicketsWithSLA({ calendarType: 'laboral' }),
      SLAService.getSLAMetrics({ calendarType: 'laboral' })
    ]);

    console.log(`   Tickets: ${tickets.length}`);
    console.log(`   FR compliance: ${metrics.first_response.compliance_rate}%`);
    console.log(`   Resolution compliance: ${metrics.resolution.compliance_rate}%\n`);

    // 2) Build timelines
    console.log('2) Building timelines...');
    const ticketTimeline = await SLAService.buildTicketTimelines(tickets, 'laboral');
    console.log(`   Timeline rows: ${ticketTimeline.length}\n`);

    // 3) Transform data
    console.log('3) Transforming data...');
    const flatTickets = tickets.map(t => ({
      ticket_id: t.id,
      ticket_number: t.ticket_number,
      title: t.title,
      type: t.type,
      state: t.state_name,
      priority: t.priority_name,
      organization: t.organization_name,
      empresa: t.empresa,
      owner: t.owner_name,
      customer: t.customer_name,
      created_at: t.created_at,
      updated_at: t.updated_at,
      close_at: t.close_at,
      fase: t.bld_ticket_fase,
      responsable: t.bld_responsable,
      prioridad_cliente: t.bld_prority_customer,
      hightech_time_minutes: t.hightech_time_minutes,
      client_time_minutes: t.client_time_minutes,
      first_response_time_minutes: t.first_response_time_minutes,
      hightech_time_formatted: t.hightech_time_formatted,
      client_time_formatted: t.client_time_formatted,
      sla_first_response_target_minutes: t.sla_config.firstResponse,
      sla_resolution_target_minutes: t.sla_config.resolution,
      first_response_sla_met: t.first_response_sla_met,
      resolution_sla_met: t.resolution_sla_met,
      year_month: moment(t.created_at).format('YYYY-MM'),
      year: moment(t.created_at).format('YYYY'),
      month: moment(t.created_at).format('MM'),
      quarter: 'Q' + moment(t.created_at).quarter(),
      day_of_week: moment(t.created_at).format('dddd'),
      is_closed: !!t.close_at
    }));

    const summary = {
      total_tickets: metrics.total_tickets,
      closed_tickets: metrics.closed_tickets,
      open_tickets: metrics.open_tickets,
      first_response_met: metrics.first_response.met,
      first_response_breached: metrics.first_response.breached,
      first_response_compliance_rate: parseFloat(metrics.first_response.compliance_rate),
      first_response_avg_minutes: parseFloat(metrics.first_response.avg_time_minutes),
      resolution_met: metrics.resolution.met,
      resolution_breached: metrics.resolution.breached,
      resolution_compliance_rate: parseFloat(metrics.resolution.compliance_rate),
      resolution_avg_minutes: parseFloat(metrics.resolution.avg_time_minutes)
    };

    const byAgent = Object.entries(metrics.by_agent).map(([name, data]) => ({
      agent_name: name,
      total_tickets: data.total,
      closed_tickets: data.closed,
      first_response_met: data.first_response_met,
      first_response_breached: data.first_response_breached,
      resolution_met: data.resolution_met,
      resolution_breached: data.resolution_breached,
      first_response_compliance_rate: data.total > 0
        ? parseFloat(((data.first_response_met / data.total) * 100).toFixed(2))
        : 0,
      resolution_compliance_rate: data.total > 0
        ? parseFloat(((data.resolution_met / data.total) * 100).toFixed(2))
        : 0
    }));

    const byOrganization = Object.entries(metrics.by_organization).map(([name, data]) => ({
      organization_name: name,
      total_tickets: data.total,
      closed_tickets: data.closed,
      first_response_met: data.first_response_met,
      first_response_breached: data.first_response_breached,
      resolution_met: data.resolution_met,
      resolution_breached: data.resolution_breached,
      first_response_compliance_rate: data.total > 0
        ? parseFloat(((data.first_response_met / data.total) * 100).toFixed(2))
        : 0,
      resolution_compliance_rate: data.total > 0
        ? parseFloat(((data.resolution_met / data.total) * 100).toFixed(2))
        : 0
    }));

    const byType = Object.entries(metrics.by_type).map(([name, data]) => ({
      type_name: name,
      total_tickets: data.total,
      closed_tickets: data.closed,
      open_tickets: data.open
    }));

    const metadata = [{
      exported_at: new Date().toISOString(),
      calendar_type: 'laboral',
      total_records: flatTickets.length,
      version: '1.0'
    }];

    console.log('   Data transformed\n');

    // 4) Write Parquet files
    console.log('4) Writing Parquet files...');
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const dateFolder = moment().format('YYYY/MM/DD');
    const baseDir = path.join(__dirname, '../../exports/sla-data', dateFolder);

    const fileMap = {
      tickets: path.join(baseDir, `tickets_${timestamp}.parquet`),
      ticket_timeline: path.join(baseDir, `ticket_timeline_${timestamp}.parquet`),
      summary: path.join(baseDir, `summary_${timestamp}.parquet`),
      by_agent: path.join(baseDir, `by_agent_${timestamp}.parquet`),
      by_organization: path.join(baseDir, `by_organization_${timestamp}.parquet`),
      by_type: path.join(baseDir, `by_type_${timestamp}.parquet`),
      metadata: path.join(baseDir, `metadata_${timestamp}.parquet`)
    };

    const ticketsSchema = new parquet.ParquetSchema({
      ticket_id: { type: 'INT64' },
      ticket_number: { type: 'UTF8', optional: true },
      title: { type: 'UTF8', optional: true },
      type: { type: 'UTF8', optional: true },
      state: { type: 'UTF8', optional: true },
      priority: { type: 'UTF8', optional: true },
      organization: { type: 'UTF8', optional: true },
      empresa: { type: 'UTF8', optional: true },
      owner: { type: 'UTF8', optional: true },
      customer: { type: 'UTF8', optional: true },
      created_at: { type: 'UTF8', optional: true },
      updated_at: { type: 'UTF8', optional: true },
      close_at: { type: 'UTF8', optional: true },
      fase: { type: 'UTF8', optional: true },
      responsable: { type: 'UTF8', optional: true },
      prioridad_cliente: { type: 'UTF8', optional: true },
      hightech_time_minutes: { type: 'DOUBLE', optional: true },
      client_time_minutes: { type: 'DOUBLE', optional: true },
      first_response_time_minutes: { type: 'DOUBLE', optional: true },
      hightech_time_formatted: { type: 'UTF8', optional: true },
      client_time_formatted: { type: 'UTF8', optional: true },
      sla_first_response_target_minutes: { type: 'INT32', optional: true },
      sla_resolution_target_minutes: { type: 'INT32', optional: true },
      first_response_sla_met: { type: 'BOOLEAN', optional: true },
      resolution_sla_met: { type: 'BOOLEAN', optional: true },
      year_month: { type: 'UTF8', optional: true },
      year: { type: 'UTF8', optional: true },
      month: { type: 'UTF8', optional: true },
      quarter: { type: 'UTF8', optional: true },
      day_of_week: { type: 'UTF8', optional: true },
      is_closed: { type: 'BOOLEAN', optional: true }
    });

    const timelineSchema = new parquet.ParquetSchema({
      ticket_number: { type: 'UTF8', optional: true },
      title: { type: 'UTF8', optional: true },
      organization: { type: 'UTF8', optional: true },
      empresa: { type: 'UTF8', optional: true },
      state: { type: 'UTF8', optional: true },
      owner: { type: 'UTF8', optional: true },
      start_time: { type: 'UTF8', optional: true },
      end_time: { type: 'UTF8', optional: true },
      duration_minutes: { type: 'INT32', optional: true },
      period_type: { type: 'UTF8', optional: true },
      step: { type: 'INT32', optional: true }
    });

    const summarySchema = new parquet.ParquetSchema({
      total_tickets: { type: 'INT32' },
      closed_tickets: { type: 'INT32' },
      open_tickets: { type: 'INT32' },
      first_response_met: { type: 'INT32' },
      first_response_breached: { type: 'INT32' },
      first_response_compliance_rate: { type: 'DOUBLE' },
      first_response_avg_minutes: { type: 'DOUBLE' },
      resolution_met: { type: 'INT32' },
      resolution_breached: { type: 'INT32' },
      resolution_compliance_rate: { type: 'DOUBLE' },
      resolution_avg_minutes: { type: 'DOUBLE' }
    });

    const byAgentSchema = new parquet.ParquetSchema({
      agent_name: { type: 'UTF8', optional: true },
      total_tickets: { type: 'INT32' },
      closed_tickets: { type: 'INT32' },
      first_response_met: { type: 'INT32' },
      first_response_breached: { type: 'INT32' },
      resolution_met: { type: 'INT32' },
      resolution_breached: { type: 'INT32' },
      first_response_compliance_rate: { type: 'DOUBLE' },
      resolution_compliance_rate: { type: 'DOUBLE' }
    });

    const byOrganizationSchema = new parquet.ParquetSchema({
      organization_name: { type: 'UTF8', optional: true },
      total_tickets: { type: 'INT32' },
      closed_tickets: { type: 'INT32' },
      first_response_met: { type: 'INT32' },
      first_response_breached: { type: 'INT32' },
      resolution_met: { type: 'INT32' },
      resolution_breached: { type: 'INT32' },
      first_response_compliance_rate: { type: 'DOUBLE' },
      resolution_compliance_rate: { type: 'DOUBLE' }
    });

    const byTypeSchema = new parquet.ParquetSchema({
      type_name: { type: 'UTF8', optional: true },
      total_tickets: { type: 'INT32' },
      closed_tickets: { type: 'INT32' },
      open_tickets: { type: 'INT32' }
    });

    const metadataSchema = new parquet.ParquetSchema({
      exported_at: { type: 'UTF8' },
      calendar_type: { type: 'UTF8' },
      total_records: { type: 'INT32' },
      version: { type: 'UTF8' }
    });

    await writeParquetFile(ticketsSchema, flatTickets, fileMap.tickets);
    await writeParquetFile(timelineSchema, ticketTimeline, fileMap.ticket_timeline);
    await writeParquetFile(summarySchema, [summary], fileMap.summary);
    await writeParquetFile(byAgentSchema, byAgent, fileMap.by_agent);
    await writeParquetFile(byOrganizationSchema, byOrganization, fileMap.by_organization);
    await writeParquetFile(byTypeSchema, byType, fileMap.by_type);
    await writeParquetFile(metadataSchema, metadata, fileMap.metadata);

    console.log('   Parquet files saved locally');

    // 5) Upload to S3 with Glue-compatible structure
    //    Latest:  s3://bucket/sla-data/<table>/data.parquet  ← Glue Crawler reads this
    //    History: s3://bucket/sla-data-history/<table>/year=YYYY/month=MM/day=DD/data.parquet
    let s3Locations = {};
    if (s3 && process.env.AWS_S3_BUCKET) {
      console.log('5) Uploading to S3 (Glue-compatible structure)...');

      const tables = [
        { name: 'tickets', localPath: fileMap.tickets },
        { name: 'ticket_timeline', localPath: fileMap.ticket_timeline },
        { name: 'summary', localPath: fileMap.summary },
        { name: 'by_agent', localPath: fileMap.by_agent },
        { name: 'by_organization', localPath: fileMap.by_organization },
        { name: 'by_type', localPath: fileMap.by_type },
        { name: 'metadata', localPath: fileMap.metadata }
      ];

      for (const table of tables) {
        s3Locations[table.name] = await uploadFileToS3(table.localPath, table.name, timestamp);
        console.log(`   ✓ ${table.name} → ${s3Locations[table.name].latest}`);
      }

      console.log('   All files uploaded to S3\n');

      // 6) Trigger Glue Crawler to update Data Catalog (optional)
      if (process.env.AWS_GLUE_CRAWLER_NAME) {
        try {
          const glue = new AWS.Glue({ region: process.env.AWS_REGION || 'us-east-1' });
          await glue.startCrawler({ Name: process.env.AWS_GLUE_CRAWLER_NAME }).promise();
          console.log(`   ✓ Glue Crawler "${process.env.AWS_GLUE_CRAWLER_NAME}" triggered`);
        } catch (glueErr) {
          if (glueErr.code === 'CrawlerRunningException') {
            console.log('   ⚠ Glue Crawler already running, skipping trigger');
          } else {
            console.error('   ⚠ Could not trigger Glue Crawler:', glueErr.message);
          }
        }
      }
    } else {
      console.log('5) S3 upload skipped (AWS_S3_BUCKET not configured)\n');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n==============================================');
    console.log('EXPORT COMPLETED');
    console.log(`Records: ${flatTickets.length}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Local path: ${baseDir}`);
    if (Object.keys(s3Locations).length > 0) {
      console.log(`S3 bucket: ${process.env.AWS_S3_BUCKET}`);
      console.log(`S3 prefix: ${S3_PREFIX}/`);
    }
    console.log('==============================================\n');

    logger.info('SLA export completed', {
      records: flatTickets.length,
      duration,
      localPath: baseDir,
      s3Locations
    });

    return {
      success: true,
      localPath: baseDir,
      s3Locations,
      records: flatTickets.length
    };
  } catch (error) {
    console.error('\nERROR IN CRON:\n');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    logger.error('Error in SLA export', {
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}

module.exports = { exportSLAToQuickSight };
