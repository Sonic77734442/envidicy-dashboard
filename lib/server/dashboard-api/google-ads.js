const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords'
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_ADS_API_BASE = 'https://googleads.googleapis.com/v20'

function requiredEnv(name, fallback = '') {
  const value = String(process.env[name] || fallback || '').trim()
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

export function getGoogleAdsOAuthConfig(origin = '') {
  return {
    clientId: requiredEnv('GOOGLE_ADS_CLIENT_ID'),
    clientSecret: requiredEnv('GOOGLE_ADS_CLIENT_SECRET'),
    developerToken: requiredEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
    redirectUri:
      String(process.env.GOOGLE_ADS_REDIRECT_URI || '').trim() ||
      (origin ? `${origin}/api/dashboard/integrations/google/callback` : ''),
    scope: GOOGLE_ADS_SCOPE,
    loginCustomerId: null,
  }
}

export function buildGoogleAdsOAuthUrl({ state, origin = '' }) {
  const config = getGoogleAdsOAuthConfig(origin)
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: config.scope,
    state,
  })
  return `${GOOGLE_OAUTH_URL}?${params.toString()}`
}

export async function exchangeGoogleAdsCode({ code, origin = '' }) {
  const config = getGoogleAdsOAuthConfig(origin)
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => 'Google token exchange failed')
    throw new Error(detail || 'Google token exchange failed')
  }
  const payload = await response.json()
  return {
    access_token: payload.access_token || null,
    refresh_token: payload.refresh_token || null,
    expires_in: payload.expires_in || null,
    scope: payload.scope || GOOGLE_ADS_SCOPE,
    token_type: payload.token_type || null,
  }
}

export async function refreshGoogleAdsAccessToken(refreshToken, origin = '') {
  const config = getGoogleAdsOAuthConfig(origin)
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => 'Google access token refresh failed')
    throw new Error(detail || 'Google access token refresh failed')
  }
  const payload = await response.json()
  return {
    access_token: payload.access_token,
    expires_in: payload.expires_in || null,
    token_type: payload.token_type || 'Bearer',
    scope: payload.scope || GOOGLE_ADS_SCOPE,
  }
}

function buildGoogleAdsHeaders(accessToken, developerToken, loginCustomerId = null) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  }
  if (loginCustomerId) {
    headers['login-customer-id'] = String(loginCustomerId).replace(/\D+/g, '')
  }
  return headers
}

function normalizeCustomerId(value) {
  return String(value || '').replace(/\D+/g, '')
}

function parseGoogleAdsError(error) {
  const raw = String(error?.message || '')
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isIgnorableGoogleCustomerError(error) {
  const raw = String(error?.message || '')
  if (raw.includes('CUSTOMER_NOT_ENABLED') || raw.includes('PERMISSION_DENIED')) {
    return true
  }
  const payload = parseGoogleAdsError(error)
  const failures = payload?.error?.details || []
  return failures.some((detail) =>
    Array.isArray(detail?.errors) &&
    detail.errors.some((item) => {
      const authCode = String(item?.errorCode?.authorizationError || '')
      return authCode === 'CUSTOMER_NOT_ENABLED' || authCode === 'PERMISSION_DENIED'
    })
  )
}

export async function listAccessibleGoogleAdsCustomers(accessToken, options = {}) {
  const config = getGoogleAdsOAuthConfig()
  const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers:listAccessibleCustomers`, {
    method: 'GET',
    headers: buildGoogleAdsHeaders(
      accessToken,
      options.developerToken || config.developerToken,
      options.loginCustomerId || null
    ),
    cache: 'no-store',
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => 'Google accessible customers request failed')
    throw new Error(detail || 'Google accessible customers request failed')
  }
  const payload = await response.json()
  return (payload.resourceNames || [])
    .map((resourceName) => normalizeCustomerId(String(resourceName).split('/').pop()))
    .filter((value) => value.length === 10)
}

export async function searchGoogleAds(customerId, query, accessToken, options = {}) {
  const config = getGoogleAdsOAuthConfig()
  const normalizedCustomerId = normalizeCustomerId(customerId)
  const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${normalizedCustomerId}/googleAds:searchStream`, {
    method: 'POST',
    headers: buildGoogleAdsHeaders(
      accessToken,
      options.developerToken || config.developerToken,
      options.loginCustomerId || normalizedCustomerId
    ),
    body: JSON.stringify({ query }),
    cache: 'no-store',
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => 'Google Ads searchStream failed')
    throw new Error(detail || 'Google Ads searchStream failed')
  }
  const payload = await response.json()
  return Array.isArray(payload) ? payload.flatMap((chunk) => chunk.results || []) : []
}

