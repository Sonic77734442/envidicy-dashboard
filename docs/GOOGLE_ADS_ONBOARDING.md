# Google Ads Agency Onboarding

## Goal

Implement a Google Ads onboarding flow for agency tenants in Envidicy Dashboard:

1. Agency admin clicks `Connect Google Ads`
2. Agency admin completes Google OAuth
3. Platform stores `refresh_token` server-side
4. Backend discovers accessible customers
5. If an MCC is accessible, backend traverses child accounts
6. Agency admin sees all discovered customers
7. Agency admin selects accounts for sync
8. Selected accounts are marked as `selected_for_sync`

The design must work today with `Explorer` access and remain compatible with `Basic Access` later.

## Existing reusable assets

The original `envidicy` project already contains a working Google Ads client bootstrap in:

- [main.py](/Users/main/Projects/envidicy/app/main.py)

Relevant env names already used there:

- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID`

These env names should be preserved in the standalone dashboard to keep migration low-risk.

## Architecture

### High-level flow

1. `agency_admin` starts OAuth
2. Google returns `code`
3. Backend exchanges `code -> access_token + refresh_token`
4. Backend saves Google connection in `integration_connections`
5. Backend refreshes access token on demand from `refresh_token`
6. Backend calls:
   - `customers:listAccessibleCustomers`
   - `googleAds:searchStream` against each accessible customer
7. Backend builds a normalized account graph
8. Agency selects accounts
9. Selected accounts are marked for sync and later stored as `dashboard_accounts`

### Recommended backend namespaces

- `lib/server/dashboard-api/google-ads.js`
  - OAuth helpers
  - token refresh
  - customer discovery
  - MCC traversal
- `app/api/dashboard/integrations/google/start`
- `app/api/dashboard/integrations/google/callback`
- `app/api/dashboard/integrations/google/discover`

### Read-only scope

Use Google OAuth scope:

- `https://www.googleapis.com/auth/adwords`

Even for read-only reporting, Google Ads API uses the `adwords` scope.

## Schema

The current generic schema is already close, but Google onboarding benefits from a few extra fields.

### Existing tables reused

- `integration_connections`
- `external_accounts`
- `dashboard_accounts`
- `sync_jobs`

### Recommended migration

See:

- [20260329_google_ads_onboarding.sql](/Users/main/Projects/envidicy-dashboard/db/migrations/20260329_google_ads_onboarding.sql)

Key additions:

- `integration_connections.oauth_scopes`
- `integration_connections.token_last_refreshed_at`
- `integration_connections.oauth_state`
- `external_accounts.selected_for_sync`
- `external_accounts.metadata_json`
- `google_ads_customer_links`

### Why `google_ads_customer_links` is useful

Google account discovery is graph-like:

- agency can access direct customers
- agency can access MCC accounts
- MCC accounts can expose child customers

Persisting this graph makes reconnect and resync predictable and auditable.

## Backend routes

### `GET /api/dashboard/integrations/google/start`

Purpose:

- create OAuth state
- redirect user to Google consent screen

Response:

- `302` redirect to Google OAuth

### `GET /api/dashboard/integrations/google/callback`

Purpose:

- validate `state`
- exchange `code` for tokens
- save connection tokens in `integration_connections`

Response:

- redirect back to `/agency?google_connected=1`

### `POST /api/dashboard/integrations/google/discover`

Body:

```json
{
  "connection_id": "uuid"
}
```

Purpose:

- refresh access token if needed
- fetch accessible customers
- traverse MCC children
- upsert discovered Google accounts into `external_accounts`

Response:

- discovered accounts
- counts for accessible customers and traversed children

## OAuth flow

### Start

Redirect to Google OAuth with:

- `client_id`
- `redirect_uri`
- `response_type=code`
- `access_type=offline`
- `prompt=consent`
- `scope=https://www.googleapis.com/auth/adwords`
- `state=<signed state>`

`prompt=consent` is important to reliably obtain `refresh_token`.

### Callback

Exchange code at:

- `https://oauth2.googleapis.com/token`

Store:

- `refresh_token`
- access token expiry
- granted scopes

Do not rely on browser cookies for long-term Google token storage.

## Customer discovery logic

### Step 1: accessible customers

Call:

- `POST https://googleads.googleapis.com/v20/customers:listAccessibleCustomers`

This returns resource names like:

- `customers/1234567890`

### Step 2: normalize customer ids

Normalize to plain 10-digit ids:

- `1234567890`

### Step 3: get customer metadata

For each accessible customer, query:

```sql
SELECT
  customer.id,
  customer.descriptive_name,
  customer.currency_code,
  customer.manager,
  customer.test_account,
  customer.status
FROM customer
LIMIT 1
```

## MCC traversal logic

If `customer.manager = true`, run:

```sql
SELECT
  customer_client.id,
  customer_client.descriptive_name,
  customer_client.currency_code,
  customer_client.manager,
  customer_client.level,
  customer_client.hidden,
  customer_client.test_account,
  customer_client.status
FROM customer_client
WHERE customer_client.level <= 1
```

Notes:

- with `Explorer`, keep traversal conservative
- first pass can traverse only one level deep
- later with `Basic Access`, expand safely if needed
- de-duplicate child accounts across multiple MCCs

## Selected-for-sync model

Use `external_accounts.selected_for_sync = true` for the agency choice.

Then activate reporting through `dashboard_accounts`:

- imported but not selected: `selected_for_sync = false`
- selected by agency: `selected_for_sync = true`
- materialized internal reporting account: row exists in `dashboard_accounts`

This separation is cleaner than treating every imported customer as active by default.

## Error handling

Handle these groups explicitly:

### OAuth errors

- invalid state
- denied consent
- token exchange failure
- missing refresh token

### Google Ads API errors

- invalid developer token
- access level restrictions
- inaccessible customer
- login customer mismatch
- manager traversal denied

### Persistence errors

- duplicate connection state
- stale reconnect overwriting a newer token
- missing agency connection

Return stable API payloads:

```json
{
  "detail": "Google Ads discovery failed",
  "provider": "google",
  "reason": "token_exchange_failed"
}
```

## Security notes

### Required

- store `refresh_token` only server-side
- never expose Google refresh token to browser clients
- encrypt token fields at rest before production rollout
- validate OAuth state
- restrict routes to `agency_admin`
- log provider errors without leaking secrets

### Local development

For local testing it is acceptable to reuse:

- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID`

from the original `envidicy` environment, as long as they stay outside git.

## Code map in this repo

This local scaffold adds:

- [google-ads.js](/Users/main/Projects/envidicy-dashboard/lib/server/dashboard-api/google-ads.js)
- [start/route.js](/Users/main/Projects/envidicy-dashboard/app/api/dashboard/integrations/google/start/route.js)
- [callback/route.js](/Users/main/Projects/envidicy-dashboard/app/api/dashboard/integrations/google/callback/route.js)
- [discover/route.js](/Users/main/Projects/envidicy-dashboard/app/api/dashboard/integrations/google/discover/route.js)
- [20260329_google_ads_onboarding.sql](/Users/main/Projects/envidicy-dashboard/db/migrations/20260329_google_ads_onboarding.sql)

## Suggested next implementation order

1. Wire `google/start`
2. Wire `google/callback`
3. Save refresh token in `integration_connections`
4. Implement `discover`
5. Persist `selected_for_sync`
6. Reuse existing sync backbone for Google daily metrics
