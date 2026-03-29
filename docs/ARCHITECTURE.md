# Envidicy Dashboard Architecture

## Product model

This project is a standalone analytics SaaS, not a page inside the main Envidicy cabinet.

Access model:

1. `platform_owner` / `platform_admin`
   Envidicy controls tenants, subscriptions, integrations policy, quotas, and support.
2. `agency_owner` / `agency_admin` / `agency_manager`
   The agency connects ad platforms, selects accounts, creates report scopes, and assigns client access.
3. `client_viewer`
   The agency client sees only assigned accounts and report views.

## Core domains

### 1. Identity and tenancy

- `dashboard_users`
- `dashboard_agencies`
- `dashboard_agency_members`
- `dashboard_sessions`

Principle:

- a user may belong to multiple agencies
- all product resources are owned by an agency tenant

### 2. Integrations

- `dashboard_integrations`
- `dashboard_integration_credentials`
- `dashboard_external_assets`
- `dashboard_external_accounts`

Providers:

- Meta
- Google Ads
- TikTok Ads
- Yandex Direct
- later: Telegram, analytics, CRM, attribution sources

### 3. Internal account model

- `dashboard_accounts`
- `dashboard_account_labels`
- `dashboard_account_access`

Purpose:

- normalize all external ad accounts into one internal reporting model
- keep external provider identifiers separate from internal dashboard account ids

### 4. Data pipeline

- `dashboard_sync_jobs`
- `dashboard_sync_runs`
- `dashboard_fact_daily`
- `dashboard_fact_campaigns`
- `dashboard_fact_audience`
- `dashboard_fact_conversions`

Principle:

- UI reads internal facts, not provider APIs directly
- provider sync is asynchronous and observable

### 5. Reporting and delivery

- `dashboard_views`
- `dashboard_saved_reports`
- `dashboard_exports`
- `dashboard_report_access`

Principle:

- agencies compose what a client is allowed to see
- clients consume read-only report views

## Conversion API layer

Future ingestion sources:

- Meta CAPI
- Google offline conversions / enhanced conversions
- TikTok Events API
- Yandex conversions
- CRM/webhook ingestion

Recommended domain:

- `conversion_sources`
- `conversion_events_raw`
- `conversion_events_normalized`
- `conversion_attribution_links`

Rules:

- raw events are immutable
- normalization and matching are separate
- reporting reads normalized attributed facts only

## Recommended services

### `dashboard-web`

Responsibilities:

- tenant UI
- agency UI
- client reporting UI

### `dashboard-api`

Responsibilities:

- auth / tenancy
- integrations metadata
- report endpoints
- export orchestration

### `dashboard-sync`

Responsibilities:

- provider sync jobs
- refresh campaigns / audience / daily metrics
- backfills and retry handling

### `dashboard-conversions`

Responsibilities:

- receive conversion API events
- normalize and enrich
- write reporting facts

## Initial implementation strategy

Phase 1:

- separate Next.js project
- keep current dashboard UI as base
- simplify shell and isolate dashboard module
- document target architecture

Phase 2:

- introduce dedicated backend namespace for dashboard
- move dashboard reads from mixed cabinet API to dashboard API
- add tenant model and agency selector

Phase 3:

- add integration connections per provider
- account mapping
- agency-managed client scopes

Phase 4:

- reporting cache
- exports center
- conversion API ingestion

## Current local direction

This repository is intentionally a standalone workspace outside `/Users/main/Projects/envidicy`.

The old Envidicy dashboard provides the initial UI base, but the target product is a separate SaaS with:

- separate deployment
- separate routing
- separate tenant model
- separate growth path

