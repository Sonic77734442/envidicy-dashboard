import DashboardWorkspace from '../../components/dashboard/DashboardWorkspace'
import { requirePagePersona } from '../../lib/server/dashboard-api/page-auth'

export default async function DashboardPage() {
  await requirePagePersona()
  return <DashboardWorkspace />
}
