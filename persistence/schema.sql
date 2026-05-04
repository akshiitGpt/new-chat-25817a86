CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_for TIMESTAMP NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'completed_with_errors', 'failed')),
  tickets_discovered INTEGER NOT NULL DEFAULT 0,
  tickets_processed INTEGER NOT NULL DEFAULT 0,
  tickets_skipped INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT
);

CREATE TABLE IF NOT EXISTS linear_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linear_ticket_id TEXT NOT NULL UNIQUE,
  linear_url TEXT NOT NULL,
  title TEXT NOT NULL,
  team_key TEXT,
  project_name TEXT,
  state TEXT NOT NULL,
  completed_at TIMESTAMP,
  first_seen_at TIMESTAMP NOT NULL DEFAULT now(),
  processed_at TIMESTAMP,
  processing_status TEXT NOT NULL CHECK (processing_status IN ('pending', 'processed', 'no_event_needed', 'failed', 'needs_human_input')),
  ticket_context_hash TEXT
);

CREATE TABLE IF NOT EXISTS ticket_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id),
  linear_ticket_record_id UUID NOT NULL REFERENCES linear_tickets(id),
  status TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP,
  skipped_reason TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS event_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linear_ticket_record_id UUID NOT NULL REFERENCES linear_tickets(id),
  event_name TEXT NOT NULL,
  event_constant TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_point TEXT NOT NULL,
  properties_json JSONB NOT NULL,
  repository TEXT,
  implementation_notes TEXT,
  notion_page_id TEXT,
  notion_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('drafted', 'documented', 'implemented', 'pr_opened', 'no_event_needed', 'needs_human_input')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS github_pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_spec_id UUID REFERENCES event_specs(id),
  linear_ticket_record_id UUID NOT NULL REFERENCES linear_tickets(id),
  repository TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  pr_number INTEGER,
  pr_url TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('branch_created', 'pr_opened', 'review_requested', 'closed', 'merged', 'failed')),
  tests_summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id),
  linear_ticket_record_id UUID REFERENCES linear_tickets(id),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_processing_run ON ticket_processing(run_id);
CREATE INDEX IF NOT EXISTS idx_event_specs_ticket ON event_specs(linear_ticket_record_id);
CREATE INDEX IF NOT EXISTS idx_github_prs_ticket ON github_pull_requests(linear_ticket_record_id);
CREATE INDEX IF NOT EXISTS idx_run_logs_run ON run_logs(run_id);
