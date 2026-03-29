import { NextResponse } from 'next/server'
import { ensureAccountAccess, getVisibleScope, requirePersona } from '../../../../../lib/server/dashboard-api/authz'
import { buildPlatformInsights } from '../../../../../lib/server/dashboard-api/reporting'

export async function GET(request) {
  const { persona, error } = await requirePersona()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }

  const params = new URL(request.url).searchParams
  const platform = String(params.get('platform') || '').toLowerCase().trim()
  const accountId = params.get('account_id')
  const visibleScope = await getVisibleScope(persona)
  const visibleAccounts = visibleScope.byPlatform[platform] || []

  if (!platform || !['meta', 'google', 'tiktok', 'yandex'].includes(platform)) {
    return NextResponse.json({ detail: 'Unsupported platform' }, { status: 400 })
  }
  if (accountId && !(await ensureAccountAccess(persona, accountId))) {
    return NextResponse.json({ detail: 'Forbidden account scope' }, { status: 403 })
  }

  return NextResponse.json(await buildPlatformInsights({ platform, accountId, visibleAccounts }))
}
