import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionPersona } from '../../../../lib/server/dashboard-api/session-persona'
import {
  connectProvider,
  listConnections,
  listDashboardAccounts,
  listExternalAccounts,
  setActivatedDashboardAccounts,
} from '../../../../lib/dashboard/mock-integrations'
import {
  listAccountSyncState,
  listConversionEvents,
  listConversionSources,
  listSyncJobs,
  syncDashboardAccounts,
} from '../../../../lib/dashboard/mock-sync'

function ensureAgencyAccess(persona) {
  return persona && (persona.role === 'platform_owner' || persona.role === 'agency_admin')
}

export async function GET() {
  const persona = await getSessionPersona(await cookies())
  if (!ensureAgencyAccess(persona)) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: persona ? 403 : 401 })
  }
  return NextResponse.json({
    connections: listConnections(),
    external_accounts: listExternalAccounts(),
    dashboard_accounts: listDashboardAccounts(),
    sync_jobs: listSyncJobs(),
    sync_state: listAccountSyncState(),
    conversion_sources: listConversionSources(),
    conversion_events: listConversionEvents(),
  })
}

export async function POST(request) {
  const persona = await getSessionPersona(await cookies())
  if (!ensureAgencyAccess(persona)) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: persona ? 403 : 401 })
  }
  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || '').trim()
  if (action === 'connect_provider') {
    const provider = String(body?.provider || '').trim()
    const connection = connectProvider(provider)
    if (!connection) {
      return NextResponse.json({ detail: 'Connection not found' }, { status: 404 })
    }
    return NextResponse.json({
      connection,
      connections: listConnections(),
      external_accounts: listExternalAccounts(),
      dashboard_accounts: listDashboardAccounts(),
      sync_jobs: listSyncJobs(),
      sync_state: listAccountSyncState(),
      conversion_sources: listConversionSources(),
      conversion_events: listConversionEvents(),
    })
  }
  if (action === 'activate_dashboard_accounts') {
    const next = setActivatedDashboardAccounts(Array.isArray(body?.account_ids) ? body.account_ids : [])
    return NextResponse.json({
      dashboard_accounts: next,
      external_accounts: listExternalAccounts(),
      connections: listConnections(),
      sync_jobs: listSyncJobs(),
      sync_state: listAccountSyncState(),
      conversion_sources: listConversionSources(),
      conversion_events: listConversionEvents(),
    })
  }
  if (action === 'run_sync') {
    const sync = syncDashboardAccounts()
    return NextResponse.json({
      dashboard_accounts: listDashboardAccounts(),
      external_accounts: listExternalAccounts(),
      connections: listConnections(),
      sync_jobs: sync.jobs,
      sync_state: sync.states,
      conversion_sources: listConversionSources(),
      conversion_events: listConversionEvents(),
    })
  }
  return NextResponse.json({ detail: 'Unsupported action' }, { status: 400 })
}
