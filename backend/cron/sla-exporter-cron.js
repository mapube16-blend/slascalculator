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
    // 1) Fetch data
    console.log('1) Fetching data from SLAService...');
    const tickets = await SLAService.getTicketsWithSLA();
    console.log(`   ${tickets.length} tickets found\n`);

    // 2) Transform data (tickets)
    console.log('2) Transforming data (tickets)...');
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
    console.log('   Data transformed (tickets)\n');

    // 2b) Transform data (ticket_timelines)
    console.log('2b) Generating ticket timelines...');
    const timelines = await SLAService.buildTicketTimelines(tickets);
    console.log(`   ${timelines.length} timeline rows generated\n`);

    // 3) Write Parquet files
    console.log('3) Writing Parquet files...');
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const dateFolder = moment().format('YYYY/MM/DD');
    const baseDir = path.join(__dirname, '../../exports/sla-data', dateFolder);
    const ticketsPath = path.join(baseDir, `tickets_${timestamp}.parquet`);
    const timelinesPath = path.join(baseDir, `ticket_timelines_${timestamp}.parquet`);

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
    await writeParquetFile(ticketsSchema, flatTickets, ticketsPath);
    console.log('   Parquet file (tickets) saved locally');

    // ticket_timelines schema
    const timelinesSchema = new parquet.ParquetSchema({
      ticket_number: { type: 'UTF8' },
      title: { type: 'UTF8', optional: true },
      organization: { type: 'UTF8', optional: true },
      empresa: { type: 'UTF8', optional: true },
      state: { type: 'UTF8', optional: true },
      owner: { type: 'UTF8', optional: true },
      start_time: { type: 'UTF8', optional: true },
      end_time: { type: 'UTF8', optional: true },
      duration_minutes: { type: 'DOUBLE', optional: true },
      period_type: { type: 'UTF8', optional: true },
      step: { type: 'INT32', optional: true }
    });
    await writeParquetFile(timelinesSchema, timelines, timelinesPath);
    console.log('   Parquet file (ticket_timelines) saved locally');

    // 3b) Build consolidated tickets_full (timeline rows + ticket metadata)
    console.log('3b) Building consolidated tickets_full...');
    const ticketsByNumber = new Map(tickets.map(t => [String(t.ticket_number), t]));
    const ticketsFull = timelines.map(row => {
      const t = ticketsByNumber.get(String(row.ticket_number)) || {};
      return {
        ticket_id: t.id || null,
        ticket_number: row.ticket_number,
        title: row.title || t.title || null,
        type: t.type || null,
        state: row.state || null,
        priority: t.priority_name || null,
        organization: row.organization || t.organization_name || null,
        empresa: row.empresa || t.empresa || null,
        owner: row.owner || t.owner_name || null,
        customer: t.customer_name || null,
        created_at: t.created_at || null,
        updated_at: t.updated_at || null,
        close_at: t.close_at || null,
        fase: t.bld_ticket_fase || null,
        responsable: t.bld_responsable || null,
        prioridad_cliente: t.bld_prority_customer || null,
        start_time: row.start_time || null,
        end_time: row.end_time || null,
        duration_minutes: row.duration_minutes || null,
        period_type: row.period_type || null,
        step: row.step || null,
        sla_first_response_target_minutes: t.sla_config ? t.sla_config.firstResponse : null,
        sla_resolution_target_minutes: t.sla_config ? t.sla_config.resolution : null,
        first_response_sla_met: t.first_response_sla_met === undefined ? null : t.first_response_sla_met,
        resolution_sla_met: t.resolution_sla_met === undefined ? null : t.resolution_sla_met
      };
    });

    const ticketsFullPath = path.join(baseDir, `tickets_full_${timestamp}.parquet`);
    const ticketsFullSchema = new parquet.ParquetSchema({
      ticket_id: { type: 'INT64', optional: true },
      ticket_number: { type: 'UTF8' },
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
      start_time: { type: 'UTF8', optional: true },
      end_time: { type: 'UTF8', optional: true },
      duration_minutes: { type: 'DOUBLE', optional: true },
      period_type: { type: 'UTF8', optional: true },
      step: { type: 'INT32', optional: true },
      sla_first_response_target_minutes: { type: 'INT32', optional: true },
      sla_resolution_target_minutes: { type: 'INT32', optional: true },
      first_response_sla_met: { type: 'BOOLEAN', optional: true },
      resolution_sla_met: { type: 'BOOLEAN', optional: true }
    });

    await writeParquetFile(ticketsFullSchema, ticketsFull, ticketsFullPath);
    console.log('   Parquet file (tickets_full) saved locally');

    // 4) Upload to S3 with Glue-compatible structure
    let s3Locations = {};
    if (s3 && process.env.AWS_S3_BUCKET) {
      console.log('4) Uploading to S3 (Glue-compatible structure)...');
      s3Locations['tickets'] = await uploadFileToS3(ticketsPath, 'tickets', timestamp);
      s3Locations['ticket_timelines'] = await uploadFileToS3(timelinesPath, 'ticket_timelines', timestamp);
      // Upload consolidated table
      s3Locations['tickets_full'] = await uploadFileToS3(ticketsFullPath, 'tickets_full', timestamp);
      console.log(`   ✓ tickets → ${s3Locations['tickets'].latest}`);
      console.log(`   ✓ ticket_timelines → ${s3Locations['ticket_timelines'].latest}`);
      console.log('   Files uploaded to S3\n');

      // 5) Trigger Glue Crawler to update Data Catalog (optional)
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
      console.log('4) S3 upload skipped (AWS_S3_BUCKET not configured)\n');
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
