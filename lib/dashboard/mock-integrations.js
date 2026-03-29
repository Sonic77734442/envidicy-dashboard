import { getAgency, listAgencies } from './mock-tenant'

const integrationState = {}
const pendingMetaOAuth = new Map()

function buildDefaultConnections(agency) {
  return [
    {
      id: `conn_meta_${agency.slug}`,
      agency_id: agency.id,
      provider: 'meta',
      label: 'Meta Business Manager',
      status: 'draft',
      auth_mode: 'oauth_pending',
      access_token: null,
      external_owner: `${agency.name} Agency`,
      last_sync_at: null,
    },
    {
      id: `conn_google_${agency.slug}`,
      agency_id: agency.id,
      provider: 'google',
      label: 'Google Ads MCC',
      status: 'draft',
      auth_mode: 'oauth_pending',
      external_owner: `${agency.name} Agency`,
      last_sync_at: null,
    },
    {
      id: `conn_tiktok_${agency.slug}`,
      agency_id: agency.id,
      provider: 'tiktok',
      label: 'TikTok Business Center',
      status: 'draft',
      auth_mode: 'oauth_pending',
      external_owner: `${agency.name} Agency`,
      last_sync_at: null,
    },
    {
      id: `conn_yandex_${agency.slug}`,
      agency_id: agency.id,
      provider: 'yandex',
      label: 'Yandex Direct',
      status: 'draft',
      auth_mode: 'oauth_pending',
      external_owner: `${agency.name} Agency`,
      last_sync_at: null,
    },
  ]
}

function buildDefaultExternalAccounts(agency, connections) {
  return []
}

function buildDefaultActivatedIds(agency, externalAccounts) {
  return new Set()
}

function buildDashboardAccountFromExternal(account, index) {
  return {
    id: Number(`${Math.max(4, account.agency_id.length)}${index + 1}${account.provider.length}`),
    agency_id: account.agency_id,
    platform: account.provider,
    external_id: account.external_id,
    name: account.name,
    currency: account.currency,
    status: 'active',
  }
}

function ensureAgencyState(agencyId) {
  const agency = getAgency(agencyId)
  if (!agency) return null
  if (!integrationState[agency.id]) {
    const connections = buildDefaultConnections(agency)
    const externalAccounts = buildDefaultExternalAccounts(agency, connections)
    integrationState[agency.id] = {
      connections,
      externalAccounts,
      activatedAccountIds: buildDefaultActivatedIds(agency, externalAccounts),
      generatedDashboardAccounts: [],
    }
  }
  return integrationState[agency.id]
}

export function listConnections(agencyId) {
  const state = ensureAgencyState(agencyId)
  if (!state) return []
  return state.connections.map((connection) => ({
    ...connection,
    imported_accounts: state.externalAccounts.filter((account) => account.connection_id === connection.id).length,
  }))
}

export function getConnectionById(agencyId, connectionId) {
  const state = ensureAgencyState(agencyId)
  return state?.connections.find((connection) => connection.id === connectionId) || null
}

export function connectProvider(agencyId, provider) {
  const state = ensureAgencyState(agencyId)
  const connection = state?.connections.find((row) => row.provider === provider)
  if (!connection) return null
  connection.status = 'connected'
  connection.auth_mode = connection.provider === 'meta' ? 'agency_oauth' : 'agency_connect'
  connection.access_token = connection.provider === 'meta' ? `meta_agency_token_${agencyId}` : null
  connection.last_sync_at = new Date().toISOString()
  state.externalAccounts.forEach((account) => {
    if (account.connection_id === connection.id && !account.imported_at) {
      account.imported_at = connection.last_sync_at
    }
  })
  return { ...connection }
}

export function beginMetaOAuth(agencyId) {
  const state = ensureAgencyState(agencyId)
  const connection = state?.connections.find((row) => row.provider === 'meta')
  if (!connection) return null
  const oauthState = `meta_${agencyId}_${Date.now()}`
  pendingMetaOAuth.set(oauthState, {
    agency_id: agencyId,
    connection_id: connection.id,
    created_at: new Date().toISOString(),
  })
  return {
    state: oauthState,
    connection_id: connection.id,
    agency_id: agencyId,
  }
}

export function completeMetaOAuth(stateValue, tokenPayload = {}) {
  const pending = pendingMetaOAuth.get(stateValue)
  if (!pending) return null
  pendingMetaOAuth.delete(stateValue)

  const state = ensureAgencyState(pending.agency_id)
  const connection = state?.connections.find((row) => row.id === pending.connection_id)
  if (!connection) return null

  connection.status = 'connected'
  connection.auth_mode = 'agency_oauth'
  connection.access_token = tokenPayload.access_token || `meta_agency_token_${pending.agency_id}`
  connection.external_owner = tokenPayload.external_owner || connection.external_owner
  connection.last_sync_at = new Date().toISOString()
  return { ...connection }
}

