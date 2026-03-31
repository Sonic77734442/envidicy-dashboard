alter table integration_connections
  add column if not exists oauth_scopes text[] not null default '{}'::text[],
  add column if not exists token_last_refreshed_at timestamptz,
  add column if not exists oauth_state text;

alter table external_accounts
  add column if not exists selected_for_sync boolean not null default false,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create table if not exists google_ads_customer_links (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  connection_id uuid not null references integration_connections(id) on delete cascade,
  parent_customer_id text,
  customer_id text not null,
  descriptive_name text,
  currency_code text,
  is_manager boolean not null default false,
  level integer not null default 0,
  hidden boolean not null default false,
  test_account boolean not null default false,
  status text,
  discovered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_google_ads_customer_links_agency_id on google_ads_customer_links(agency_id);
create index if not exists idx_google_ads_customer_links_connection_id on google_ads_customer_links(connection_id);
create index if not exists idx_google_ads_customer_links_customer_id on google_ads_customer_links(customer_id);
create unique index if not exists idx_google_ads_customer_links_unique
  on google_ads_customer_links (connection_id, customer_id, coalesce(parent_customer_id, ''));
