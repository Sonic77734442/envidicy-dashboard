import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAgencyAccess } from '../../../../../lib/server/dashboard-api/authz'
import {
  finishMetaOAuthForAgency,
  getAgencyConnection,
  importMetaAccountsLive,
  runImportConnection,
} from '../../../../../lib/server/dashboard-api/integrations'
import { getConversionsSnapshot } from '../../../../../lib/server/dashboard-api/conversions'
import { getSyncSnapshot } from '../../../../../lib/server/dashboard-api/sync'
import { persistAgencySession } from '../../../../../lib/server/dashboard-api/session-state'

export async function POST(request) {
  const { persona, error } = await requireAgencyAccess()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }
  const agencyId = persona.agency?.id
  const body = await request.json().catch(() => ({}))
  const cookieStore = await cookies()
  const connectionId = String(body?.connection_id || '').trim()
  if (!connectionId) {
    return NextResponse.json({ detail: 'connection_id is required' }, { status: 400 })
  }

  const cookieMetaToken = String(cookieStore.get('meta_access_token')?.value || '').trim()
  const cookieMetaAgency = String(cookieStore.get('meta_access_agency')?.value || '').trim()
  if (cookieMetaToken && cookieMetaAgency === agencyId && connectionId.includes('conn_meta_')) {
    await finishMetaOAuthForAgency(agencyId, {
      access_token: cookieMetaToken,
      external_owner: 'Agency Meta Connection',
    })
  }

  const connection = await getAgencyConnection(agencyId, connectionId)
  if (!connection) {
    return NextResponse.json({ detail: 'Connection not found' }, { status: 404 })
  }

  try {
    const payload =
      connection.provider === 'meta' && connection.auth_mode === 'agency_oauth' && connection.access_token
        ? await importMetaAccountsLive(agencyId, connectionId)
        : await runImportConnection(agencyId, connectionId)
    if (!payload) {
      return NextResponse.json({ detail: 'Connection not found' }, { status: 404 })
    }
    const response = NextResponse.json({
      ...payload,
      ...(await getSyncSnapshot(agencyId)),
      ...getConversionsSnapshot(),
    })
    return persistAgencySession(response, agencyId)
  } catch (error) {
    return NextResponse.json({ detail: error?.message || 'Import failed' }, { status: 502 })
  }
}
