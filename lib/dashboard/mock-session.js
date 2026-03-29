import { listDashboardAccounts } from './mock-integrations'
import { listAgencyAdmins, listAgencies, listClientPersonas, listClients } from './mock-tenant'

export function listPersonas() {
  const base = [
    {
      id: 'platform_owner',
      email: 'owner@envidicy.com',
      name: 'Envidicy Platform Owner',
      role: 'platform_owner',
      scope: 'platform',
      agency: { id: null, name: 'Envidicy Platform' },
      client: null,
      visibleAccountIds: listDashboardAccounts().map((row) => row.id),
    },
  ]
  const agencyAdmins = listAgencyAdmins().map((admin) => ({
    id: admin.persona_id,
    email: admin.email,
    name: admin.name,
    role: 'agency_admin',
    scope: 'agency',
    agency: listAgencies().find((agency) => agency.id === admin.agency_id) || null,
    client: null,
    visibleAccountIds: listDashboardAccounts(admin.agency_id).map((row) => row.id),
  }))
  const clientsByAgency = new Map(
    listAgencies().map((agency) => [agency.id, new Map(listClients(agency.id).map((client) => [client.id, client]))])
  )
  const clientPersonas = listClientPersonas().map((persona) => ({
    id: persona.id,
    email: persona.email,
    name: persona.name,
    role: 'client_viewer',
    scope: 'client',
    agency: listAgencies().find((agency) => agency.id === persona.agency_id) || null,
    client: {
      id: persona.client_id,
      name: clientsByAgency.get(persona.agency_id)?.get(persona.client_id)?.name || persona.client_name,
    },
    visibleAccountIds: persona.visibleAccountIds.filter((id) => listDashboardAccounts(persona.agency_id).map((row) => row.id).includes(id)),
  }))
  return [...base, ...agencyAdmins, ...clientPersonas]
}

export const SESSION_COOKIE = 'dashboard_persona'

export function getPersonaById(personaId) {
  return listPersonas().find((row) => row.id === personaId) || null
}

export function getPersonaByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  return listPersonas().find((row) => String(row.email || '').trim().toLowerCase() === normalized) || null
}

export function getDefaultPersona() {
  return listPersonas()[0]
}

export function getPersonaFromCookieStore(cookieStore) {
  const personaId = cookieStore.get(SESSION_COOKIE)?.value
  return getPersonaById(personaId) || null
}

export function getVisibleAccountsForPersona(persona) {
  const visibleIds = new Set((persona?.visibleAccountIds || []).map((id) => Number(id)))
  const scopedAccounts = persona?.agency?.id ? listDashboardAccounts(persona.agency.id) : listDashboardAccounts()
  return scopedAccounts.filter((row) => visibleIds.has(Number(row.id)))
}

export function getVisibleAccountsByPlatform(persona, platform) {
  const normalized = String(platform || '').toLowerCase().trim()
  return getVisibleAccountsForPersona(persona).filter((row) => String(row.platform || '').toLowerCase() === normalized)
}

export function canAccessAccount(persona, accountId) {
  if (!accountId) return true
  return getVisibleAccountsForPersona(persona).some((row) => String(row.id) === String(accountId))
}

export function getPersonaLabel(persona) {
  if (!persona) return ''
  if (persona.role === 'platform_owner') return 'Envidicy admin'
  if (persona.role === 'agency_admin') return 'Agency admin'
  if (persona.role === 'client_viewer') return 'Agency client'
  return persona.role
}
