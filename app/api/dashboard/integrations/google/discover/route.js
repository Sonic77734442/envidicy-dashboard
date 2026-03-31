import { NextResponse } from 'next/server'
import { requireAgencyAccess } from '../../../../../../lib/server/dashboard-api/authz'
import {
  discoverGoogleAdsCustomers,
  mapGoogleDiscoveredCustomersToExternalAccounts,
} from '../../../../../../lib/server/dashboard-api/google-ads'
import {
  getAgencyConnection,
  activateSelectedExternalAccounts,
  getIntegrationsSnapshot,
  persistGoogleCustomerGraph,
  replaceImportedAccounts,
} from '../../../../../../lib/server/dashboard-api/integrations'
import { getConversionsSnapshot } from '../../../../../../lib/server/dashboard-api/conversions'
import { getSyncSnapshot } from '../../../../../../lib/server/dashboard-api/sync'
import { persistAgencySession } from '../../../../../../lib/server/dashboard-api/session-state'

export async function POST(request) {
  const { persona, error } = await requireAgencyAccess()
  if (error) {
    return NextResponse.json({ detail: error.detail }, { status: error.status })
  }

  const agencyId = persona.agency?.id
  const body = await request.json().catch(() => ({}))
  const connectionId = String(body?.connection_id || '').trim()
  if (!connectionId) {
    return NextResponse.json({ detail: 'connection_id is required' }, { status: 400 })
  }

  const connection = await getAgencyConnection(agencyId, connectionId)
  if (!connection || connection.provider !== 'google') {
    return NextResponse.json({ detail: 'Google connection not found' }, { status: 404 })
  }

  const refreshToken = String(connection.refresh_token || process.env.GOOGLE_ADS_REFRESH_TOKEN || '').trim()

  try {
    const discovered = await discoverGoogleAdsCustomers({ refreshToken, loginCustomerId: null })
    const payload = await replaceImportedAccounts(
      agencyId,
      connectionId,
      mapGoogleDiscoveredCustomersToExternalAccounts(discovered.discovered_customers)
    )
    await persistGoogleCustomerGraph(agencyId, connectionId, discovered.discovered_customers)

    const response = NextResponse.json({
      provider: 'google',
      agency_id: agencyId,
      ...payload,
      discovered,
      ...(await getIntegrationsSnapshot(agencyId)),
      ...(await getSyncSnapshot(agencyId)),
      ...getConversionsSnapshot(),
    })
    return persistAgencySession(response, agencyId)
  } catch (error) {
    return NextResponse.json(
      {
        detail: error?.message || 'Google Ads discovery failed',
        provider: 'google',
      },
      { status: 502 }
    )
  }
}
