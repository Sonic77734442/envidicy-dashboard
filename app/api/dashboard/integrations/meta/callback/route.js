import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { finishMetaOAuth, finishMetaOAuthForAgency } from '../../../../../../lib/server/dashboard-api/integrations'
import { persistAgencySession } from '../../../../../../lib/server/dashboard-api/session-state'

async function exchangeMetaCode({ code, redirectUri, origin }) {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error('META_APP_ID or META_APP_SECRET is not set')
  }

  const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri || `${origin}/api/dashboard/integrations/meta/callback`)
  tokenUrl.searchParams.set('code', code)

  const response = await fetch(tokenUrl, { method: 'GET', cache: 'no-store' })
  if (!response.ok) {
    const detail = await response.text().catch(() => 'Meta token exchange failed')
    throw new Error(detail || 'Meta token exchange failed')
  }
  const payload = await response.json()
  return {
    access_token: payload.access_token,
    external_owner: 'Agency Meta Connection',
    raw: payload,
  }
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const stateValue = String(requestUrl.searchParams.get('state') || '').trim()
  const code = String(requestUrl.searchParams.get('code') || '').trim()
  const isMock = requestUrl.searchParams.get('mock') === '1'
  const cookieStore = await cookies()
  const cookieState = String(cookieStore.get('meta_oauth_state')?.value || '').trim()
  const cookieAgencyId = String(cookieStore.get('meta_oauth_agency')?.value || '').trim()

  if (!stateValue) {
    return NextResponse.redirect(new URL('/agency?meta_error=missing_state', requestUrl.origin))
  }
  if (cookieState && cookieState !== stateValue) {
    return NextResponse.redirect(new URL('/agency?meta_error=state_mismatch', requestUrl.origin))
  }

  try {
    const tokenPayload = isMock
      ? { access_token: 'meta_mock_oauth_token', external_owner: 'Mock Agency Meta Connection' }
      : await exchangeMetaCode({
          code,
          redirectUri: process.env.META_REDIRECT_URI,
          origin: requestUrl.origin,
        })

    const connection = (finishMetaOAuth(stateValue, tokenPayload)) || (cookieAgencyId ? await finishMetaOAuthForAgency(cookieAgencyId, tokenPayload) : null)
    if (!connection) {
      return NextResponse.redirect(new URL('/agency?meta_error=invalid_state', requestUrl.origin))
    }
    const redirectUrl = new URL('/agency', requestUrl.origin)
    redirectUrl.searchParams.set('meta_connected', '1')
    redirectUrl.searchParams.set('provider', 'meta')
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete('meta_oauth_state')
    response.cookies.delete('meta_oauth_agency')
    response.cookies.delete('meta_access_token')
    response.cookies.delete('meta_access_agency')
    return cookieAgencyId ? persistAgencySession(response, cookieAgencyId) : response
  } catch (error) {
    const redirectUrl = new URL('/agency', requestUrl.origin)
    redirectUrl.searchParams.set('meta_error', error?.message || 'callback_failed')
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete('meta_oauth_state')
    response.cookies.delete('meta_oauth_agency')
    return response
  }
}
