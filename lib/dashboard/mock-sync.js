import { listDashboardAccounts } from './mock-integrations'

const PLATFORM_CAMPAIGNS = {
  meta: [
    { campaign_id: 'm1', campaign_name: 'Prospecting | Broad', spend: 1820.44, impressions: 242300, clicks: 7211, reach: 131200 },
    { campaign_id: 'm2', campaign_name: 'Retargeting | Site', spend: 910.2, impressions: 88420, clicks: 3922, reach: 54200 },
    { campaign_id: 'm3', campaign_name: 'Catalog | Dynamic', spend: 650.83, impressions: 61700, clicks: 2440, reach: 33210 },
  ],
  google: [
    { campaign_id: 'g1', campaign_name: 'Search | Brand', spend: 1320.18, impressions: 72400, clicks: 8110, conversions: 411 },
    { campaign_id: 'g2', campaign_name: 'PMax | Kazakhstan', spend: 2140.72, impressions: 166200, clicks: 5905, conversions: 288 },
    { campaign_id: 'g3', campaign_name: 'YouTube | Reach', spend: 870.55, impressions: 318000, clicks: 1980, conversions: 75 },
  ],
  tiktok: [
    { campaign_id: 't1', campaign_name: 'Video | UGC 1', spend: 740.41, impressions: 214500, clicks: 4012, conversions: 120 },
    { campaign_id: 't2', campaign_name: 'Video | UGC 2', spend: 522.17, impressions: 173200, clicks: 2888, conversions: 92 },
    { campaign_id: 't3', campaign_name: 'Spark Ads | Creators', spend: 880.9, impressions: 201100, clicks: 5018, conversions: 143 },
  ],
  yandex: [
    { campaign_id: 'y1', campaign_name: 'Search | Brand KZ', spend: 410000, impressions: 124000, clicks: 5220, conversions: 310 },
    { campaign_id: 'y2', campaign_name: 'RSYA | Prospecting', spend: 265000, impressions: 311000, clicks: 2810, conversions: 142 },
  ],
}

const PLATFORM_AUDIENCE = {
  meta: {
    age_gender: [
      { age: '18-24', gender: 'Женщины', impressions: 84211, clicks: 2450, spend: 612.4 },
      { age: '25-34', gender: 'Женщины', impressions: 125120, clicks: 3820, spend: 910.1 },
      { age: '25-34', gender: 'Мужчины', impressions: 98012, clicks: 2901, spend: 744.2 },
      { age: '35-44', gender: 'Мужчины', impressions: 64810, clicks: 1804, spend: 482.8 },
    ],
    geo: {
      country: [
        { country: 'Казахстан', impressions: 250210, clicks: 7201, spend: 1830.4 },
        { country: 'Узбекистан', impressions: 34100, clicks: 900, spend: 210.7 },
      ],
      region: [
        { region: 'Алматы', impressions: 140200, clicks: 4120, spend: 1014.4 },
        { region: 'Астана', impressions: 74200, clicks: 2110, spend: 532.9 },
      ],
    },
    device: {
      impression_device: [
        { impression_device: 'mobile_app', impressions: 212200, clicks: 6021, spend: 1510.1 },
        { impression_device: 'desktop', impressions: 72110, clicks: 2130, spend: 530.5 },
      ],
      device_platform: [
        { device_platform: 'android', impressions: 160200, clicks: 4521, spend: 1144.2 },
        { device_platform: 'ios', impressions: 82110, clicks: 2410, spend: 621.8 },
      ],
    },
  },
  google: {
    age_gender: [
      { age_range: '18-24', gender: 'Женщины', impressions: 61200, clicks: 1920, spend: 522.1 },
      { age_range: '25-34', gender: 'Женщины', impressions: 94400, clicks: 3010, spend: 840.7 },
      { age_range: '25-34', gender: 'Мужчины', impressions: 90210, clicks: 2850, spend: 798.3 },
      { age_range: '35-44', gender: 'Мужчины', impressions: 50120, clicks: 1441, spend: 388.5 },
    ],
    geo: {
      country: [{ geo: 'Казахстан', impressions: 343196, clicks: 11994, spend: 2790.4 }],
      region: [
        { geo: 'Алматы', impressions: 180120, clicks: 6210, spend: 1440.8 },
        { geo: 'Астана', impressions: 91100, clicks: 3022, spend: 780.1 },
      ],
      city: [
        { geo: 'Алматы', impressions: 150100, clicks: 4980, spend: 1230.4 },
        { geo: 'Астана', impressions: 74210, clicks: 2440, spend: 610.8 },
        { geo: 'Шымкент', impressions: 32100, clicks: 1090, spend: 280.2 },
      ],
    },
    device: {
      device: [
        { device: 'Mobile', impressions: 323530, clicks: 11211, spend: 2600.1 },
        { device: 'Desktop', impressions: 12224, clicks: 601, spend: 144.0 },
        { device: 'Tablet', impressions: 7255, clicks: 182, spend: 46.3 },
      ],
    },
  },
}

