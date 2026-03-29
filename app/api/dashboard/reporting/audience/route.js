import { NextResponse } from 'next/server'
import { ensureAccountAccess, getVisibleScope, requirePersona } from '../../../../../lib/server/dashboard-api/authz'
import { buildAudiencePayload } from '../../../../../lib/server/dashboard-api/reporting'

export async function GET(request) {
  const { persona, error } = await requirePersona()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }

  const params = new URL(request.url).searchParams
  const platform = String(params.get('platform') || '').toLowerCase().trim()
  const group = params.get('group')
  const accountId = params.get('account_id')
  if (!platform || !['meta', 'google'].includes(platform)) {
    return NextResponse.json({ detail: 'Unsupported platform' }, { status: 400 })
  }
  if (accountId && !(await ensureAccountAccess(persona, accountId))) {
    return NextResponse.json({ detail: 'Forbidden account scope' }, { status: 403 })
  }

  const visibleAccounts = (await getVisibleScope(persona)).byPlatform[platform] || []
  const accounts = accountId
    ? visibleAccounts.filter((row) => String(row.id) === String(accountId))
    : visibleAccounts
  return NextResponse.json(await buildAudiencePayload({ accounts, group }))
}
