import AppShell from '../../components/layout/AppShell'
import ReviewContent from '../../components/public/ReviewContent'
import { requirePlatformPagePersona } from '../../lib/server/dashboard-api/page-auth'

export default async function ReviewPage() {
  await requirePlatformPagePersona()
  return (
    <AppShell
      eyebrow="Envidicy Dashboard"
      title="Meta Review Notes"
      subtitle="Short reviewer packet for Meta App Review submission."
    >
      <ReviewContent />
    </AppShell>
  )
}