const SYNC_JOBS = []
const ACCOUNT_SYNC_STATE = new Map()
const ACCOUNT_METRICS = new Map()
const ACCOUNT_AUDIENCE = new Map()
const CONVERSION_SOURCES = [
  { id: 'conv_meta_capi', provider: 'meta', label: 'Meta Conversion API', status: 'connected' },
  { id: 'conv_google_offline', provider: 'google', label: 'Google Offline Conversions', status: 'connected' },
  { id: 'conv_tiktok_events', provider: 'tiktok', label: 'TikTok Events API', status: 'draft' },
]
const ACCOUNT_CONVERSION_STATS = new Map()
const CONVERSION_EVENTS = []

function accountKey(accountId) {
  return String(accountId)
}

function hashAccountId(accountId) {
  return accountKey(accountId)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function isoDate(offset) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function withDerivedMetrics(row, currency = 'USD') {
  const spend = Number(row.spend || 0)
  const impressions = Number(row.impressions || 0)
  const clicks = Number(row.clicks || 0)
  const ctr = impressions > 0 ? clicks / impressions : 0
  const cpc = clicks > 0 ? spend / clicks : 0
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
  return { ...row, spend, impressions, clicks, ctr, cpc, cpm, currency, account_currency: currency }
}

function buildDailySeries(summary, multiplier = 1) {
  const dates = Array.from({ length: 31 }, (_, index) => isoDate(index - 30))
  return dates.map((date, idx) => ({
    date,
    spend: Number(((summary.spend / dates.length) * (0.82 + (idx % 5) * 0.06) * multiplier).toFixed(2)),
    clicks: Math.round((summary.clicks / dates.length) * (0.84 + (idx % 4) * 0.07) * multiplier),
    impressions: Math.round((summary.impressions / dates.length) * (0.8 + (idx % 6) * 0.05) * multiplier),
    conversions: Math.round((summary.conversions / dates.length) * (0.85 + (idx % 4) * 0.05) * multiplier),
  }))
}

function buildCampaignsForAccount(account) {
  const rows = PLATFORM_CAMPAIGNS[account.platform] || []
  const accountFactor = 0.72 + ((hashAccountId(account.id) % 5) * 0.08)
  return rows.map((row, idx) =>
    withDerivedMetrics(
      {
        ...row,
        spend: row.spend * accountFactor * (1 + idx * 0.05),
        impressions: Math.round(row.impressions * accountFactor),
        clicks: Math.round(row.clicks * accountFactor),
        conversions: Math.round(Number(row.conversions || 0) * accountFactor),
        reach: Math.round(Number(row.reach || 0) * accountFactor),
      },
      account.currency
    )
  )
}

function summarizeCampaigns(campaigns, currency) {
  const summary = campaigns.reduce(
    (acc, row) => {
      acc.spend += Number(row.spend || 0)
      acc.impressions += Number(row.impressions || 0)
      acc.clicks += Number(row.clicks || 0)
      acc.conversions += Number(row.conversions || 0)
      acc.reach += Number(row.reach || 0)
      return acc
    },
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, currency }
  )
  summary.ctr = summary.impressions > 0 ? summary.clicks / summary.impressions : 0
  summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0
  summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0
  return summary
}

function buildAudienceForAccount(account) {
  return PLATFORM_AUDIENCE[account.platform] || { age_gender: [], geo: { country: [], region: [], city: [] }, device: {} }
}

