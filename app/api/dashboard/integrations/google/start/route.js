import { NextResponse } from 'next/server'
import { requireAgencyAccess } from '../../../../../../lib/server/dashboard-api/authz'
import { buildGoogleAdsOAuthUrl } from '../../../../../../lib/server/dashboard-api/google-ads'
import { getProviderConnectionForAgency } from '../../../../../../lib/server/dashboard-api/agency-store'

export async function GET(request) {
  const { persona, error } = await requireAgencyAccess()
  if (error) {
    const target = new URL(error.status === 401 ? '/login' : '/dashboard', request.url)
    return NextResponse.redirect(target)
  }

  const agencyId = persona.agency?.id
  const connection = await getProviderConnectionForAgency(agencyId, 'google')
  if (!connection) {
    return NextResponse.json({ detail: 'Google connection not found' }, { status: 404 })
  }

  const requestUrl = new URL(request.url)
  const state = `google_${agencyId}_${Date.now()}`
  const response = NextResponse.redirect(buildGoogleAdsOAuthUrl({ state, origin: requestUrl.origin }))
  response.cookies.set('google_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
  response.cookies.set('google_oauth_agency', agencyId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
  response.cookies.set('google_oauth_connection', connection.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
  return response
}
