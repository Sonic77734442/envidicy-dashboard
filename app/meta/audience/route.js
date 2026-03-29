import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { canAccessAccount, getVisibleAccountsByPlatform } from '../../../lib/dashboard/mock-session'
import { ensureSeedSync, getSyncedAudience } from '../../../lib/dashboard/mock-sync'
import { getSessionPersona } from '../../../lib/server/dashboard-api/session-persona'

export async function GET(request) {
  const persona = await getSessionPersona(await cookies())
  if (!persona) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  ensureSeedSync()
  const params = new URL(request.url).searchParams
  const group = params.get('group')
  const accountId = params.get('account_id')
  if (accountId && !canAccessAccount(persona, accountId)) {
    return NextResponse.json({ detail: 'Forbidden account scope' }, { status: 403 })
  }
  const visible = getVisibleAccountsByPlatform(persona, 'meta')
  const account = visible.find((row) => !accountId || String(row.id) === String(accountId))
  const payload = { accounts: [] }
  if (!account) return NextResponse.json(payload)
  const audience = getSyncedAudience(account.id, group)
  if (group === 'age_gender') {
    payload.accounts.push({ account_id: account.id, name: account.name, age_gender: audience })
  } else if (group === 'geo') {
    payload.accounts.push({ account_id: account.id, name: account.name, country: audience.country || [], region: audience.region || [] })
  } else if (group === 'device') {
    payload.accounts.push({
      account_id: account.id,
      name: account.name,
      impression_device: audience.impression_device || [],
      device_platform: audience.device_platform || [],
    })
  }
  return NextResponse.json(payload)
}