function buildConversionStats(account, summary, daily) {
  const provider = account.platform === 'meta' ? 'meta' : account.platform === 'google' ? 'google' : account.platform === 'tiktok' ? 'tiktok' : 'yandex'
  const trackedConversions = Math.max(0, Math.round(Number(summary.conversions || 0) * 0.86))
  const conversionValue = Number((trackedConversions * (provider === 'google' ? 18.4 : provider === 'meta' ? 16.8 : 11.2)).toFixed(2))
  const cpa = trackedConversions > 0 ? Number((Number(summary.spend || 0) / trackedConversions).toFixed(2)) : 0
  const roas = Number(summary.spend || 0) > 0 ? Number((conversionValue / Number(summary.spend || 0)).toFixed(2)) : 0
  const source = CONVERSION_SOURCES.find((row) => row.provider === provider) || null
  const dailyConversions = daily.map((row, index) => ({
    date: row.date,
    conversions: Math.max(0, Math.round(Number(row.conversions || 0) * (0.94 + (index % 3) * 0.03))),
    conversion_value: Number((((conversionValue || 0) / daily.length) * (0.9 + (index % 4) * 0.04)).toFixed(2)),
  }))
  return {
    account_id: account.id,
    source_id: source?.id || null,
    source_label: source?.label || 'Manual Upload',
    tracked_conversions: trackedConversions,
    conversion_value: conversionValue,
    cpa,
    roas,
    daily: dailyConversions,
  }
}

function seedConversionEvents(account, conversionStats) {
  const baseTypes = ['purchase', 'lead', 'qualified_lead']
  const total = Math.min(12, Math.max(3, Math.round(conversionStats.tracked_conversions / 20)))
  for (let index = 0; index < total; index += 1) {
    CONVERSION_EVENTS.push({
      id: `conv_evt_${account.id}_${index + 1}`,
      account_id: account.id,
      provider: account.platform,
      source_id: conversionStats.source_id,
      event_name: baseTypes[index % baseTypes.length],
      event_time: new Date(Date.now() - index * 86400000).toISOString(),
      value: Number((conversionStats.conversion_value / total).toFixed(2)),
      currency: account.currency,
      status: 'processed',
    })
  }
}

function queueJob(kind, payload) {
  const job = {
    id: `sync_${SYNC_JOBS.length + 1}`,
    kind,
    status: 'completed',
    created_at: new Date().toISOString(),
    payload,
  }
  SYNC_JOBS.unshift(job)
  return job
}

export function recordSyncJob(kind, payload, status = 'completed') {
  const job = {
    id: `sync_${SYNC_JOBS.length + 1}`,
    kind,
    status,
    created_at: new Date().toISOString(),
    payload,
  }
  SYNC_JOBS.unshift(job)
  return job
}

export function setAccountSyncSnapshot(account, snapshot) {
  const accountId = accountKey(account.id)
  const summary = snapshot?.summary || {}
  const campaigns = Array.isArray(snapshot?.campaigns) ? snapshot.campaigns : []
  const daily = Array.isArray(snapshot?.daily) ? snapshot.daily : []
  const audience = snapshot?.audience || {}
  const conversionStats = buildConversionStats(account, summary, daily)

  ACCOUNT_METRICS.set(accountId, {
    account_id: account.id,
    platform: account.platform,
    summary: {
      ...summary,
      tracked_conversions: conversionStats.tracked_conversions,
      conversion_value: conversionStats.conversion_value,
      cpa: conversionStats.cpa,
      roas: conversionStats.roas,
    },
    campaigns,
    daily,
  })
  ACCOUNT_AUDIENCE.set(accountId, audience)
  ACCOUNT_CONVERSION_STATS.set(accountId, conversionStats)
  ACCOUNT_SYNC_STATE.set(accountId, {
    account_id: account.id,
    last_synced_at: new Date().toISOString(),
    status: 'ready',
  })
}

export function buildMockSnapshotForAccount(account) {
  const campaigns = buildCampaignsForAccount(account)
  const summary = summarizeCampaigns(campaigns, account.currency)
  const daily = buildDailySeries(summary, 1)
  return {
    summary,
    campaigns,
    daily,
    audience: buildAudienceForAccount(account),
  }
}

