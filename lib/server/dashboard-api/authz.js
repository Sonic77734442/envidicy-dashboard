import { cookies } from 'next/headers'
import { listDashboardAccountsForAgency } from './agency-store'
import { hydrateAgencySession } from './session-state'
import { getSessionPersona } from './session-persona'

export async function getPersonaOrNull() {
  const persona = await getSessionPersona(await cookies())
  if (persona?.agency?.id) {
    await hydrateAgencySession(persona.agency.id)
  }
  return persona
}

export async function requirePersona() {
  const persona = await getPersonaOrNull()
  if (!persona) {
    return { error: { detail: 'Unauthorized', status: 401 } }
  }
  return { persona }
}

export async function requireAgencyAccess() {
  const { persona, error } = await requirePersona()
  if (error) return { error }
  if (!(persona.role === 'platform_owner' || persona.role === 'agency_admin')) {
    return { error: { detail: 'Forbidden', status: 403 } }
  }
  return { persona }
}

export async function getVisibleScope(persona) {
  const agencyAccounts = persona?.agency?.id
    ? await listDashboardAccountsForAgency(persona.agency.id)
    : await listDashboardAccountsForAgency()
  const visibleIds = new Set((persona?.visibleAccountIds || []).map((id) => String(id)))
  const scopedAccounts =
    persona?.role === 'platform_owner' || persona?.role === 'agency_admin'
      ? agencyAccounts
      : agencyAccounts.filter((row) => visibleIds.has(String(row.id)))
  return {
    accounts: scopedAccounts,
    byPlatform: {
      meta: scopedAccounts.filter((row) => String(row.platform || '').toLowerCase() === 'meta'),
      google: scopedAccounts.filter((row) => String(row.platform || '').toLowerCase() === 'google'),
      tiktok: scopedAccounts.filter((row) => String(row.platform || '').toLowerCase() === 'tiktok'),
      yandex: scopedAccounts.filter((row) => String(row.platform || '').toLowerCase() === 'yandex'),
    },
  }
}

export async function ensureAccountAccess(persona, accountId) {
  if (!accountId) return true
  const scope = await getVisibleScope(persona)
  return scope.accounts.some((row) => String(row.id) === String(accountId))
}
