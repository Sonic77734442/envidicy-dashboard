import { getOverviewFromSync, getSyncedAccountMetrics, getSyncedAudience, ensureSeedSync } from '../../dashboard/mock-sync'
import { getProviderConnectionForAccount } from './integrations'
import { buildMetaAudiencePayload, buildMetaInsightsPayload } from './meta-reporting'
import { hasDatabase } from '../db/client'
import { getLatestAccountSnapshotDb } from '../db/sync'

function zeroSummary(currency = 'USD') {
  return {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    tracked_conversions: 0,
    conversion_value: 0,
    reach: 0,
    currency,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    cpa: 0,
    roas: 0,
  }
}

export async function buildPlatformInsights({ platform, accountId, visibleAccounts }) {
  ensureSeedSync()
  const targetAccounts = accountId
    ? visibleAccounts.filter((account) => String(account.id) === String(accountId))
    : visibleAccounts

  if (platform === 'meta') {
    const payloads = await Promise.all(targetAccounts.map(async (account) => {
      const metricsRow = hasDatabase() ? (await getLatestAccountSnapshotDb(account.id)) : getSyncedAccountMetrics(account.id)
      const connection = await getProviderConnectionForAccount(account.agency_id, account)
      return buildMetaInsightsPayload({ connection, account, metricsRow })
    }))
    const campaigns = payloads.flatMap((row) => row.campaigns || [])
    const hasAnyMetrics = payloads.some((row) => Number(row?.summary?.impressions || 0) > 0 || (row?.campaigns || []).length > 0)
    const summary = payloads.reduce(
      (acc, row) => {
        const current = row.summary || {}
        acc.spend += Number(current.spend || 0)
        acc.impressions += Number(current.impressions || 0)
        acc.clicks += Number(current.clicks || 0)
        acc.reach += Number(current.reach || 0)
        acc.currency = current.currency || acc.currency
        return acc
      },
      zeroSummary('USD')
    )
    summary.ctr = summary.impressions > 0 ? summary.clicks / summary.impressions : 0
    summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0
    summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0
    return {
      summary,
      campaigns,
      status: hasAnyMetrics
        ? 'Meta snapshot loaded.'
        : 'No snapshot data is available yet for the selected Meta account. Run sync in the agency workspace.',
    }
  }

  const metricsRows = targetAccounts.map((account) => getSyncedAccountMetrics(account.id)).filter(Boolean)
  const campaigns = metricsRows.flatMap((row) => row.campaigns || [])
  const summary = metricsRows.reduce(
    (acc, row) => {
      const current = row.summary || {}
      acc.spend += Number(current.spend || 0)
      acc.impressions += Number(current.impressions || 0)
      acc.clicks += Number(current.clicks || 0)
      acc.conversions += Number(current.conversions || 0)
      acc.tracked_conversions += Number(current.tracked_conversions || 0)
      acc.conversion_value += Number(current.conversion_value || 0)
      acc.reach += Number(current.reach || 0)
      acc.currency = current.currency || acc.currency
      return acc
    },
    zeroSummary(platform === 'yandex' ? 'KZT' : 'USD')
  )
  summary.ctr = summary.impressions > 0 ? summary.clicks / summary.impressions : 0
  summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0
  summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0
  summary.cpa = summary.tracked_conversions > 0 ? summary.spend / summary.tracked_conversions : 0
  summary.roas = summary.spend > 0 ? summary.conversion_value / summary.spend : 0
  return { summary, campaigns, status: campaigns.length ? 'Snapshot loaded.' : 'No snapshot data is available yet for the selected account.' }
}