export async function getGoogleAdsCustomerMetadata(customerId, accessToken, options = {}) {
  const query = `
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.manager,
      customer.test_account,
      customer.status
    FROM customer
    LIMIT 1
  `
  let rows = []
  try {
    rows = await searchGoogleAds(customerId, query, accessToken, {
      ...options,
      loginCustomerId: options.loginCustomerId || customerId,
    })
  } catch (error) {
    if (isIgnorableGoogleCustomerError(error)) {
      return null
    }
    throw error
  }
  const row = rows[0]
  if (!row?.customer) {
    return null
  }
  return {
    customer_id: normalizeCustomerId(row.customer.id),
    descriptive_name: row.customer.descriptiveName || `Customer ${normalizeCustomerId(row.customer.id)}`,
    currency_code: row.customer.currencyCode || 'USD',
    is_manager: Boolean(row.customer.manager),
    test_account: Boolean(row.customer.testAccount),
    status: row.customer.status || null,
  }
}

export async function listGoogleAdsChildCustomers(customerId, accessToken, options = {}) {
  const query = `
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.currency_code,
      customer_client.manager,
      customer_client.level,
      customer_client.hidden,
      customer_client.test_account,
      customer_client.status
    FROM customer_client
    WHERE customer_client.level <= 1
  `
  let rows = []
  try {
    rows = await searchGoogleAds(customerId, query, accessToken, {
      ...options,
      loginCustomerId: options.loginCustomerId || customerId,
    })
  } catch (error) {
    if (isIgnorableGoogleCustomerError(error)) {
      return []
    }
    throw error
  }
  return rows
    .filter((row) => row?.customerClient?.id)
    .map((row) => ({
      parent_customer_id: normalizeCustomerId(customerId),
      customer_id: normalizeCustomerId(row.customerClient.id),
      descriptive_name: row.customerClient.descriptiveName || `Customer ${normalizeCustomerId(row.customerClient.id)}`,
      currency_code: row.customerClient.currencyCode || 'USD',
      is_manager: Boolean(row.customerClient.manager),
      level: Number(row.customerClient.level || 0),
      hidden: Boolean(row.customerClient.hidden),
      test_account: Boolean(row.customerClient.testAccount),
      status: row.customerClient.status || null,
    }))
}

export async function discoverGoogleAdsCustomers({ refreshToken, loginCustomerId = null } = {}) {
  if (!refreshToken) {
    throw new Error('Google connection has no refresh token')
  }

  const refreshed = await refreshGoogleAdsAccessToken(refreshToken)
  const accessibleCustomerIds = await listAccessibleGoogleAdsCustomers(refreshed.access_token, {
    loginCustomerId,
  })

  const discovered = []
  const seenCustomerIds = new Set()
  const skippedCustomers = []

  for (const customerId of accessibleCustomerIds) {
    const customer = await getGoogleAdsCustomerMetadata(customerId, refreshed.access_token, {
      loginCustomerId: loginCustomerId || customerId,
    })
    if (!customer) {
      skippedCustomers.push({
        customer_id: customerId,
        reason: 'customer_not_enabled_or_inaccessible',
      })
      continue
    }

    if (!seenCustomerIds.has(customer.customer_id)) {
      seenCustomerIds.add(customer.customer_id)
      discovered.push(customer)
    }

    if (!customer.is_manager) continue

    const children = await listGoogleAdsChildCustomers(customer.customer_id, refreshed.access_token, {
      loginCustomerId: customer.customer_id,
    })

    for (const child of children) {
      if (seenCustomerIds.has(child.customer_id)) continue
      seenCustomerIds.add(child.customer_id)
      discovered.push(child)
    }
  }

  return {
    access_token: refreshed.access_token,
    expires_in: refreshed.expires_in,
    accessible_customer_ids: accessibleCustomerIds,
    discovered_customers: discovered,
    skipped_customers: skippedCustomers,
  }
}

