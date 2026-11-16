-- =====================================================================
-- 0001_schema.sql: Core schema, enums, tables, and indexes
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ===== enums =====
create type opportunity_category as enum
  ('website','mobile_app','custom_software','ai_solution','workflow_automation','other');
create type signal_strength as enum ('explicit_request','strong_signal','weak_signal','none');
create type verification_status as enum ('pending','verified','needs_review','failed');
create type lead_status as enum
  ('new','review','approved','contacted','interested','not_a_fit','won','lost');
create type priority_level as enum ('high','medium','low');
create type run_status as enum ('running','succeeded','partial','failed');
create type capture_status as enum
  ('captured','blocked_robots','blocked_auth','blocked_captcha','fetch_failed',
   'prefilter_rejected','ai_rejected','already_seen','suppressed','deferred');
create type contact_route_type as enum
  ('official_contact_page','published_generic_email','source_listing','none');

-- ===== roles =====
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'reviewer' check (role in ('admin','reviewer')),
  display_name text,
  created_at timestamptz not null default now()
);

-- ===== bot registry (all 20 rows; MVP enables 1-5) =====
create table if not exists bots (
  id smallint primary key check (id between 1 and 20),
  code text not null unique,
  name text not null,
  department text not null check (department in ('A','B','C','D')),
  category opportunity_category,
  enabled boolean not null default false,
  mvp boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== knowledge base (PDF Phase 1) =====
create table if not exists service_profile (
  id uuid primary key default gen_random_uuid(),
  service_key text not null unique,
  name text not null,
  category opportunity_category not null,
  description text,
  keywords text[] not null default '{}',
  technologies text[] not null default '{}',
  active boolean not null default true,
  approved_by_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists kb_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ===== approved sources and access policy (PDF section 3) =====
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('search_api','rss','api','seed_list','manual')),
  base_url text,
  terms_url text,
  terms_reviewed boolean not null default false,
  terms_reviewed_at timestamptz,
  automated_collection_allowed boolean not null default false,
  reliability_score smallint not null default 50 check (reliability_score between 0 and 100),
  enabled boolean not null default false,
  bot_ids smallint[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_enable_requires_review
    check (not enabled or (terms_reviewed and automated_collection_allowed))
);

create table if not exists seed_urls (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  label text,
  bot_ids smallint[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists domain_policy (
  domain text primary key,
  status text not null default 'allowed'
    check (status in ('allowed','blocked_robots','blocked_auth','blocked_captcha','blocked_manual')),
  robots_checked_at timestamptz,
  robots_txt_hash text,
  blocked_until timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists suppression_list (
  id uuid primary key default gen_random_uuid(),
  domain text,
  email text,
  reason text,
  created_at timestamptz not null default now(),
  check (domain is not null or email is not null)
);

-- ===== runs =====
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  bot_id smallint not null references bots(id),
  workflow text not null,
  n8n_execution_id text,
  trigger text not null check (trigger in ('schedule','manual','webhook','dashboard')),
  dry_run boolean not null default false,
  status run_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  error text
);
create index if not exists agent_runs_bot_started on agent_runs (bot_id, started_at desc);
create index if not exists agent_runs_exec on agent_runs (n8n_execution_id);

-- ===== companies =====
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  domain text,
  official_website text,
  industry text,
  country text,
  city text,
  contact_route_type contact_route_type not null default 'none',
  contact_route_url text,
  contact_email_generic text,
  date_checked timestamptz not null default now(),
  is_suppressed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists companies_domain_uq on companies (domain) where domain is not null;
create unique index if not exists companies_name_nodomain_uq on companies (normalized_name) where domain is null;
create index if not exists companies_name_trgm on companies using gin (normalized_name gin_trgm_ops);

-- ===== source evidence (every capture attempt) =====
create table if not exists source_evidence (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references agent_runs(id),
  bot_id smallint references bots(id),
  source_id uuid references sources(id),
  company_id uuid references companies(id),
  source_url text not null,
  canonical_url text not null,
  source_published_at date,
  date_checked timestamptz not null default now(),
  http_status int,
  capture_status capture_status not null,
  robots_allowed boolean,
  content_hash text,
  excerpt text,                       -- PII-scrubbed, <= 3000 chars, the text actually analysed
  rejected_reason text,
  created_at timestamptz not null default now()
);
create index if not exists evidence_canonical_checked on source_evidence (canonical_url, date_checked desc);
create index if not exists evidence_hash on source_evidence (content_hash);
create index if not exists evidence_run on source_evidence (run_id);

-- ===== AI result cache =====
create table if not exists ai_analyses (
  id uuid primary key default gen_random_uuid(),
  content_hash text not null,
  task text not null,
  prompt_version text not null,
  provider text not null,
  model text not null,
  output jsonb,
  valid boolean not null,
  error text,
  prompt_tokens int,
  output_tokens int,
  latency_ms int,
  created_at timestamptz not null default now(),
  unique (content_hash, task, prompt_version, provider, model)
);
create index if not exists ai_analyses_day on ai_analyses (created_at);

-- ===== scoring config =====
create table if not exists scoring_config (
  version int primary key,
  weights jsonb not null,
  thresholds jsonb not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists scoring_one_active on scoring_config (active) where active;

-- ===== opportunities (the lead) =====
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  evidence_id uuid not null references source_evidence(id),
  assigned_bot_id smallint not null references bots(id),
  also_found_by smallint[] not null default '{}',
  category opportunity_category not null,
  signal signal_strength not null,
  title text not null,
  -- FACTS (from the source)
  stated_requirement text not null,
  evidence_quote text not null,
  -- HYPOTHESES (AI-generated, unconfirmed)
  ai_hypotheses jsonb not null default '[]'::jsonb,
  matched_service_keys text[] not null default '{}',
  scope_clarity text check (scope_clarity in ('clear','partial','vague')),
  score smallint not null check (score between 0 and 100),
  score_breakdown jsonb not null,
  score_version int not null references scoring_config(version),
  priority priority_level not null,
  confidence smallint not null check (confidence between 0 and 100),
  verification verification_status not null default 'pending',
  verification_checks jsonb not null default '{}'::jsonb,
  status lead_status not null default 'new',
  dedupe_key text not null unique,
  possible_duplicate_of uuid references opportunities(id),
  reviewer_notes text,
  last_researched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists opp_status on opportunities (status);
create index if not exists opp_priority_score on opportunities (priority, score desc);
create index if not exists opp_company on opportunities (company_id);
create index if not exists opp_category on opportunities (category);
create index if not exists opp_verification on opportunities (verification);
create index if not exists opp_created on opportunities (created_at desc);

create table if not exists lead_status_history (
  id bigint generated always as identity primary key,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  from_status lead_status,
  to_status lead_status not null,
  changed_by uuid references auth.users(id),
  note text,
  changed_at timestamptz not null default now()
);
create index if not exists lsh_opp on lead_status_history (opportunity_id, changed_at);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null,
  actor_id uuid,
  actor_type text not null,
  old_data jsonb,
  new_data jsonb,
  at timestamptz not null default now()
);
create index if not exists audit_table_record on audit_log (table_name, record_id, at desc);