export function syncDashboardAccounts(agencyId = null, options = {}) {
  const skipPlatforms = new Set(options.skipPlatforms || [])
  const accounts = listDashboardAccounts(agencyId)
  if (!agencyId) CONVERSION_EVENTS.length = 0
  accounts.forEach((account) => {
    if (skipPlatforms.has(account.platform)) return
    const campaigns = buildCampaignsForAccount(account)
    const summary = summarizeCampaigns(campaigns, account.currency)
    const daily = buildDailySeries(summary, 1)
    const conversionStats = buildConversionStats(account, summary, daily)
    ACCOUNT_METRICS.set(accountKey(account.id), {
      account_id: account.id,
      platform: account.platform,
      summary: {
        ...summary,
        tracked_conversions: conversionStats.tracked_conversions,
        conversion_value: conversionStats.conversion_value,
        cpa: conversionStats.cpa,
        roas: conversionStats.roas,
      },
      campaigns,
      daily,
    })
    ACCOUNT_AUDIENCE.set(accountKey(account.id), buildAudienceForAccount(account))
    ACCOUNT_CONVERSION_STATS.set(accountKey(account.id), conversionStats)
    seedConversionEvents(account, conversionStats)
    ACCOUNT_SYNC_STATE.set(accountKey(account.id), {
      account_id: account.id,
      last_synced_at: new Date().toISOString(),
      status: 'ready',
    })
  })
  queueJob('account_sync', { agency_id: agencyId, account_ids: accounts.map((account) => account.id) })
  return {
    jobs: listSyncJobs(),
    states: listAccountSyncState(),
  }
}

export function listSyncJobs() {
  return [...SYNC_JOBS]
}

export function listAccountSyncState() {
  return Array.from(ACCOUNT_SYNC_STATE.values())
}

export function getSyncedAccountMetrics(accountId) {
  return ACCOUNT_METRICS.get(accountKey(accountId)) || null
}

export function getSyncedAudience(accountId, group) {
  const payload = ACCOUNT_AUDIENCE.get(accountKey(accountId)) || null
  if (!payload) return group === 'geo' ? { country: [], region: [], city: [] } : group === 'device' ? { device: [], impression_device: [], device_platform: [] } : []
  if (group === 'age_gender') return payload.age_gender || []
  if (group === 'geo') return payload.geo || { country: [], region: [], city: [] }
  if (group === 'device') return payload.device || { device: [], impression_device: [], device_platform: [] }
  return []
}

export function getAccountConversionStats(accountId) {
  return ACCOUNT_CONVERSION_STATS.get(accountKey(accountId)) || null
}

export function listConversionSources() {
  return [...CONVERSION_SOURCES]
}

export function listConversionEvents(limit = 20) {
  return [...CONVERSION_EVENTS].slice(0, limit)
}

