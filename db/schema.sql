-- Envidicy Dashboard
-- Minimal Postgres schema for the standalone dashboard SaaS.
-- Target: Render Postgres / any PostgreSQL 14+ instance.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_status_check check (status in ('active', 'invited', 'disabled'))
);

create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agencies_status_check check (status in ('active', 'disabled'))
);

create table if not exists agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_members_role_check check (role in ('platform_owner', 'agency_admin', 'client_viewer')),
  constraint agency_members_status_check check (status in ('active', 'invited', 'disabled')),
  constraint agency_members_unique unique (agency_id, user_id)
);

create table if not exists client_profiles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_profiles_status_check check (status in ('active', 'archived'))
);

create table if not exists integration_connections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  provider text not null,
  status text not null default 'draft',
  auth_mode text not null default 'oauth_pending',
  external_owner text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  created_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_connections_provider_check check (provider in ('meta', 'google', 'tiktok', 'yandex')),
  constraint integration_connections_status_check check (status in ('draft', 'connected', 'failed', 'disabled'))
);

create table if not exists external_accounts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  connection_id uuid not null references integration_connections(id) on delete cascade,
  provider text not null,
  external_id text not null,
  name text not null,
  currency text not null default 'USD',
  account_status text,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_accounts_provider_check check (provider in ('meta', 'google', 'tiktok', 'yandex')),
  constraint external_accounts_unique unique (connection_id, external_id)
);

create table if not exists dashboard_accounts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  provider text not null,
  external_account_id uuid not null references external_accounts(id) on delete cascade,
  name text not null,
  currency text not null default 'USD',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_accounts_provider_check check (provider in ('meta', 'google', 'tiktok', 'yandex')),
  constraint dashboard_accounts_status_check check (status in ('active', 'archived')),
  constraint dashboard_accounts_unique unique (agency_id, external_account_id)
);

create table if not exists client_account_access (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references client_profiles(id) on delete cascade,
  dashboard_account_id uuid not null references dashboard_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint client_account_access_unique unique (client_profile_id, dashboard_account_id)
);

create table if not exists sync_jobs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  provider text not null,
  kind text not null,
  status text not null default 'queued',
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint sync_jobs_provider_check check (provider in ('meta', 'google', 'tiktok', 'yandex')),
  constraint sync_jobs_status_check check (status in ('queued', 'running', 'completed', 'failed'))
);

create table if not exists account_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  dashboard_account_id uuid not null references dashboard_accounts(id) on delete cascade,
  date date not null,
  spend numeric(18, 4) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(18, 4) not null default 0,
  reach bigint not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_daily_metrics_unique unique (dashboard_account_id, date)
);

create table if not exists account_audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  dashboard_account_id uuid not null references dashboard_accounts(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  group_name text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint account_audience_snapshots_group_check check (group_name in ('age_gender', 'geo', 'device'))
);

create table if not exists account_conversion_stats (
  id uuid primary key default gen_random_uuid(),
  dashboard_account_id uuid not null references dashboard_accounts(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  tracked_conversions numeric(18, 4) not null default 0,
  conversion_value numeric(18, 4) not null default 0,
  cpa numeric(18, 4) not null default 0,
  roas numeric(18, 4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_agency_members_user_id on agency_members(user_id);
create index if not exists idx_client_profiles_agency_id on client_profiles(agency_id);
create index if not exists idx_integration_connections_agency_id on integration_connections(agency_id);
create unique index if not exists idx_integration_connections_agency_provider_unique on integration_connections(agency_id, provider);
create index if not exists idx_external_accounts_agency_id on external_accounts(agency_id);
create index if not exists idx_external_accounts_provider on external_accounts(provider);
create index if not exists idx_dashboard_accounts_agency_id on dashboard_accounts(agency_id);
create index if not exists idx_dashboard_accounts_provider on dashboard_accounts(provider);
create index if not exists idx_client_account_access_client_profile_id on client_account_access(client_profile_id);
create index if not exists idx_sync_jobs_agency_id on sync_jobs(agency_id);
create index if not exists idx_sync_jobs_created_at on sync_jobs(created_at desc);
create index if not exists idx_account_daily_metrics_date on account_daily_metrics(date);
create index if not exists idx_account_audience_snapshots_account_id on account_audience_snapshots(dashboard_account_id);
create index if not exists idx_account_conversion_stats_account_id on account_conversion_stats(dashboard_account_id);
