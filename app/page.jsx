import AppShell from '../components/layout/AppShell'

export default async function HomePage() {
  return (
    <AppShell
      eyebrow="Envidicy Dashboard"
      title="Agency reporting and client access"
      subtitle="A hosted workspace for agencies to connect ad platforms, import accounts, sync reporting data, and share read-only dashboards with clients."
    >
      <section className="dashboard-hero panel">
        <div className="dashboard-hero-grid">
          <div className="dashboard-hero-main">
            <p className="eyebrow">Purpose</p>
            <h1>Connect ad accounts and deliver client reporting</h1>
            <p className="dashboard-hero-copy">
              Envidicy Dashboard is a SaaS application for agencies. Agency admins connect Meta and Google Ads, import the ad accounts they can access, activate selected accounts for sync, and provide clients with read-only dashboards that show only assigned reporting data.
            </p>
            <div className="dashboard-hero-actions">
              <a className="btn primary" href="/login">Sign in</a>
              <a className="btn ghost" href="/review">Reviewer guide</a>
            </div>
            <div className="dashboard-hero-pills">
              <a className="chip chip-ghost" href="https://www.envidicy.kz/politics" target="_blank" rel="noreferrer">Privacy Policy</a>
              <a className="chip chip-ghost" href="https://www.envidicy.kz/term-of-use.pdf" target="_blank" rel="noreferrer">Terms of Use</a>
            </div>
          </div>
          <div className="dashboard-hero-side">
            <div className="dashboard-hero-side-card">
              <p className="eyebrow">Access model</p>
              <div className="dashboard-hero-side-row">
                <span>Platform owner</span>
                <strong>Manages agencies</strong>
              </div>
              <div className="dashboard-hero-side-row">
                <span>Agency admin</span>
                <strong>Connects integrations</strong>
              </div>
              <div className="dashboard-hero-side-row">
                <span>Client viewer</span>
                <strong>Read-only reports</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-3">
        <article className="stat">
          <p className="muted">1. Connect</p>
          <h3>Authorize ad platforms</h3>
          <p className="muted small">Agency admins connect supported ad platforms through OAuth and keep tokens on the server side.</p>
        </article>
        <article className="stat">
          <p className="muted">2. Import</p>
          <h3>Import accessible accounts</h3>
          <p className="muted small">The app discovers accessible ad accounts, including manager-account hierarchies where applicable, and lets the agency choose what to sync.</p>
        </article>
        <article className="stat">
          <p className="muted">3. Share</p>
          <h3>Deliver client dashboards</h3>
          <p className="muted small">Clients sign in to view reporting only for the accounts assigned to them. They do not authenticate with the ad platforms directly.</p>
        </article>
      </section>
    </AppShell>
  )
}
