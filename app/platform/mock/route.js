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
    return NextResponse.json({ agencies: await listAgenciesDb() })
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
      return NextResponse.json({ agency, agencies: await listAgenciesDb() }, { status: 201 })
    } catch (error) {
      return NextResponse.json({ detail: error?.message || 'Failed to create agency' }, { status: 400 })
    }
  }
  const agency = createAgency({ name, admin_name: adminName, admin_email: adminEmail })
  return NextResponse.json({ agency, agencies: listAgencies() }, { status: 201 })
}
