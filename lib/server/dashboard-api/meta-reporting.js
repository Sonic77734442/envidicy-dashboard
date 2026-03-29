function normalizeMetaExternalId(externalId) {
  const raw = String(externalId || '').trim()
  if (!raw) return ''
  return raw.replace(/^act_/i, '')
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function isoDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function getConnectionToken(connection) {
  if (!connection) return null
  return connection.access_token || connection.token || null
}

function toNumber(value) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}

function deriveSummary(campaigns, currency = 'USD') {
  const summary = campaigns.reduce(
    (acc, row) => {
      acc.spend += toNumber(row.spend)
      acc.impressions += toNumber(row.impressions)
      acc.clicks += toNumber(row.clicks)
      acc.reach += toNumber(row.reach)
      return acc
    },
    { spend: 0, impressions: 0, clicks: 0, reach: 0, currency }
  )
  summary.ctr = summary.impressions > 0 ? summary.clicks / summary.impressions : 0
  summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0
  summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0
  return summary
}

export function buildMetaReportingContext({ connection, account }) {
  return {
    provider: 'meta',
    connection_id: connection?.id || null,
    account_external_id: normalizeMetaExternalId(account?.external_id),
    access_token: getConnectionToken(connection),
    auth_mode: connection?.auth_mode || 'mock',
    can_fetch_live: Boolean(getConnectionToken(connection) && normalizeMetaExternalId(account?.external_id)),
  }
}

async function fetchMetaJson(url) {
  const response = await fetch(url, { method: 'GET', cache: 'no-store' })
  if (!response.ok) {
    const detail = await response.text().catch(() => 'Meta request failed')
    throw new Error(detail || 'Meta request failed')
  }
  return response.json()
}

async function fetchMetaInsights({ accessToken, externalAccountId, fields, level = 'account', since, until, breakdowns = null, timeIncrement = null }) {
  const normalizedExternalId = normalizeMetaExternalId(externalAccountId)
  const url = new URL(`https://graph.facebook.com/v20.0/act_${normalizedExternalId}/insights`)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('level', level)
  url.searchParams.set('fields', fields)
  url.searchParams.set('time_range', JSON.stringify({ since, until }))
  if (breakdowns) url.searchParams.set('breakdowns', breakdowns)
  if (timeIncrement) url.searchParams.set('time_increment', String(timeIncrement))
  const payload = await fetchMetaJson(url)
  return Array.isArray(payload?.data) ? payload.data : []
}

function computeSummaryFromCampaigns(campaigns, currency = 'USD') {
  const summary = campaigns.reduce(
    (acc, row) => {
      acc.spend += toNumber(row.spend)
      acc.impressions += toNumber(row.impressions)
      acc.clicks += toNumber(row.clicks)
      acc.reach += toNumber(row.reach)
      return acc
    },
    { spend: 0, impressions: 0, clicks: 0, reach: 0, currency }
  )
  summary.ctr = summary.impressions > 0 ? summary.clicks / summary.impressions : 0
  summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0
  summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0
  return summary
}

