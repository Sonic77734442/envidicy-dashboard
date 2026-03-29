import { NextResponse } from 'next/server'
import { requireAgencyAccess } from '../../../../lib/server/dashboard-api/authz'
import { getConversionsSnapshot } from '../../../../lib/server/dashboard-api/conversions'

export async function GET() {
  const { error } = await requireAgencyAccess()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }
  return NextResponse.json(getConversionsSnapshot())
}
