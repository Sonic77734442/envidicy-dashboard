import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeGoogleAdsCode } from '../../../../../../lib/server/dashboard-api/google-ads'
import { finishGoogleOAuthForAgency } from '../../../../../../lib/server/dashboard-api/integrations'
import { persistAgencySession } from '../../../../../../lib/server/dashboard-api/session-state'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const stateValue = String(requestUrl.searchParams.get('state') || '').trim()
  const code = String(requestUrl.searchParams.get('code') || '').trim()
  const cookieStore = await cookies()
  const cookieState = String(cookieStore.get('google_oauth_state')?.value || '').trim()
  const cookieAgencyId = String(cookieStore.get('google_oauth_agency')?.value || '').trim()

  if (!stateValue || !code) {
    return NextResponse.redirect(new URL('/agency?google_error=missing_code_or_state', requestUrl.origin))
  }
  if (cookieState && cookieState !== stateValue) {
    return NextResponse.redirect(new URL('/agency?google_error=state_mismatch', requestUrl.origin))
  }

  try {
    const tokenPayload = await exchangeGoogleAdsCode({ code, origin: requestUrl.origin })
    if (cookieAgencyId) {
      await finishGoogleOAuthForAgency(cookieAgencyId, {
        access_token: tokenPayload.access_token,
        refresh_token: tokenPayload.refresh_token,
        expires_in: tokenPayload.expires_in,
        scopes: String(tokenPayload.scope || '')
          .split(/[ ,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
        external_owner: 'Agency Google Ads Connection',
      })
    }
    const redirectUrl = new URL('/agency', requestUrl.origin)
    redirectUrl.searchParams.set('google_connected', '1')
    redirectUrl.searchParams.set('provider', 'google')
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete('google_oauth_state')
    response.cookies.delete('google_oauth_agency')
    response.cookies.delete('google_oauth_connection')
    return cookieAgencyId ? persistAgencySession(response, cookieAgencyId) : response
  } catch (error) {
    const redirectUrl = new URL('/agency', requestUrl.origin)
    redirectUrl.searchParams.set('google_error', error?.message || 'callback_failed')
    return NextResponse.redirect(redirectUrl)
  }
}
