import AgencyWorkspace from '../../components/agency/AgencyWorkspace'
import { requireAgencyPagePersona } from '../../lib/server/dashboard-api/page-auth'

export default async function AgencyPage() {
  await requireAgencyPagePersona()
  return <AgencyWorkspace />
}
