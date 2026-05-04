import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { CronJob } from 'cron';
import pg from 'pg';
import { request, gql } from 'graphql-request';

const { Pool } = pg;
const CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || './openclaw.json';
const SOUL_PATH = process.env.OPENCLAW_SOUL_PATH || './SOUL.md';
const REDACTED = '[redacted]';

function redact(value) {
  if (!value) return value;
  return String(value)
    .replace(/sk-[A-Za-z0-9_-]+/g, REDACTED)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, `Bearer ${REDACTED}`)
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, REDACTED);
}

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

async function loadRuntime() {
  const [configRaw, soul] = await Promise.all([
    readFile(CONFIG_PATH, 'utf8'),
    readFile(SOUL_PATH, 'utf8')
  ]);
  const config = JSON.parse(configRaw);
  requireEnv('ANTHROPIC_API_KEY');
  requireEnv('LINEAR_API_TOKEN');
  requireEnv('NOTION_TOKEN');
  requireEnv('DATABASE_URL');
  if (!process.env.GITHUB_TOKEN && !process.env.GITHUB_APP_ID) {
    throw new Error('GITHUB_TOKEN or GitHub App credentials are required');
  }
  if (config.triggers.weeklyCompletedTicketScan.timezone !== 'Asia/Kolkata') {
    throw new Error('Approved schedule timezone must be Asia/Kolkata');
  }
  return { config, soul };
}

class Persistence {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  async query(sql, params) { return this.pool.query(sql, params); }
  async close() { await this.pool.end(); }
  async createRun(scheduledFor) {
    const result = await this.query(
      `INSERT INTO agent_runs (scheduled_for, started_at, status) VALUES ($1, now(), 'running') RETURNING id`,
      [scheduledFor]
    );
    return result.rows[0].id;
  }
  async log(runId, level, message, metadata = null, ticketId = null) {
    await this.query(
      `INSERT INTO run_logs (run_id, linear_ticket_record_id, level, message, metadata_json) VALUES ($1,$2,$3,$4,$5)`,
      [runId, ticketId, level, redact(message), metadata ? JSON.stringify(metadata) : null]
    );
    console.log(JSON.stringify({ level, runId, message: redact(message) }));
  }
  async finalizeRun(runId, status, counts, errorSummary = null) {
    await this.query(
      `UPDATE agent_runs SET completed_at=now(), status=$2, tickets_discovered=$3, tickets_processed=$4, tickets_skipped=$5, error_summary=$6 WHERE id=$1`,
      [runId, status, counts.discovered, counts.processed, counts.skipped, errorSummary ? redact(errorSummary) : null]
    );
  }
  async upsertTicket(issue) {
    const result = await this.query(
      `INSERT INTO linear_tickets (linear_ticket_id, linear_url, title, team_key, project_name, state, completed_at, processing_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
       ON CONFLICT (linear_ticket_id) DO UPDATE SET title=EXCLUDED.title, state=EXCLUDED.state
       RETURNING id, processing_status`,
      [issue.identifier, issue.url, issue.title, issue.team?.key || null, issue.project?.name || null, issue.state?.name || 'Done', issue.completedAt || null]
    );
    return result.rows[0];
  }
}

async function fetchCompletedLinearTickets(config) {
  const doneStateIds = config.linear.doneStateIds || [];
  if (!config.linear.scopeId || doneStateIds.length === 0) {
    throw new Error('linear.scopeId and linear.doneStateIds must be configured in openclaw.json');
  }
  const query = gql`
    query CompletedIssues($filter: IssueFilter, $first: Int!) {
      issues(filter: $filter, first: $first) {
        nodes {
          id identifier title url completedAt
          state { id name }
          team { key name }
          project { name }
        }
      }
    }`;
  const scopeType = config.linear.scopeType;
  const filter = { state: { id: { in: doneStateIds } } };
  if (scopeType === 'team') filter.team = { id: { eq: config.linear.scopeId } };
  if (scopeType === 'project') filter.project = { id: { eq: config.linear.scopeId } };
  const data = await request({
    url: 'https://api.linear.app/graphql',
    document: query,
    variables: { filter, first: config.agent.maxTicketsPerRun || 50 },
    requestHeaders: { Authorization: process.env.LINEAR_API_TOKEN }
  });
  return data.issues.nodes;
}

async function processTicket({ db, runId, ticket, record }) {
  await db.log(runId, 'info', `Processing ${ticket.identifier}: ${ticket.title}`, null, record.id);
  await db.query(
    `INSERT INTO ticket_processing (run_id, linear_ticket_record_id, status) VALUES ($1,$2,'needs_human_input')`,
    [runId, record.id]
  );
  await db.query(
    `UPDATE linear_tickets SET processing_status='needs_human_input' WHERE id=$1`,
    [record.id]
  );
  await db.log(
    runId,
    'warning',
    `Ticket ${ticket.identifier} discovered. Full Notion/GitHub implementation requires configured repository analysis and write permissions; marked needs_human_input until safe context is available.`,
    null,
    record.id
  );
  return 'needs_human_input';
}

async function runWorkflow(scheduledFor = new Date()) {
  const { config } = await loadRuntime();
  const db = new Persistence();
  const counts = { discovered: 0, processed: 0, skipped: 0 };
  let runId;
  try {
    runId = await db.createRun(scheduledFor);
    await db.log(runId, 'info', 'Linear-to-Mixpanel scheduled run started');
    const tickets = await fetchCompletedLinearTickets(config);
    counts.discovered = tickets.length;
    if (tickets.length === 0) {
      await db.log(runId, 'info', 'No completed Linear tickets found in configured scope');
      await db.finalizeRun(runId, 'completed', counts);
      return;
    }
    for (const ticket of tickets) {
      const record = await db.upsertTicket(ticket);
      if (['processed', 'no_event_needed'].includes(record.processing_status)) {
        counts.skipped += 1;
        await db.log(runId, 'info', `Skipping already processed ticket ${ticket.identifier}`, null, record.id);
        continue;
      }
      const status = await processTicket({ db, runId, ticket, record });
      if (status === 'processed' || status === 'no_event_needed') counts.processed += 1;
    }
    const finalStatus = counts.processed + counts.skipped === counts.discovered ? 'completed' : 'completed_with_errors';
    await db.finalizeRun(runId, finalStatus, counts, finalStatus === 'completed_with_errors' ? 'Some tickets require human input or configuration before safe instrumentation.' : null);
  } catch (error) {
    const message = redact(error.stack || error.message);
    console.error(message);
    if (runId) {
      await db.log(runId, 'error', message);
      await db.finalizeRun(runId, 'failed', counts, error.message);
    }
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

if (process.env.OPENCLAW_RUN_ONCE === 'true') {
  await runWorkflow(new Date());
} else {
  const { config } = await loadRuntime();
  const trigger = config.triggers.weeklyCompletedTicketScan;
  const job = new CronJob(trigger.cron, () => runWorkflow(new Date()), null, true, trigger.timezone);
  console.log(`Linear-to-Mixpanel Agent scheduled with ${trigger.cron} ${trigger.timezone}`);
  process.once('SIGTERM', () => { job.stop(); process.exit(0); });
  process.once('SIGINT', () => { job.stop(); process.exit(0); });
}
