import { NextResponse } from 'next/server'
import { getVisibleScope, requirePersona } from '../../../../../lib/server/dashboard-api/authz'

export async function GET() {
  const { persona, error } = await requirePersona()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }
  const scope = await getVisibleScope(persona)
  return NextResponse.json(scope.accounts)
}
