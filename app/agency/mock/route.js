import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionPersona } from '../../../lib/server/dashboard-api/session-persona'
import { createClient, getAgency, listClients } from '../../../lib/dashboard/mock-tenant'
import { listDashboardAccounts, listDashboardAccountsForAgency } from '../../../lib/server/dashboard-api/agency-store'
import { hydrateAgencySession, persistAgencySession } from '../../../lib/server/dashboard-api/session-state'
import { ensureBootstrapData } from '../../../lib/server/db/bootstrap'
import { hasDatabase } from '../../../lib/server/db/client'
import { createClientDb, listAgenciesDb, listClientsDb } from '../../../lib/server/db/tenant'

function ensureAgencyAccess(persona) {
  return persona && (persona.role === 'platform_owner' || persona.role === 'agency_admin')
}

export async function GET() {
  const persona = await getSessionPersona(await cookies())
  if (!ensureAgencyAccess(persona)) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: persona ? 403 : 401 })
  }
  const agencyId = persona.agency?.id || 'agency_smartlab'
  if (hasDatabase()) {
    await ensureBootstrapData()
    const agencies = await listAgenciesDb()
    return NextResponse.json({
      agency: agencies.find((agency) => agency.id === agencyId) || { id: agencyId, name: persona.agency?.name || 'Agency' },
      accounts: await listDashboardAccountsForAgency(agencyId),
      clients: await listClientsDb(agencyId),
    })
  }
  await hydrateAgencySession(agencyId)
  return NextResponse.json({
    agency: getAgency(agencyId),
    accounts: listDashboardAccounts(agencyId),
    clients: listClients(agencyId),
  })
}

export async function POST(request) {
  const persona = await getSessionPersona(await cookies())
  if (!ensureAgencyAccess(persona)) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: persona ? 403 : 401 })
  }
  const body = await request.json().catch(() => ({}))
  const name = String(body?.name || '').trim()
  const viewerName = String(body?.viewer_name || '').trim()
  const viewerEmail = String(body?.viewer_email || '').trim().toLowerCase()
  if (!name || !viewerEmail) {
    return NextResponse.json({ detail: 'Name and viewer_email are required' }, { status: 400 })
  }
  const agencyId = persona.agency?.id || 'agency_smartlab'
  if (hasDatabase()) {
    await ensureBootstrapData()
    try {
      const client = await createClientDb(agencyId, {
        name,
        viewer_name: viewerName,
        viewer_email: viewerEmail,
      })
      return NextResponse.json({ client }, { status: 201 })
    } catch (error) {
      return NextResponse.json({ detail: error?.message || 'Failed to create client' }, { status: 400 })
    }
  }
  await hydrateAgencySession(agencyId)
  const client = createClient(agencyId, {
    name,
    viewer_name: viewerName,
    viewer_email: viewerEmail,
  })
  const response = NextResponse.json({ client }, { status: 201 })
  return persistAgencySession(response, agencyId)
}
