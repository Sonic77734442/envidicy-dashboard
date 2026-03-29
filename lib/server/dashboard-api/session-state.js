import { cookies } from 'next/headers'
import { exportAgencyState, importAgencyState, listDashboardAccounts } from './agency-store'
import { exportSyncState, importSyncState } from '../../dashboard/mock-sync'
import { hasDatabase } from '../db/client'

function keyFor(name, agencyId) {
  return `dashboard_${name}_${agencyId || 'global'}`
}

export async function readAgencyStateCookie(name, agencyId) {
  const store = await cookies()
  const raw = store.get(keyFor(name, agencyId))?.value
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeAgencyStateCookie(response, name, agencyId, value) {
  response.cookies.set(keyFor(name, agencyId), JSON.stringify(value), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
}

export async function hydrateAgencySession(agencyId) {
  if (hasDatabase()) return
  if (!agencyId) return
  const agencyState = await readAgencyStateCookie('agency_state', agencyId)
  if (agencyState) {
    importAgencyState(agencyId, agencyState)
  }
  const syncState = await readAgencyStateCookie('sync_state', agencyId)
  if (syncState) {
    importSyncState(syncState)
  }
}

export function persistAgencySession(response, agencyId) {
  if (hasDatabase()) return response
  if (!agencyId) return response
  const accountIds = listDashboardAccounts(agencyId).map((row) => row.id)
  writeAgencyStateCookie(response, 'agency_state', agencyId, exportAgencyState(agencyId))
  writeAgencyStateCookie(response, 'sync_state', agencyId, exportSyncState(agencyId, accountIds))
  return response
}
