import PlatformWorkspace from '../../components/platform/PlatformWorkspace'
import { requirePlatformPagePersona } from '../../lib/server/dashboard-api/page-auth'

export default async function PlatformPage() {
  await requirePlatformPagePersona()
  return <PlatformWorkspace />
}