export async function buildAudiencePayload({ accounts = [], group }) {
  ensureSeedSync()
  const payload = { accounts: [] }
  if (!accounts.length) return payload

  for (const account of accounts) {
    const snapshot = hasDatabase() ? await getLatestAccountSnapshotDb(account.id) : null
    const audience = snapshot?.audience
      ? group === 'age_gender'
        ? snapshot.audience.age_gender || []
        : group === 'geo'
          ? snapshot.audience.geo || { country: [], region: [], city: [] }
          : snapshot.audience.device || { device: [], impression_device: [], device_platform: [] }
      : getSyncedAudience(account.id, group)

    if (account.platform === 'meta') {
      const connection = await getProviderConnectionForAccount(account.agency_id, account)
      const metaPayload = await buildMetaAudiencePayload({ connection, account, group, audience })
      payload.accounts.push(...(metaPayload.accounts || []))
      continue
    }

    if (group === 'age_gender') {
      payload.accounts.push({ account_id: account.id, name: account.name, age_gender: audience })
    } else if (group === 'geo') {
      if (account.platform === 'meta') {
        payload.accounts.push({ account_id: account.id, name: account.name, country: audience.country || [], region: audience.region || [] })
      } else {
        payload.accounts.push({
          account_id: account.id,
          name: account.name,
          country: audience.country || [],
          region: audience.region || [],
          city: audience.city || [],
        })
      }
    } else if (group === 'device') {
      if (account.platform === 'meta') {
        payload.accounts.push({
          account_id: account.id,
          name: account.name,
          impression_device: audience.impression_device || [],
          device_platform: audience.device_platform || [],
        })
      } else {
        payload.accounts.push({ account_id: account.id, name: account.name, device: audience.device || [] })
      }
    }
  }
  return payload
}

export function buildOverview({ dateFrom, dateTo, accountFilters, visibleAccountsByPlatform }) {
  if (hasDatabase()) {
    return Promise.all(
      ['meta', 'google', 'tiktok', 'yandex'].map(async (platform) => {
        const accounts = Array.isArray(visibleAccountsByPlatform[platform]) ? visibleAccountsByPlatform[platform] : []
        const selectedId = accountFilters[platform]
        const platformAccounts = selectedId ? accounts.filter((account) => String(account.id) === String(selectedId)) : accounts
        const snapshots = (await Promise.all(platformAccounts.map((account) => getLatestAccountSnapshotDb(account.id)))).filter(Boolean)
        const total = snapshots.reduce(
          (acc, snapshot) => {
            const summary = snapshot.summary || {}
            acc.spend += Number(summary.spend || 0)
            acc.impressions += Number(summary.impressions || 0)
            acc.clicks += Number(summary.clicks || 0)
            acc.conversions += Number(summary.conversions || 0)
            acc.reach += Number(summary.reach || 0)
            acc.tracked_conversions += Number(summary.tracked_conversions || summary.conversions || 0)
            acc.conversion_value += Number(summary.conversion_value || 0)
            acc.currency = summary.currency || acc.currency
            return acc
          },
          { spend: 0, impressions: 0, clicks: 0, conversions: 0, tracked_conversions: 0, conversion_value: 0, reach: 0, currency: platform === 'yandex' ? 'KZT' : 'USD' }
        )
        total.ctr = total.impressions > 0 ? total.clicks / total.impressions : 0
        total.cpc = total.clicks > 0 ? total.spend / total.clicks : 0
        total.cpm = total.impressions > 0 ? (total.spend / total.impressions) * 1000 : 0
        total.cpa = total.tracked_conversions > 0 ? total.spend / total.tracked_conversions : 0
        total.roas = total.spend > 0 ? total.conversion_value / total.spend : 0

        const dailyMap = new Map()
        snapshots.forEach((snapshot) => {
          ;(snapshot.daily || []).forEach((point) => {
            const existing = dailyMap.get(point.date) || { date: point.date, spend: 0, clicks: 0, impressions: 0, conversions: 0 }
            existing.spend += Number(point.spend || 0)
            existing.clicks += Number(point.clicks || 0)
            existing.impressions += Number(point.impressions || 0)
            existing.conversions += Number(point.conversions || 0)
            dailyMap.set(point.date, existing)
          })
        })

        const daily = Array.from(dailyMap.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
        const dailyByAccount = platformAccounts.map((account, index) => ({
          account_id: account.id,
          name: account.name,
          platform,
          daily: (snapshots[index]?.daily || []).map((point) => ({
            date: point.date,
            spend: Number(point.spend || 0),
            clicks: Number(point.clicks || 0),
            impressions: Number(point.impressions || 0),
            conversions: Number(point.conversions || 0),
          })),
        }))

        return { platform, total, daily, dailyByAccount }
      })
    ).then((rows) => ({
      totals: Object.fromEntries(rows.map((row) => [row.platform, row.total])),
      daily: Object.fromEntries(rows.map((row) => [row.platform, row.daily])),
      daily_by_account: Object.fromEntries(rows.map((row) => [row.platform, row.dailyByAccount])),
    }))
  }
  ensureSeedSync()
  return getOverviewFromSync(dateFrom, dateTo, accountFilters, visibleAccountsByPlatform)
}
