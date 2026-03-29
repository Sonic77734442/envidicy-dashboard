import { query } from './client'

function normalizeSnapshotPayload(account, snapshot = {}, extra = {}) {
  return {
    agency_id: account.agency_id,
    account_id: String(account.id),
    external_id: account.external_id || null,
    platform: account.platform,
    snapshot,
    ...extra,
  }
}

export async function persistAccountSnapshotDb(agencyId, account, snapshot, status = 'completed', extra = {}) {
  await query(
    `
      insert into sync_jobs (agency_id, provider, kind, status, payload_json, started_at, finished_at)
      values ($1, $2, $3, $4, $5::jsonb, now(), now())
    `,
    [agencyId, account.platform, 'account_snapshot', status, JSON.stringify(normalizeSnapshotPayload(account, snapshot, extra))]
  )
}

export async function persistSyncFailureDb(agencyId, account, error, extra = {}) {
  await query(
    `
      insert into sync_jobs (agency_id, provider, kind, status, payload_json, started_at, finished_at)
      values ($1, $2, $3, 'failed', $4::jsonb, now(), now())
    `,
    [agencyId, account.platform, 'account_snapshot', JSON.stringify(normalizeSnapshotPayload(account, null, { error, ...extra }))]
  )
}

export async function listSyncJobsDb(agencyId) {
  const result = await query(
    `
      select id, kind, status, created_at, payload_json
      from sync_jobs
      where agency_id = $1
      order by created_at desc
      limit 50
    `,
    [agencyId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    created_at: row.created_at,
    payload: row.payload_json || {},
  }))
}

export async function listAccountSyncStateDb(agencyId) {
  const result = await query(
    `
      select distinct on ((payload_json->>'account_id'))
        payload_json->>'account_id' as account_id,
        status,
        created_at as last_synced_at
      from sync_jobs
      where agency_id = $1
        and kind = 'account_snapshot'
        and payload_json ? 'account_id'
      order by (payload_json->>'account_id'), created_at desc
    `,
    [agencyId]
  )
  return result.rows.map((row) => ({
    account_id: row.account_id,
    status: row.status === 'completed' ? 'ready' : row.status,
    last_synced_at: row.last_synced_at,
  }))
}

export async function getLatestAccountSnapshotDb(accountId) {
  const result = await query(
    `
      select payload_json
      from sync_jobs
      where kind = 'account_snapshot'
        and payload_json->>'account_id' = $1
      order by created_at desc
      limit 1
    `,
    [String(accountId)]
  )
  return result.rows[0]?.payload_json?.snapshot || null
}

