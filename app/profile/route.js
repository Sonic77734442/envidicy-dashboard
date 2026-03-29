import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionPersona } from '../../lib/server/dashboard-api/session-persona'

export async function GET() {
  const persona = await getSessionPersona(await cookies())
  if (!persona) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    email: persona.email,
    name: persona.name,
    role: persona.role,
    scope: persona.scope,
    agency: persona.agency,
    client: persona.client,
  })
}
