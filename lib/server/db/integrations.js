import { query } from './client'

const PROVIDERS = [
  ['meta', 'Meta Business Manager'],
  ['google', 'Google Ads MCC'],
  ['tiktok', 'TikTok Business Center'],
  ['yandex', 'Yandex Direct'],
]

async function ensureAgencyConnections(agencyId) {
  const agencyResult = await query('select id, name, slug from agencies where id = $1 limit 1', [agencyId])
  const agency = agencyResult.rows[0]
  if (!agency) return null

  const existingResult = await query(
    `
      select provider
      from integration_connections
      where agency_id = $1
    `,
    [agency.id]
  )
  const existingProviders = new Set(existingResult.rows.map((row) => row.provider))

  for (const [provider, label] of PROVIDERS) {
    if (existingProviders.has(provider)) continue
    await query(
      `
        insert into integration_connections (
          agency_id, provider, status, auth_mode, external_owner
        )
        values ($1, $2, 'draft', 'oauth_pending', $3)
        on conflict do nothing
      `,
      [agency.id, provider, `${agency.name} Agency`]
    )
  }

  return agency
}

function mapConnection(row, importedCount = 0) {
  return {
    id: row.id,
    agency_id: row.agency_id,
    provider: row.provider,
    label: PROVIDERS.find(([provider]) => provider === row.provider)?.[1] || row.provider,
    status: row.status,
    auth_mode: row.auth_mode,
    access_token: row.access_token_encrypted || null,
    external_owner: row.external_owner,
    last_sync_at: row.updated_at,
    imported_accounts: Number(importedCount || 0),
  }
}

export async function listConnectionsDb(agencyId) {
  await ensureAgencyConnections(agencyId)
  const result = await query(
    `
      with ranked_connections as (
        select
          ic.*,
          row_number() over (
            partition by ic.provider
            order by
              case when ic.status = 'connected' then 0 else 1 end,
              ic.updated_at desc,
              ic.created_at desc
          ) as provider_rank
        from integration_connections ic
        where ic.agency_id = $1
      )
      select
        rc.id,
        rc.agency_id,
        rc.provider,
        rc.status,
        rc.auth_mode,
        rc.external_owner,
        rc.access_token_encrypted,
        rc.updated_at,
        count(ea.id)::int as imported_accounts
      from ranked_connections rc
      left join external_accounts ea on ea.connection_id = rc.id
      where rc.provider_rank = 1
      group by
        rc.id,
        rc.agency_id,
        rc.provider,
        rc.status,
        rc.auth_mode,
        rc.external_owner,
        rc.access_token_encrypted,
        rc.updated_at
      order by rc.updated_at desc, rc.id asc
    `,
    [agencyId]
  )
  return result.rows.map((row) => mapConnection(row, row.imported_accounts))
}

export async function getConnectionByIdDb(agencyId, connectionId) {
  await ensureAgencyConnections(agencyId)
  const result = await query(
    `
      select
        ic.*,
        count(ea.id)::int as imported_accounts
      from integration_connections ic
      left join external_accounts ea on ea.connection_id = ic.id
      where ic.agency_id = $1 and ic.id = $2
      group by ic.id
      limit 1
    `,
    [agencyId, connectionId]
  )
  const row = result.rows[0]
  return row ? mapConnection(row, row.imported_accounts) : null
}

export async function getProviderConnectionDb(agencyId, provider) {
  await ensureAgencyConnections(agencyId)
  const result = await query(
    `
      select ic.*, count(ea.id)::int as imported_accounts
      from integration_connections ic
      left join external_accounts ea on ea.connection_id = ic.id
      where ic.agency_id = $1 and ic.provider = $2
      group by ic.id
      order by
        case when ic.status = 'connected' then 0 else 1 end,
        ic.updated_at desc,
        ic.created_at desc
      limit 1
    `,
    [agencyId, provider]
  )
  const row = result.rows[0]
  return row ? mapConnection(row, row.imported_accounts) : null
}

export async function connectProviderDb(agencyId, provider) {
  const connection = await getProviderConnectionDb(agencyId, provider)
  if (!connection) return null
  await query(
    `
      update integration_connections
      set status = 'connected',
          auth_mode = $3,
          updated_at = now()
      where id = $1 and agency_id = $2
    `,
    [connection.id, agencyId, provider === 'meta' ? 'agency_oauth' : 'agency_connect']
  )
  return getConnectionByIdDb(agencyId, connection.id)
}

