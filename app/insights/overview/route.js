import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { canAccessAccount, getVisibleAccountsByPlatform, getVisibleAccountsForPersona } from '../../../lib/dashboard/mock-session'
import { ensureSeedSync, getOverviewFromSync } from '../../../lib/dashboard/mock-sync'
import { getSessionPersona } from '../../../lib/server/dashboard-api/session-persona'

export async function GET(request) {
  const persona = await getSessionPersona(await cookies())
  if (!persona) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  ensureSeedSync()
  const params = new URL(request.url).searchParams
  const dateFrom = params.get('date_from')
  const dateTo = params.get('date_to')
  const requestedMeta = params.get('meta_account_id')
  const requestedGoogle = params.get('google_account_id')
  const requestedTiktok = params.get('tiktok_account_id')

  if (
    (requestedMeta && !canAccessAccount(persona, requestedMeta)) ||
    (requestedGoogle && !canAccessAccount(persona, requestedGoogle)) ||
    (requestedTiktok && !canAccessAccount(persona, requestedTiktok))
  ) {
    return NextResponse.json({ detail: 'Forbidden account scope' }, { status: 403 })
  }

  const visibleAccounts = getVisibleAccountsForPersona(persona)
  const visibleByPlatform = {
    meta: getVisibleAccountsByPlatform(persona, 'meta'),
    google: getVisibleAccountsByPlatform(persona, 'google'),
    tiktok: getVisibleAccountsByPlatform(persona, 'tiktok'),
  }
  if (!visibleAccounts.length) {
    return NextResponse.json({ totals: {}, daily: {}, daily_by_account: {} })
  }
  return NextResponse.json(
    getOverviewFromSync(dateFrom, dateTo, {
      meta: requestedMeta || visibleByPlatform.meta[0]?.id || null,
      google: requestedGoogle || visibleByPlatform.google[0]?.id || null,
      tiktok: requestedTiktok || visibleByPlatform.tiktok[0]?.id || null,
    }, visibleByPlatform)
  )
}