export async function fetchLiveMetaSnapshot({ connection, account, dateFrom = isoDaysAgo(30), dateTo = todayIso() }) {
  const accessToken = getConnectionToken(connection)
  const externalId = normalizeMetaExternalId(account?.external_id)
  if (!accessToken || !externalId) {
    throw new Error('Meta live snapshot requires access token and external account id')
  }

  const [campaignRows, dailyRows, ageGenderRows, countryRows, regionRows, impressionDeviceRows, devicePlatformRows] = await Promise.all([
    fetchMetaInsights({
      accessToken,
      externalAccountId: externalId,
      level: 'campaign',
      fields: 'campaign_id,campaign_name,account_id,account_currency,spend,ctr,cpc,cpm,reach,impressions,clicks',
      since: dateFrom,
      until: dateTo,
    }),
    fetchMetaInsights({
      accessToken,
      externalAccountId: externalId,
      level: 'account',
      fields: 'spend,impressions,clicks',
      since: dateFrom,
      until: dateTo,
      timeIncrement: 1,
    }),
    fetchMetaInsights({
      accessToken,
      externalAccountId: externalId,
      level: 'account',
      fields: 'impressions,clicks,spend,reach',
      since: dateFrom,
      until: dateTo,
      breakdowns: 'age,gender',
    }),
    fetchMetaInsights({
      accessToken,
      externalAccountId: externalId,
      level: 'account',
      fields: 'impressions,clicks,spend,reach',
      since: dateFrom,
      until: dateTo,
      breakdowns: 'country',
    }),
    fetchMetaInsights({
      accessToken,
      externalAccountId: externalId,
      level: 'account',
      fields: 'impressions,clicks,spend,reach',
      since: dateFrom,
      until: dateTo,
      breakdowns: 'region',
    }),
    fetchMetaInsights({
      accessToken,
      externalAccountId: externalId,
      level: 'account',
      fields: 'impressions,clicks,spend,reach',
      since: dateFrom,
      until: dateTo,
      breakdowns: 'impression_device',
    }),
    fetchMetaInsights({
      accessToken,
      externalAccountId: externalId,
      level: 'account',
      fields: 'impressions,clicks,spend,reach',
      since: dateFrom,
      until: dateTo,
      breakdowns: 'device_platform',
    }),
  ])

  const campaigns = campaignRows.map((row) => ({
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    account_id: row.account_id,
    account_currency: row.account_currency || account?.currency || 'USD',
    spend: toNumber(row.spend),
    ctr: (() => {
      const rawCtr = toNumber(row.ctr)
      return rawCtr > 1 ? rawCtr / 100 : rawCtr
    })(),
    cpc: toNumber(row.cpc),
    cpm: toNumber(row.cpm),
    reach: toNumber(row.reach),
    impressions: toNumber(row.impressions),
    clicks: toNumber(row.clicks),
  }))

  const summary = computeSummaryFromCampaigns(campaigns, account?.currency || campaigns[0]?.account_currency || 'USD')
  const daily = dailyRows.map((row) => ({
    date: row.date_start,
    spend: toNumber(row.spend),
    clicks: toNumber(row.clicks),
    impressions: toNumber(row.impressions),
    conversions: 0,
  }))

  return {
    summary,
    campaigns,
    daily,
    audience: {
      age_gender: ageGenderRows.map((row) => ({
        age: row.age,
        gender: row.gender,
        impressions: toNumber(row.impressions),
        clicks: toNumber(row.clicks),
        spend: toNumber(row.spend),
        reach: toNumber(row.reach),
      })),
      geo: {
        country: countryRows.map((row) => ({
          country: row.country,
          impressions: toNumber(row.impressions),
          clicks: toNumber(row.clicks),
          spend: toNumber(row.spend),
        })),
        region: regionRows.map((row) => ({
          region: row.region,
          impressions: toNumber(row.impressions),
          clicks: toNumber(row.clicks),
          spend: toNumber(row.spend),
        })),
      },
      device: {
        impression_device: impressionDeviceRows.map((row) => ({
          impression_device: row.impression_device,
          impressions: toNumber(row.impressions),
          clicks: toNumber(row.clicks),
          spend: toNumber(row.spend),
        })),
        device_platform: devicePlatformRows.map((row) => ({
          device_platform: row.device_platform,
          impressions: toNumber(row.impressions),
          clicks: toNumber(row.clicks),
          spend: toNumber(row.spend),
        })),
      },
    },
    debug: {
      external_account_id: externalId,
      date_from: dateFrom,
      date_to: dateTo,
      campaign_rows: campaignRows.length,
      daily_rows: dailyRows.length,
      age_gender_rows: ageGenderRows.length,
      country_rows: countryRows.length,
      region_rows: regionRows.length,
      impression_device_rows: impressionDeviceRows.length,
      device_platform_rows: devicePlatformRows.length,
      summary_impressions: summary.impressions,
      summary_clicks: summary.clicks,
      summary_spend: summary.spend,
      summary_reach: summary.reach,
    },
  }
}

export function buildMetaInsightsPayload({ connection, account, metricsRow }) {
  const summary = metricsRow?.summary || {}
  const campaigns = (metricsRow?.campaigns || []).map((row) => ({
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    account_id: normalizeMetaExternalId(account?.external_id),
    account_currency: account?.currency || summary.currency || 'USD',
    spend: toNumber(row.spend),
    ctr: toNumber(row.ctr),
    cpc: toNumber(row.cpc),
    cpm: toNumber(row.cpm),
    reach: toNumber(row.reach),
    impressions: toNumber(row.impressions),
    clicks: toNumber(row.clicks),
  }))

  return {
    summary: deriveSummary(campaigns, account?.currency || summary.currency || 'USD'),
    campaigns,
    provider_context: buildMetaReportingContext({ connection, account }),
  }
}

export function buildMetaAudiencePayload({ connection, account, group, audience }) {
  const payload = {
    accounts: [],
    provider_context: buildMetaReportingContext({ connection, account }),
  }
  if (!account) return payload

  const base = {
    account_id: account.id,
    name: account.name,
  }

  if (group === 'age_gender') {
    payload.accounts.push({ ...base, age_gender: audience || [] })
  } else if (group === 'geo') {
    payload.accounts.push({
      ...base,
      country: audience?.country || [],
      region: audience?.region || [],
    })
  } else if (group === 'device') {
    payload.accounts.push({
      ...base,
      impression_device: audience?.impression_device || [],
      device_platform: audience?.device_platform || [],
    })
  }

  return payload
}
