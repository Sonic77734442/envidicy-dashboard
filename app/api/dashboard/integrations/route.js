import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAgencyAccess } from '../../../../lib/server/dashboard-api/authz'
import {
  activateSelectedExternalAccounts,
  getIntegrationsSnapshot,
  runConnectProvider,
  updateSelectedExternalAccounts,
  updateDashboardAccounts,
} from '../../../../lib/server/dashboard-api/integrations'
import { getConversionsSnapshot } from '../../../../lib/server/dashboard-api/conversions'
import { getSyncSnapshot, runSync } from '../../../../lib/server/dashboard-api/sync'
import { persistAgencySession } from '../../../../lib/server/dashboard-api/session-state'

function buildPayload() {
  return {}
}

function buildAgencyPayload(agencyId) {
  return Promise.all([getIntegrationsSnapshot(agencyId), getSyncSnapshot(agencyId)]).then(([integrations, sync]) => ({
    ...integrations,
    ...sync,
    ...getConversionsSnapshot(),
  }))
}

export async function GET() {
  const { persona, error } = await requireAgencyAccess()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }
  return NextResponse.json(await buildAgencyPayload(persona.agency?.id))
}

export async function POST(request) {
  const { persona, error } = await requireAgencyAccess()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }
  const agencyId = persona.agency?.id
  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || '').trim()

  if (action === 'connect_provider') {
    const payload = await runConnectProvider(agencyId, String(body?.provider || '').trim())
    if (!payload) return NextResponse.json({ detail: 'Connection not found' }, { status: 404 })
    const response = NextResponse.json({ ...(await buildAgencyPayload(agencyId)), ...payload })
    return persistAgencySession(response, agencyId)
  }
  if (action === 'activate_dashboard_accounts') {
    const response = NextResponse.json({
      ...(await buildAgencyPayload(agencyId)),
      ...(await updateDashboardAccounts(agencyId, Array.isArray(body?.account_ids) ? body.account_ids : [])),
    })
    return persistAgencySession(response, agencyId)
  }
  if (action === 'select_external_accounts') {
    const provider = String(body?.provider || '').trim()
    const response = NextResponse.json({
      ...(await buildAgencyPayload(agencyId)),
      ...(await updateSelectedExternalAccounts(agencyId, provider, Array.isArray(body?.account_ids) ? body.account_ids : [])),
    })
    return persistAgencySession(response, agencyId)
  }
  if (action === 'activate_selected_external_accounts') {
    const provider = String(body?.provider || '').trim()
    const response = NextResponse.json({
      ...(await buildAgencyPayload(agencyId)),
      ...(await activateSelectedExternalAccounts(agencyId, provider)),
    })
    return persistAgencySession(response, agencyId)
  }
  if (action === 'run_sync') {
    const cookieStore = await cookies()
    const metaAccessToken = String(cookieStore.get('meta_access_token')?.value || '').trim() || null
    const response = NextResponse.json({
      ...(await buildAgencyPayload(agencyId)),
      ...(await runSync(agencyId, { metaAccessToken })),
      ...getConversionsSnapshot(),
    })
    return persistAgencySession(response, agencyId)
  }
  return NextResponse.json({ detail: 'Unsupported action' }, { status: 400 })
}
