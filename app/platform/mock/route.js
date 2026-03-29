import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionPersona } from '../../../lib/server/dashboard-api/session-persona'
import { createAgency, listAgencies } from '../../../lib/dashboard/mock-tenant'
import { ensureBootstrapData } from '../../../lib/server/db/bootstrap'
import { hasDatabase } from '../../../lib/server/db/client'
import { createAgencyDb, listAgenciesDb } from '../../../lib/server/db/tenant'

function ensurePlatformAccess(persona) {
  return persona && persona.role === 'platform_owner'
}

export async function GET() {
  const persona = await getSessionPersona(await cookies())
  if (!ensurePlatformAccess(persona)) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: persona ? 403 : 401 })
  }
  if (hasDatabase()) {
    await ensureBootstrapData()
    const agencies = await listAgenciesDb()
    console.info('[platform/mock] list_agencies_db', {
      count: agencies.length,
      actor: persona.email,
    })
    return NextResponse.json({ agencies })
  }
  return NextResponse.json({ agencies: listAgencies() })
}

export async function POST(request) {
  const persona = await getSessionPersona(await cookies())
  if (!ensurePlatformAccess(persona)) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: persona ? 403 : 401 })
  }
  const body = await request.json().catch(() => ({}))
  const name = String(body?.name || '').trim()
  const adminName = String(body?.admin_name || '').trim()
  const adminEmail = String(body?.admin_email || '').trim().toLowerCase()
  if (!name || !adminEmail) {
    return NextResponse.json({ detail: 'name and admin_email are required' }, { status: 400 })
  }
  if (hasDatabase()) {
    await ensureBootstrapData()
    try {
      const agency = await createAgencyDb({ name, admin_name: adminName, admin_email: adminEmail })
      const agencies = await listAgenciesDb()
      console.info('[platform/mock] create_agency_db', {
        actor: persona.email,
        agency_id: agency.id,
        agency_name: agency.name,
        admin_email: agency.admin_email,
        agencies_count: agencies.length,
      })
      return NextResponse.json({ agency, agencies }, { status: 201 })
    } catch (error) {
      console.error('[platform/mock] create_agency_db_failed', {
        actor: persona.email,
        name,
        admin_email: adminEmail,
        detail: error?.message || 'Failed to create agency',
      })
      return NextResponse.json({ detail: error?.message || 'Failed to create agency' }, { status: 400 })
    }
  }
  const agency = createAgency({ name, admin_name: adminName, admin_email: adminEmail })
  return NextResponse.json({ agency, agencies: listAgencies() }, { status: 201 })
}
