import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionPersona } from '../../../../lib/server/dashboard-api/session-persona'
import { setClientAssignments } from '../../../../lib/dashboard/mock-tenant'
import { listDashboardAccounts, listDashboardAccountsForAgency } from '../../../../lib/server/dashboard-api/agency-store'
import { hydrateAgencySession, persistAgencySession } from '../../../../lib/server/dashboard-api/session-state'
import { hasDatabase } from '../../../../lib/server/db/client'
import { setClientAssignmentsDb } from '../../../../lib/server/db/tenant'

function ensureAgencyAccess(persona) {
  return persona && (persona.role === 'platform_owner' || persona.role === 'agency_admin')
}

export async function POST(request) {
  const persona = await getSessionPersona(await cookies())
  if (!ensureAgencyAccess(persona)) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: persona ? 403 : 401 })
  }
  const body = await request.json().catch(() => ({}))
  const clientId = String(body?.client_id || '').trim()
  const accountIds = Array.isArray(body?.account_ids) ? body.account_ids : []
  if (!clientId) {
    return NextResponse.json({ detail: 'client_id is required' }, { status: 400 })
  }
  const agencyId = persona.agency?.id || 'agency_smartlab'
  if (hasDatabase()) {
    const validIds = new Set((await listDashboardAccountsForAgency(agencyId, { includeAllStatuses: true })).map((account) => String(account.id)))
    const filteredIds = accountIds.filter((id) => validIds.has(String(id)))
    await setClientAssignmentsDb(clientId, filteredIds)
    return NextResponse.json({ client: { id: clientId, account_ids: filteredIds } })
  }
  await hydrateAgencySession(agencyId)
  const client = setClientAssignments(
    agencyId,
    clientId,
    accountIds,
    listDashboardAccounts(agencyId).map((account) => account.id)
  )
  if (!client) {
    return NextResponse.json({ detail: 'Client not found' }, { status: 404 })
  }
  const response = NextResponse.json({ client })
  return persistAgencySession(response, agencyId)
}
