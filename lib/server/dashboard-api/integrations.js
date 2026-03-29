import {
  beginMetaOAuth,
  completeMetaOAuth,
  connectProvider,
  importConnectionAccounts,
  listConnections,
  listDashboardAccounts,
  listExternalAccounts,
  setActivatedDashboardAccounts,
  connectProviderForAgency,
  getConnectionByIdForAgency,
  getProviderConnectionForAgency,
  listConnectionsForAgency,
  listDashboardAccountsForAgency,
  listExternalAccountsForAgency,
  replaceImportedAccountsForAgencyConnection,
  saveMetaConnectionTokenForAgency,
  setActivatedDashboardAccountsForAgency,
} from './agency-store'
import { hasDatabase } from '../db/client'

export async function getIntegrationsSnapshot(agencyId) {
  return {
    connections: await listConnectionsForAgency(agencyId),
    external_accounts: await listExternalAccountsForAgency(agencyId),
    dashboard_accounts: await listDashboardAccountsForAgency(agencyId),
  }
}

export async function getProviderConnectionForAccount(agencyId, account) {
  if (!agencyId || !account?.platform) return null
  return getProviderConnectionForAgency(agencyId, account.platform)
}

export async function runConnectProvider(agencyId, provider) {
  const connection = await connectProviderForAgency(agencyId, provider)
  if (!connection) return null
  return {
    connection,
    ...(await getIntegrationsSnapshot(agencyId)),
  }
}

export async function startMetaOAuth(agencyId) {
  if (hasDatabase()) {
    const connection = await getProviderConnectionForAgency(agencyId, 'meta')
    if (!connection) return null
    return {
      state: `meta_${agencyId}_${Date.now()}`,
      connection_id: connection.id,
      agency_id: agencyId,
    }
  }
  return beginMetaOAuth(agencyId)
}

export function finishMetaOAuth(stateValue, tokenPayload) {
  if (hasDatabase()) return null
  return completeMetaOAuth(stateValue, tokenPayload)
}

export async function finishMetaOAuthForAgency(agencyId, tokenPayload) {
  return saveMetaConnectionTokenForAgency(agencyId, tokenPayload)
}

export async function getAgencyConnection(agencyId, connectionId) {
  return getConnectionByIdForAgency(agencyId, connectionId)
}

async function fetchMetaAdAccountsPage(accessToken, afterCursor = null) {
  const url = new URL('https://graph.facebook.com/v20.0/me/adaccounts')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', 'account_id,name,currency,account_status')
  url.searchParams.set('limit', '200')
  if (afterCursor) url.searchParams.set('after', afterCursor)
  const response = await fetch(url, { method: 'GET', cache: 'no-store' })
  if (!response.ok) {
    const detail = await response.text().catch(() => 'Meta account import failed')
    throw new Error(detail || 'Meta account import failed')
  }
  return response.json()
}

async function fetchMetaBusinessesPage(accessToken, afterCursor = null) {
  const url = new URL('https://graph.facebook.com/v20.0/me/businesses')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', 'id,name')
  url.searchParams.set('limit', '200')
  if (afterCursor) url.searchParams.set('after', afterCursor)
  const response = await fetch(url, { method: 'GET', cache: 'no-store' })
  if (!response.ok) {
    const detail = await response.text().catch(() => 'Meta businesses import failed')
    throw new Error(detail || 'Meta businesses import failed')
  }
  return response.json()
}

async function fetchMetaBusinessAccountsPage(accessToken, businessId, edge, afterCursor = null) {
  const url = new URL(`https://graph.facebook.com/v20.0/${businessId}/${edge}`)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', 'account_id,name,currency,account_status')
  url.searchParams.set('limit', '200')
  if (afterCursor) url.searchParams.set('after', afterCursor)
  const response = await fetch(url, { method: 'GET', cache: 'no-store' })
  if (!response.ok) {
    const detail = await response.text().catch(() => `Meta business ${edge} import failed`)
    throw new Error(detail || `Meta business ${edge} import failed`)
  }
  return response.json()
}

export async function importMetaAccountsLive(agencyId, connectionId) {
  const connection = await getConnectionByIdForAgency(agencyId, connectionId)
  if (!connection || connection.provider !== 'meta') return null
  const accessToken = connection.access_token
  if (!accessToken) {
    throw new Error('Meta connection has no access token')
  }

  const imported = []
  const importedExternalIds = new Set()
  const debug = {
    me_adaccounts: 0,
    businesses: 0,
    owned_ad_accounts: 0,
    client_ad_accounts: 0,
  }
  let afterCursor = null
  let guard = 0

  do {
    const payload = await fetchMetaAdAccountsPage(accessToken, afterCursor)
    for (const row of payload?.data || []) {
      const externalId = String(row.account_id || '').trim()
      if (!externalId || importedExternalIds.has(externalId)) continue
      importedExternalIds.add(externalId)
      imported.push({
        external_id: externalId,
        name: row.name,
        currency: row.currency || 'USD',
        account_status: row.account_status,
      })
      debug.me_adaccounts += 1
    }
    afterCursor = payload?.paging?.cursors?.after || null
    guard += 1
  } while (afterCursor && guard < 10)

  let bizAfterCursor = null
  let bizGuard = 0
  const businessIds = []

  do {
    const payload = await fetchMetaBusinessesPage(accessToken, bizAfterCursor)
    for (const row of payload?.data || []) {
      if (row?.id) {
        businessIds.push({ id: row.id, name: row.name })
        debug.businesses += 1
      }
    }
    bizAfterCursor = payload?.paging?.cursors?.after || null
    bizGuard += 1
  } while (bizAfterCursor && bizGuard < 10)

  for (const business of businessIds) {
    for (const edge of ['owned_ad_accounts', 'client_ad_accounts']) {
      let edgeAfterCursor = null
      let edgeGuard = 0
      do {
        const payload = await fetchMetaBusinessAccountsPage(accessToken, business.id, edge, edgeAfterCursor)
        for (const row of payload?.data || []) {
          const externalId = String(row.account_id || '').trim()
          if (!externalId || importedExternalIds.has(externalId)) continue
          importedExternalIds.add(externalId)
          imported.push({
            external_id: externalId,
            name: row.name ? `${business.name} · ${row.name}` : `${business.name} · ${externalId}`,
            currency: row.currency || 'USD',
            account_status: row.account_status,
          })
          if (edge === 'owned_ad_accounts') debug.owned_ad_accounts += 1
          if (edge === 'client_ad_accounts') debug.client_ad_accounts += 1
        }
        edgeAfterCursor = payload?.paging?.cursors?.after || null
        edgeGuard += 1
      } while (edgeAfterCursor && edgeGuard < 10)
    }
  }

  return {
    imported: await replaceImportedAccountsForAgencyConnection(agencyId, connectionId, imported),
    meta_debug: debug,
    ...(await getIntegrationsSnapshot(agencyId)),
  }
}

export async function runImportConnection(agencyId, connectionId) {
  const imported = importConnectionAccounts(agencyId, connectionId)
  if (!imported) return null
  return {
    imported,
    ...(await getIntegrationsSnapshot(agencyId)),
  }
}

export async function updateDashboardAccounts(agencyId, accountIds) {
  const dashboardAccounts = await setActivatedDashboardAccountsForAgency(agencyId, accountIds)
  return {
    dashboard_accounts: dashboardAccounts,
    ...(await getIntegrationsSnapshot(agencyId)),
  }
}
