import { NextResponse } from 'next/server'
import { requirePersona } from '../../../../lib/server/dashboard-api/authz'

export async function GET() {
  const { persona, error } = await requirePersona()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
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
