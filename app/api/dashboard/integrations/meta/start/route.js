import { NextResponse } from 'next/server'
import { requireAgencyAccess } from '../../../../../../lib/server/dashboard-api/authz'
import { startMetaOAuth } from '../../../../../../lib/server/dashboard-api/integrations'

function buildMetaAuthUrl({ appId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    scope: 'ads_read,business_management',
  })
  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`
}

export async function GET(request) {
  const { persona, error } = await requireAgencyAccess()
  if (error) {
    const target = new URL(error.status === 401 ? '/login' : '/dashboard', request.url)
    return NextResponse.redirect(target)
  }

  const agencyId = persona.agency?.id
  const pending = await startMetaOAuth(agencyId)
  if (!pending) {
    return NextResponse.json({ detail: 'Meta connection not found' }, { status: 404 })
  }

  const requestUrl = new URL(request.url)
  const appId = process.env.META_APP_ID
  const redirectUri =
    process.env.META_REDIRECT_URI ||
    `${requestUrl.origin}/api/dashboard/integrations/meta/callback`

  if (!appId) {
    const callbackUrl = new URL('/api/dashboard/integrations/meta/callback', requestUrl.origin)
    callbackUrl.searchParams.set('state', pending.state)
    callbackUrl.searchParams.set('mock', '1')
    callbackUrl.searchParams.set('code', 'mock_meta_code')
    const response = NextResponse.redirect(callbackUrl)
    response.cookies.set('meta_oauth_state', pending.state, { httpOnly: true, sameSite: 'lax', path: '/' })
    response.cookies.set('meta_oauth_agency', agencyId, { httpOnly: true, sameSite: 'lax', path: '/' })
    return response
  }

  const response = NextResponse.redirect(buildMetaAuthUrl({ appId, redirectUri, state: pending.state }))
  response.cookies.set('meta_oauth_state', pending.state, { httpOnly: true, sameSite: 'lax', path: '/' })
  response.cookies.set('meta_oauth_agency', agencyId, { httpOnly: true, sameSite: 'lax', path: '/' })
  return response
}
