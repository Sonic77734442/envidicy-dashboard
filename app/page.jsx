import AppShell from '../components/layout/AppShell'
import HomeContent from '../components/public/HomeContent'

export default async function HomePage() {
  return (
    <AppShell
      eyebrow="Envidicy Dashboard"
      title="Agency reporting and client access"
      subtitle="A hosted workspace for agencies to connect ad platforms, import accounts, sync reporting data, and share read-only dashboards with clients."
    >
      <HomeContent />
    </AppShell>
  )
}
