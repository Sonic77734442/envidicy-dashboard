import { getAgency, listAgencies } from '../../dashboard/mock-tenant'
import { hasDatabase } from '../db/client'
import {
  connectProviderDb,
  getConnectionByIdDb,
  getProviderConnectionDb,
  listConnectionsDb,
  listDashboardAccountsDb,
  listExternalAccountsDb,
  replaceImportedAccountsForConnectionDb,
  saveMetaConnectionTokenDb,
  setActivatedDashboardAccountsDb,
} from '../db/integrations'

function getStore() {
  const key = '__envidicy_dashboard_agency_store__'
  if (!globalThis[key]) {
    globalThis[key] = {
      integrationState: {},
      pendingMetaOAuth: new Map(),
    }
  }
  return globalThis[key]
}

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

function buildDashboardAccountFromExternal(account, index) {
  return {
    id: Number(`${Math.max(4, String(account.agency_id || '').length)}${index + 1}${String(account.provider || '').length}`),
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
  const store = getStore()
  if (!store.integrationState[agency.id]) {
    store.integrationState[agency.id] = {
      connections: buildDefaultConnections(agency),
      externalAccounts: [],
      activatedAccountIds: new Set(),
      generatedDashboardAccounts: [],
    }
  }
  return store.integrationState[agency.id]
}

export function listConnections(agencyId) {
  const state = ensureAgencyState(agencyId)
  if (!state) return []
  return state.connections.map((connection) => ({
    ...connection,
    imported_accounts: state.externalAccounts.filter((account) => account.connection_id === connection.id).length,
  }))
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
  return state.generatedDashboardAccounts.filter((account) => state.activatedAccountIds.has(Number(account.id)))
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
  connection.last_sync_at = new Date().toISOString()
  return { ...connection }
}

export function beginMetaOAuth(agencyId) {
  const state = ensureAgencyState(agencyId)
  const connection = state?.connections.find((row) => row.provider === 'meta')
  if (!connection) return null
  const oauthState = `meta_${agencyId}_${Date.now()}`
  getStore().pendingMetaOAuth.set(oauthState, {
    agency_id: agencyId,
    connection_id: connection.id,
    created_at: new Date().toISOString(),
  })
  return { state: oauthState, connection_id: connection.id, agency_id: agencyId }
}

export function completeMetaOAuth(stateValue, tokenPayload = {}) {
  const store = getStore()
  const pending = store.pendingMetaOAuth.get(stateValue)
  if (!pending) return null
  store.pendingMetaOAuth.delete(stateValue)
  return completeMetaOAuthForAgency(pending.agency_id, tokenPayload)
}

export function completeMetaOAuthForAgency(agencyId, tokenPayload = {}) {
  const state = ensureAgencyState(agencyId)
  const connection = state?.connections.find((row) => row.provider === 'meta')
  if (!connection) return null
  connection.status = 'connected'
  connection.auth_mode = 'agency_oauth'
  connection.access_token = tokenPayload.access_token || null
  connection.external_owner = tokenPayload.external_owner || connection.external_owner
  connection.last_sync_at = new Date().toISOString()
  return { ...connection }
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

export function importConnectionAccounts(agencyId, connectionId) {
  const state = ensureAgencyState(agencyId)
  const connection = state?.connections.find((row) => row.id === connectionId)
  if (!connection) return null
  connection.status = 'connected'
  connection.last_sync_at = new Date().toISOString()
  return listExternalAccounts(agencyId).filter((account) => account.connection_id === connection.id)
}

export function setActivatedDashboardAccounts(agencyId, accountIds) {
  const state = ensureAgencyState(agencyId)
  if (!state) return []
  state.activatedAccountIds.clear()
  const nextIds = (accountIds || []).map((id) => Number(id))
  const knownIds = new Set(state.generatedDashboardAccounts.map((account) => Number(account.id)))
  nextIds.forEach((id) => {
    if (knownIds.has(id)) state.activatedAccountIds.add(id)
  })
  return listDashboardAccounts(agencyId)
}

export function exportAgencyState(agencyId) {
  const state = ensureAgencyState(agencyId)
  if (!state) return null
  return {
    connections: state.connections.map((row) => ({ ...row })),
    externalAccounts: state.externalAccounts.map((row) => ({ ...row })),
    activatedAccountIds: Array.from(state.activatedAccountIds),
    generatedDashboardAccounts: state.generatedDashboardAccounts.map((row) => ({ ...row })),
  }
}

export function importAgencyState(agencyId, payload) {
  const state = ensureAgencyState(agencyId)
  if (!state || !payload) return
  state.connections = Array.isArray(payload.connections) ? payload.connections.map((row) => ({ ...row })) : state.connections
  state.externalAccounts = Array.isArray(payload.externalAccounts) ? payload.externalAccounts.map((row) => ({ ...row })) : state.externalAccounts
  state.activatedAccountIds = new Set(Array.isArray(payload.activatedAccountIds) ? payload.activatedAccountIds.map((id) => Number(id)) : [])
  state.generatedDashboardAccounts = Array.isArray(payload.generatedDashboardAccounts)
    ? payload.generatedDashboardAccounts.map((row) => ({ ...row }))
    : state.generatedDashboardAccounts
}

export async function listConnectionsForAgency(agencyId) {
  if (hasDatabase()) return listConnectionsDb(agencyId)
  return listConnections(agencyId)
}

export async function listExternalAccountsForAgency(agencyId) {
  if (hasDatabase()) return listExternalAccountsDb(agencyId)
  return listExternalAccounts(agencyId)
}

export async function listDashboardAccountsForAgency(agencyId = null, options = {}) {
  if (hasDatabase()) return listDashboardAccountsDb(agencyId, options)
  return listDashboardAccounts(agencyId)
}

export async function getConnectionByIdForAgency(agencyId, connectionId) {
  if (hasDatabase()) return getConnectionByIdDb(agencyId, connectionId)
  return getConnectionById(agencyId, connectionId)
}

export async function getProviderConnectionForAgency(agencyId, provider) {
  if (hasDatabase()) return getProviderConnectionDb(agencyId, provider)
  return listConnections(agencyId).find((connection) => connection.provider === provider) || null
}

export async function connectProviderForAgency(agencyId, provider) {
  if (hasDatabase()) return connectProviderDb(agencyId, provider)
  return connectProvider(agencyId, provider)
}

export async function saveMetaConnectionTokenForAgency(agencyId, tokenPayload = {}) {
  if (hasDatabase()) return saveMetaConnectionTokenDb(agencyId, tokenPayload)
  return completeMetaOAuthForAgency(agencyId, tokenPayload)
}

export async function replaceImportedAccountsForAgencyConnection(agencyId, connectionId, importedAccounts = []) {
  if (hasDatabase()) return replaceImportedAccountsForConnectionDb(agencyId, connectionId, importedAccounts)
  return replaceImportedAccountsForConnection(agencyId, connectionId, importedAccounts)
}

export async function setActivatedDashboardAccountsForAgency(agencyId, accountIds = []) {
  if (hasDatabase()) return setActivatedDashboardAccountsDb(agencyId, accountIds)
  return setActivatedDashboardAccounts(agencyId, accountIds)
}
