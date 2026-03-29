import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getVisibleAccountsByPlatform } from '../../../lib/dashboard/mock-session'
import { ensureSeedSync, getSyncedAccountMetrics } from '../../../lib/dashboard/mock-sync'
import { getSessionPersona } from '../../../lib/server/dashboard-api/session-persona'

export async function GET(request) {
  const persona = await getSessionPersona(await cookies())
  if (!persona) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  ensureSeedSync()
  const accountId = new URL(request.url).searchParams.get('account_id')
  const visibleAccounts = getVisibleAccountsByPlatform(persona, 'meta')
  const visible = new Set(visibleAccounts.map((row) => String(row.id)))
  if (accountId && !visible.has(String(accountId))) {
    return NextResponse.json({ detail: 'Forbidden account scope' }, { status: 403 })
  }
  const targetAccounts = accountId
    ? visibleAccounts.filter((account) => String(account.id) === String(accountId))
    : visibleAccounts
  const metricsRows = targetAccounts.map((account) => getSyncedAccountMetrics(account.id)).filter(Boolean)
  const campaigns = metricsRows.flatMap((row) => row.campaigns || [])
  const summary = metricsRows.reduce(
    (acc, row) => {
      const current = row.summary || {}
      acc.spend += Number(current.spend || 0)
      acc.impressions += Number(current.impressions || 0)
      acc.clicks += Number(current.clicks || 0)
      acc.conversions += Number(current.conversions || 0)
      acc.reach += Number(current.reach || 0)
      acc.currency = current.currency || acc.currency
      return acc
    },
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, currency: 'USD' }
  )
  summary.ctr = summary.impressions > 0 ? summary.clicks / summary.impressions : 0
  summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0
  summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0
  return NextResponse.json({ summary, campaigns })
}