export function getOverviewFromSync(dateFrom, dateTo, accountFilters = {}, visibleAccountsByPlatform = {}) {
  const dates = []
  const start = new Date(dateFrom)
  const end = new Date(dateTo)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { totals: {}, daily: {}, daily_by_account: {} }
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }

  const totals = {}
  const daily = {}
  const dailyByAccount = {}

  ;['meta', 'google', 'tiktok', 'yandex'].forEach((platform) => {
    const accounts = Array.isArray(visibleAccountsByPlatform[platform]) ? visibleAccountsByPlatform[platform] : []
    const selectedId = accountFilters[platform]
    const platformAccounts = selectedId ? accounts.filter((account) => String(account.id) === String(selectedId)) : accounts

    const accountMetrics = platformAccounts.map((account) => ({
      account,
      metrics: getSyncedAccountMetrics(account.id),
    })).filter((row) => row.metrics)

    totals[platform] = accountMetrics.reduce(
      (acc, row) => {
        const summary = row.metrics.summary || {}
        acc.spend += Number(summary.spend || 0)
        acc.impressions += Number(summary.impressions || 0)
        acc.clicks += Number(summary.clicks || 0)
        acc.conversions += Number(summary.conversions || 0)
        acc.reach += Number(summary.reach || 0)
        acc.tracked_conversions += Number(summary.tracked_conversions || 0)
        acc.conversion_value += Number(summary.conversion_value || 0)
        acc.currency = summary.currency || acc.currency
        return acc
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, tracked_conversions: 0, conversion_value: 0, reach: 0, currency: platform === 'yandex' ? 'KZT' : 'USD' }
    )
    totals[platform].ctr = totals[platform].impressions > 0 ? totals[platform].clicks / totals[platform].impressions : 0
    totals[platform].cpc = totals[platform].clicks > 0 ? totals[platform].spend / totals[platform].clicks : 0
    totals[platform].cpm = totals[platform].impressions > 0 ? (totals[platform].spend / totals[platform].impressions) * 1000 : 0
    totals[platform].cpa = totals[platform].tracked_conversions > 0 ? totals[platform].spend / totals[platform].tracked_conversions : 0
    totals[platform].roas = totals[platform].spend > 0 ? totals[platform].conversion_value / totals[platform].spend : 0

    daily[platform] = dates.map((date) => {
      const points = accountMetrics.map((row) => row.metrics.daily.find((entry) => entry.date === date)).filter(Boolean)
      return {
        date,
        spend: Number(points.reduce((sum, row) => sum + Number(row.spend || 0), 0).toFixed(2)),
        clicks: points.reduce((sum, row) => sum + Number(row.clicks || 0), 0),
        impressions: points.reduce((sum, row) => sum + Number(row.impressions || 0), 0),
        conversions: points.reduce((sum, row) => sum + Number(row.conversions || 0), 0),
      }
    })

    dailyByAccount[platform] = accountMetrics.map((row) => ({
      account_id: row.account.id,
      name: row.account.name,
      platform,
      daily: dates.map((date) => row.metrics.daily.find((entry) => entry.date === date) || { date, spend: 0, clicks: 0, impressions: 0, conversions: 0 }),
    }))
  })

  return { totals, daily, daily_by_account: dailyByAccount }
}

export function ensureSeedSync(agencyId = null) {
  if (!listAccountSyncState().length) {
    syncDashboardAccounts(agencyId)
  }
}

export function exportSyncState(agencyId = null, accountIds = []) {
  const allowIds = new Set((accountIds || []).map((id) => accountKey(id)))
  const include = (id) => !agencyId || !allowIds.size || allowIds.has(accountKey(id))
  return {
    sync_jobs: listSyncJobs().filter((job) => !agencyId || !job.payload?.agency_id || job.payload.agency_id === agencyId),
    sync_state: listAccountSyncState().filter((row) => include(row.account_id)),
    account_metrics: Array.from(ACCOUNT_METRICS.entries())
      .filter(([accountId]) => include(accountId))
      .map(([accountId, value]) => [String(accountId), value]),
    account_audience: Array.from(ACCOUNT_AUDIENCE.entries())
      .filter(([accountId]) => include(accountId))
      .map(([accountId, value]) => [String(accountId), value]),
    account_conversion_stats: Array.from(ACCOUNT_CONVERSION_STATS.entries())
      .filter(([accountId]) => include(accountId))
      .map(([accountId, value]) => [String(accountId), value]),
    conversion_events: [...CONVERSION_EVENTS].filter((row) => include(row.account_id)),
  }
}

export function importSyncState(payload) {
  if (!payload) return
  SYNC_JOBS.length = 0
  ;(payload.sync_jobs || []).forEach((row) => SYNC_JOBS.push(row))

  ACCOUNT_SYNC_STATE.clear()
  ;(payload.sync_state || []).forEach((row) => {
    if (row?.account_id != null) ACCOUNT_SYNC_STATE.set(accountKey(row.account_id), row)
  })

  ACCOUNT_METRICS.clear()
  ;(payload.account_metrics || []).forEach(([accountId, value]) => {
    ACCOUNT_METRICS.set(accountKey(accountId), value)
  })

  ACCOUNT_AUDIENCE.clear()
  ;(payload.account_audience || []).forEach(([accountId, value]) => {
    ACCOUNT_AUDIENCE.set(accountKey(accountId), value)
  })

  ACCOUNT_CONVERSION_STATS.clear()
  ;(payload.account_conversion_stats || []).forEach(([accountId, value]) => {
    ACCOUNT_CONVERSION_STATS.set(accountKey(accountId), value)
  })

  CONVERSION_EVENTS.length = 0
  ;(payload.conversion_events || []).forEach((row) => CONVERSION_EVENTS.push(row))
}
