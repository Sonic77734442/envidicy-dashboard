import { listDashboardAccountsForAgency } from './agency-store'
import {
  buildMockSnapshotForAccount,
  listAccountSyncState,
  listSyncJobs,
  recordSyncJob,
  setAccountSyncSnapshot,
  syncDashboardAccounts,
} from '../../dashboard/mock-sync'
import { getProviderConnectionForAccount } from './integrations'
import { fetchLiveMetaSnapshot } from './meta-reporting'
import { hasDatabase } from '../db/client'
import { listAccountSyncStateDb, listSyncJobsDb, persistAccountSnapshotDb, persistSyncFailureDb } from '../db/sync'

export async function getSyncSnapshot(agencyId = null) {
  if (hasDatabase() && agencyId) {
    return {
      sync_jobs: await listSyncJobsDb(agencyId),
      sync_state: await listAccountSyncStateDb(agencyId),
    }
  }
  return {
    sync_jobs: listSyncJobs().filter((job) => !agencyId || !job.payload?.agency_id || job.payload?.agency_id === agencyId),
    sync_state: listAccountSyncState(),
  }
}

export async function runSync(agencyId = null, options = {}) {
  const { metaAccessToken = null } = options
  const accounts = await listDashboardAccountsForAgency(agencyId)
  const metaFallbackIds = []

  for (const account of accounts) {
    if (account.platform !== 'meta') continue
    const connection = await getProviderConnectionForAccount(account.agency_id, account)
    const liveConnection = metaAccessToken
      ? { ...(connection || {}), access_token: metaAccessToken, auth_mode: 'agency_oauth' }
      : connection
    if (!liveConnection?.access_token) continue
    try {
      const snapshot = await fetchLiveMetaSnapshot({ connection: liveConnection, account })
      const hasMetrics =
        Number(snapshot?.summary?.impressions || 0) > 0 ||
        Number(snapshot?.summary?.clicks || 0) > 0 ||
        Number(snapshot?.summary?.spend || 0) > 0 ||
        (snapshot?.campaigns || []).length > 0
      if (hasMetrics) {
        setAccountSyncSnapshot(account, snapshot)
        if (hasDatabase() && agencyId) {
          await persistAccountSnapshotDb(agencyId, account, snapshot, 'completed', { debug: snapshot.debug || null })
        }
        recordSyncJob(
          'meta_live_sync',
          {
            agency_id: agencyId,
            account_id: account.id,
            external_id: account.external_id,
            debug: snapshot.debug || null,
          },
          'completed'
        )
      } else {
        metaFallbackIds.push(String(account.id))
        if (hasDatabase() && agencyId) {
          await persistAccountSnapshotDb(agencyId, account, buildMockSnapshotForAccount(account), 'completed', {
            debug: snapshot.debug || null,
            fallback: 'mock_snapshot',
          })
        }
        recordSyncJob(
          'meta_live_sync',
          {
            agency_id: agencyId,
            account_id: account.id,
            external_id: account.external_id,
            debug: snapshot.debug || null,
            fallback: 'mock_snapshot',
          },
          'completed'
        )
      }
    } catch (error) {
      metaFallbackIds.push(String(account.id))
      if (hasDatabase() && agencyId) {
        await persistSyncFailureDb(agencyId, account, error?.message || 'Meta sync failed')
      }
      recordSyncJob(
        'meta_live_sync',
        {
          agency_id: agencyId,
          account_id: account.id,
          external_id: account.external_id,
          error: error?.message || 'Meta sync failed',
        },
        'failed'
      )
    }
  }

  for (const account of accounts.filter((row) => row.platform === 'meta' && metaFallbackIds.includes(String(row.id)))) {
    setAccountSyncSnapshot(account, buildMockSnapshotForAccount(account))
  }

  const sync = syncDashboardAccounts(agencyId, { skipPlatforms: ['meta'] })
  return hasDatabase() && agencyId ? getSyncSnapshot(agencyId) : { sync_jobs: sync.jobs, sync_state: sync.states }
}