export async function saveMetaConnectionTokenDb(agencyId, tokenPayload = {}) {
  const connection = await getProviderConnectionDb(agencyId, 'meta')
  if (!connection) return null
  await query(
    `
      update integration_connections
      set status = 'connected',
          auth_mode = 'agency_oauth',
          access_token_encrypted = $3,
          external_owner = coalesce($4, external_owner),
          updated_at = now()
      where id = $1 and agency_id = $2
    `,
    [connection.id, agencyId, tokenPayload.access_token || null, tokenPayload.external_owner || null]
  )
  return getConnectionByIdDb(agencyId, connection.id)
}

export async function listExternalAccountsDb(agencyId) {
  await ensureAgencyConnections(agencyId)
  const result = await query(
    `
      select
        ea.*,
        da.id as dashboard_account_id,
        da.status as dashboard_status
      from external_accounts ea
      left join dashboard_accounts da on da.external_account_id = ea.id and da.agency_id = ea.agency_id
      where ea.agency_id = $1
      order by ea.created_at asc
    `,
    [agencyId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    agency_id: row.agency_id,
    connection_id: row.connection_id,
    provider: row.provider,
    external_id: row.external_id,
    name: row.name,
    currency: row.currency,
    imported_at: row.imported_at,
    dashboard_account_id: row.dashboard_account_id,
    active_in_dashboard: row.dashboard_status === 'active',
  }))
}

export async function listDashboardAccountsDb(agencyId = null, options = {}) {
  const includeAllStatuses = options.includeAllStatuses === true
  if (!agencyId) {
    const result = await query(
      `
        select
          da.id,
          da.agency_id,
          da.provider as platform,
          ea.external_id,
          da.name,
          da.currency,
          da.status
        from dashboard_accounts da
        join external_accounts ea on ea.id = da.external_account_id
        ${includeAllStatuses ? '' : "where da.status = 'active'"}
        order by da.created_at asc
      `
    )
    return result.rows
  }
  const result = await query(
    `
      select
        da.id,
        da.agency_id,
        da.provider as platform,
        ea.external_id,
        da.name,
        da.currency,
        da.status
      from dashboard_accounts da
      join external_accounts ea on ea.id = da.external_account_id
      where da.agency_id = $1
      ${includeAllStatuses ? '' : "and da.status = 'active'"}
      order by da.created_at asc
    `,
    [agencyId]
  )
  return result.rows
}

export async function replaceImportedAccountsForConnectionDb(agencyId, connectionId, importedAccounts = []) {
  const connection = await getConnectionByIdDb(agencyId, connectionId)
  if (!connection) return null
  const seen = new Set()
  const externalIds = []

  for (const account of importedAccounts) {
    const externalId = String(account.external_id || '').trim()
    if (!externalId || seen.has(externalId)) continue
    seen.add(externalId)
    externalIds.push(externalId)
    const ext = await query(
      `
        insert into external_accounts (
          agency_id, connection_id, provider, external_id, name, currency, account_status
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (connection_id, external_id)
        do update set
          name = excluded.name,
          currency = excluded.currency,
          account_status = excluded.account_status,
          imported_at = now(),
          updated_at = now()
        returning id, agency_id, provider, external_id, name, currency
      `,
      [agencyId, connectionId, connection.provider, externalId, account.name, account.currency || 'USD', account.account_status || null]
    )
    const externalRow = ext.rows[0]
    await query(
      `
        insert into dashboard_accounts (
          agency_id, provider, external_account_id, name, currency, status
        )
        values ($1, $2, $3, $4, $5, 'archived')
        on conflict (agency_id, external_account_id)
        do update set
          name = excluded.name,
          currency = excluded.currency,
          updated_at = now()
      `,
      [agencyId, connection.provider, externalRow.id, externalRow.name, externalRow.currency]
    )
  }

  if (externalIds.length) {
    await query(
      `
        delete from external_accounts
        where connection_id = $1
          and external_id <> all($2::text[])
      `,
      [connectionId, externalIds]
    )
  } else {
    await query('delete from external_accounts where connection_id = $1', [connectionId])
  }

  await query('update integration_connections set status = $2, updated_at = now() where id = $1', [connectionId, 'connected'])
  return listExternalAccountsDb(agencyId)
}

export async function setActivatedDashboardAccountsDb(agencyId, accountIds = []) {
  const ids = Array.from(new Set((accountIds || []).map(String)))
  await query(
    `
      update dashboard_accounts
      set status = case when id = any($2::uuid[]) then 'active' else 'archived' end,
          updated_at = now()
      where agency_id = $1
    `,
    [agencyId, ids]
  )
  return listDashboardAccountsDb(agencyId)
}
