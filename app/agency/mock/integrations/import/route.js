import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionPersona } from '../../../../../lib/server/dashboard-api/session-persona'
import {
  importConnectionAccounts,
  listConnections,
  listDashboardAccounts,
  listExternalAccounts,
} from '../../../../../lib/dashboard/mock-integrations'
import { listAccountSyncState, listConversionEvents, listConversionSources, listSyncJobs } from '../../../../../lib/dashboard/mock-sync'

function ensureAgencyAccess(persona) {
  return persona && (persona.role === 'platform_owner' || persona.role === 'agency_admin')
}

export async function POST(request) {
  const persona = await getSessionPersona(await cookies())
  if (!ensureAgencyAccess(persona)) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: persona ? 403 : 401 })
  }
  const body = await request.json().catch(() => ({}))
  const connectionId = String(body?.connection_id || '').trim()
  if (!connectionId) {
    return NextResponse.json({ detail: 'connection_id is required' }, { status: 400 })
  }
  const imported = importConnectionAccounts(connectionId)
  if (!imported) {
    return NextResponse.json({ detail: 'Connection not found' }, { status: 404 })
  }
  return NextResponse.json({
    imported,
    connections: listConnections(),
    external_accounts: listExternalAccounts(),
    dashboard_accounts: listDashboardAccounts(),
    sync_jobs: listSyncJobs(),
    sync_state: listAccountSyncState(),
    conversion_sources: listConversionSources(),
    conversion_events: listConversionEvents(),
  })
}
