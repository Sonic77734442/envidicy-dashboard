import { NextResponse } from 'next/server'
import { ensureAccountAccess, getVisibleScope, requirePersona } from '../../../../../lib/server/dashboard-api/authz'
import { buildOverview } from '../../../../../lib/server/dashboard-api/reporting'

export async function GET(request) {
  const { persona, error } = await requirePersona()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }

  const params = new URL(request.url).searchParams
  const dateFrom = params.get('date_from')
  const dateTo = params.get('date_to')
  const requestedMeta = params.get('meta_account_id')
  const requestedGoogle = params.get('google_account_id')
  const requestedTiktok = params.get('tiktok_account_id')

  if (
    (requestedMeta && !(await ensureAccountAccess(persona, requestedMeta))) ||
    (requestedGoogle && !(await ensureAccountAccess(persona, requestedGoogle))) ||
    (requestedTiktok && !(await ensureAccountAccess(persona, requestedTiktok)))
  ) {
    return NextResponse.json({ detail: 'Forbidden account scope' }, { status: 403 })
  }

  const visibleScope = await getVisibleScope(persona)
  if (!visibleScope.accounts.length) {
    return NextResponse.json({ totals: {}, daily: {}, daily_by_account: {} })
  }

  return NextResponse.json(
    await buildOverview({
      dateFrom,
      dateTo,
      accountFilters: {
        meta: requestedMeta || null,
        google: requestedGoogle || null,
        tiktok: requestedTiktok || null,
      },
      visibleAccountsByPlatform: visibleScope.byPlatform,
    })
  )
}
