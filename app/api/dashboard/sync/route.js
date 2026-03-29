import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAgencyAccess } from '../../../../lib/server/dashboard-api/authz'
import { getSyncSnapshot, runSync } from '../../../../lib/server/dashboard-api/sync'

export async function GET() {
  const { persona, error } = await requireAgencyAccess()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }
  return NextResponse.json(await getSyncSnapshot(persona.agency?.id))
}

export async function POST() {
  const { persona, error } = await requireAgencyAccess()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }
  const cookieStore = await cookies()
  const metaAccessToken = String(cookieStore.get('meta_access_token')?.value || '').trim() || null
  return NextResponse.json(await runSync(persona.agency?.id, { metaAccessToken }))
}