export function mapGoogleDiscoveredCustomersToExternalAccounts(discoveredCustomers = []) {
  return (discoveredCustomers || []).map((customer) => ({
    external_id: customer.customer_id,
    name: customer.descriptive_name || `Google Ads ${customer.customer_id}`,
    currency: customer.currency_code || 'USD',
    account_status: customer.status || null,
    selected_for_sync: false,
    metadata_json: {
      customer_id: customer.customer_id,
      parent_customer_id: customer.parent_customer_id || null,
      is_manager: Boolean(customer.is_manager),
      level: Number(customer.level || 0),
      hidden: Boolean(customer.hidden),
      test_account: Boolean(customer.test_account),
      status: customer.status || null,
    },
  }))
}

export async function fetchLiveGoogleSnapshot({ refreshToken, loginCustomerId = null, account }) {
  const discovered = await discoverGoogleAdsCustomers({ refreshToken, loginCustomerId })
  const accessToken = discovered.access_token
  const customerId = normalizeCustomerId(account.external_id)

  const insightsQuery = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
  `

  const dailyQuery = `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
  `

  let campaignsRows = []
  let dailyRows = []
  try {
    campaignsRows = await searchGoogleAds(customerId, insightsQuery, accessToken, {
      loginCustomerId: loginCustomerId || customerId,
    })
    dailyRows = await searchGoogleAds(customerId, dailyQuery, accessToken, {
      loginCustomerId: loginCustomerId || customerId,
    })
  } catch (error) {
    if (isIgnorableGoogleCustomerError(error)) {
      return {
        summary: {},
        campaigns: [],
        daily: [],
        audience: {},
        status: 'Google Ads customer is disabled or inaccessible.',
      }
    }
    throw error
  }

  const summary = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    tracked_conversions: 0,
    conversion_value: 0,
    reach: 0,
    currency: account.currency || 'USD',
    ctr: 0,
    cpc: 0,
    cpm: 0,
    cpa: 0,
    roas: 0,
  }

  const campaigns = campaignsRows.map((row) => {
    const spend = Number(row.metrics?.costMicros || 0) / 1_000_000
    const impressions = Number(row.metrics?.impressions || 0)
    const clicks = Number(row.metrics?.clicks || 0)
    const conversions = Number(row.metrics?.conversions || 0)
    summary.spend += spend
    summary.impressions += impressions
    summary.clicks += clicks
    summary.conversions += conversions
    summary.tracked_conversions += conversions
    return {
      campaign_id: row.campaign?.id || null,
      campaign_name: row.campaign?.name || 'Unnamed campaign',
      impressions,
      clicks,
      ctr: Number(row.metrics?.ctr || 0),
      cpc: Number(row.metrics?.averageCpc || 0) / 1_000_000,
      cpm: Number(row.metrics?.averageCpm || 0) / 1_000_000,
      spend,
      conversions,
    }
  })

  summary.ctr = summary.impressions > 0 ? summary.clicks / summary.impressions : 0
  summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0
  summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0
  summary.cpa = summary.tracked_conversions > 0 ? summary.spend / summary.tracked_conversions : 0

  const dailyMap = new Map()
  for (const row of dailyRows) {
    const date = row.segments?.date
    if (!date) continue
    const current = dailyMap.get(date) || { date, spend: 0, clicks: 0, impressions: 0, conversions: 0 }
    current.spend += Number(row.metrics?.costMicros || 0) / 1_000_000
    current.clicks += Number(row.metrics?.clicks || 0)
    current.impressions += Number(row.metrics?.impressions || 0)
    current.conversions += Number(row.metrics?.conversions || 0)
    dailyMap.set(date, current)
  }

  return {
    summary,
    campaigns,
    daily: Array.from(dailyMap.values()).sort((a, b) => String(a.date).localeCompare(String(b.date))),
    audience: {
      age_gender: [],
      geo: { country: [], region: [], city: [] },
      device: { device: [] },
    },
    debug: {
      accessible_customers: discovered.accessible_customer_ids.length,
      discovered_customers: discovered.discovered_customers.length,
      campaigns: campaigns.length,
      daily: dailyRows.length,
    },
  }
}
