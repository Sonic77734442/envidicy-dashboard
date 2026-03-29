import AppShell from '../components/layout/AppShell'
import { requirePagePersona } from '../lib/server/dashboard-api/page-auth'

export default async function HomePage() {
  await requirePagePersona()
  return (
    <AppShell eyebrow="Envidicy Dashboard" title="Three product surfaces" subtitle="Envidicy Super Admin, agency workspace, and client dashboard.">
      <section className="dashboard-hero panel">
        <div className="dashboard-hero-grid">
          <div className="dashboard-hero-main">
            <p className="eyebrow">Product Scope</p>
            <h1>Three real access surfaces</h1>
            <p className="dashboard-hero-copy">
              Envidicy has its own super-admin surface, the agency has its own operational workspace, and the client effectively sees only the assigned dashboard without settings access.
            </p>
            <div className="dashboard-hero-pills">
              <a className="chip chip-ghost" href="/platform">Envidicy Super Admin</a>
              <a className="chip chip-ghost" href="/agency">Agency workspace</a>
              <a className="chip chip-ghost" href="/dashboard">Client dashboard</a>
            </div>
          </div>
          <div className="dashboard-hero-side">
            <div className="dashboard-hero-side-card">
              <p className="eyebrow">Access model</p>
              <div className="dashboard-hero-side-row">
                <span>Envidicy</span>
                <strong>Platform control</strong>
              </div>
              <div className="dashboard-hero-side-row">
                <span>Agency</span>
                <strong>Connections and access</strong>
              </div>
              <div className="dashboard-hero-side-row">
                <span>Client</span>
                <strong>Dashboard only</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