export function completeMetaOAuthForAgency(agencyId, tokenPayload = {}) {
  const state = ensureAgencyState(agencyId)
  const connection = state?.connections.find((row) => row.provider === 'meta')
  if (!connection) return null

  connection.status = 'connected'
  connection.auth_mode = 'agency_oauth'
  connection.access_token = tokenPayload.access_token || `meta_agency_token_${agencyId}`
  connection.external_owner = tokenPayload.external_owner || connection.external_owner
  connection.last_sync_at = new Date().toISOString()
  return { ...connection }
}

export function listExternalAccounts(agencyId) {
  const state = ensureAgencyState(agencyId)
  if (!state) return []
  return state.externalAccounts.map((account) => ({
    ...account,
    active_in_dashboard: account.dashboard_account_id
      ? state.activatedAccountIds.has(Number(account.dashboard_account_id))
      : false,
  }))
}

export function listDashboardAccounts(agencyId = null) {
  if (!agencyId) {
    return listAgencies().flatMap((agency) => listDashboardAccounts(agency.id))
  }
  const state = ensureAgencyState(agencyId)
  if (!state) return []
  const generated = state.generatedDashboardAccounts.filter((account) => state.activatedAccountIds.has(Number(account.id)))
  return [...generated]
}

export function setActivatedDashboardAccounts(agencyId, accountIds) {
  const state = ensureAgencyState(agencyId)
  if (!state) return []
  state.activatedAccountIds.clear()
  const nextIds = (accountIds || []).map((id) => Number(id))
  const knownIds = new Set([
    ...state.generatedDashboardAccounts.map((account) => Number(account.id)),
  ])
  nextIds.forEach((id) => {
    if (knownIds.has(id)) {
      state.activatedAccountIds.add(id)
    }
  })
  return listDashboardAccounts(agencyId)
}

export function importConnectionAccounts(agencyId, connectionId) {
  const state = ensureAgencyState(agencyId)
  const connection = state?.connections.find((row) => row.id === connectionId)
  if (!connection) return null
  connection.status = 'connected'
  connection.last_sync_at = new Date().toISOString()
  state.externalAccounts.forEach((account, index) => {
    if (account.connection_id === connection.id) {
      account.imported_at = connection.last_sync_at
      if (!account.dashboard_account_id) {
        const generated = buildDashboardAccountFromExternal(account, index)
        state.generatedDashboardAccounts.push(generated)
        account.dashboard_account_id = generated.id
      }
    }
  })
  return listExternalAccounts(agencyId).filter((account) => account.connection_id === connection.id)
}

export function replaceImportedAccountsForConnection(agencyId, connectionId, importedAccounts = []) {
  const state = ensureAgencyState(agencyId)
  const connection = state?.connections.find((row) => row.id === connectionId)
  if (!state || !connection) return null

  state.externalAccounts = state.externalAccounts.filter((account) => account.connection_id !== connectionId)
  const seenIds = new Set()

  importedAccounts.forEach((account, index) => {
    const externalId = String(account.external_id || '').trim()
    if (!externalId || seenIds.has(externalId)) return
    seenIds.add(externalId)
    const generated = buildDashboardAccountFromExternal(
      {
        id: `ext_${agencyId}_${connection.provider}_live_${index + 1}`,
        agency_id: agencyId,
        connection_id: connectionId,
        provider: connection.provider,
        external_id: externalId,
        name: account.name || `${String(connection.provider || '').toUpperCase()} Account ${index + 1}`,
        currency: account.currency || 'USD',
      },
      index
    )
    state.generatedDashboardAccounts = state.generatedDashboardAccounts.filter(
      (dashboardAccount) => String(dashboardAccount.external_id) !== externalId
    )
    state.generatedDashboardAccounts.push(generated)
    state.externalAccounts.push({
      id: `ext_${agencyId}_${connection.provider}_live_${index + 1}`,
      agency_id: agencyId,
      connection_id: connectionId,
      provider: connection.provider,
      external_id: externalId,
      name: account.name || generated.name,
      currency: account.currency || generated.currency || 'USD',
      imported_at: new Date().toISOString(),
      dashboard_account_id: generated.id,
    })
  })

  connection.status = 'connected'
  connection.last_sync_at = new Date().toISOString()
  return listExternalAccounts(agencyId).filter((account) => account.connection_id === connection.id)
}
