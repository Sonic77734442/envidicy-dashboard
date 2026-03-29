import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { mockRates } from '../../../lib/dashboard/mock-data'
import { getSessionPersona } from '../../../lib/server/dashboard-api/session-persona'

export async function GET() {
  const persona = await getSessionPersona(await cookies())
  if (!persona) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(mockRates)
}
