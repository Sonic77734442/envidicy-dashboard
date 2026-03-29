import AppShell from '../../components/layout/AppShell'

export default function ArchitecturePage() {
  return (
    <AppShell eyebrow="Envidicy Dashboard" title="Architecture" subtitle="Target architecture for the standalone dashboard SaaS.">
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">3-Tier Model</p>
            <h2>Platform -&gt; Agency -&gt; Client</h2>
          </div>
        </div>
        <div className="grid-3">
          <article className="stat">
            <p className="muted">Platform</p>
            <h3>Envidicy</h3>
            <p className="muted small">Tenant lifecycle, limits, support, integration policy, billing.</p>
          </article>
          <article className="stat">
            <p className="muted">Agency</p>
            <h3>Tenant admin</h3>
            <p className="muted small">Connections, account mapping, users, roles, client visibility.</p>
          </article>
          <article className="stat">
            <p className="muted">Client</p>
            <h3>Read-only viewer</h3>
            <p className="muted small">Assigned accounts, reports, exports, conversion-aware analytics.</p>
          </article>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          The detailed architecture note is available in `docs/ARCHITECTURE.md` inside the project.
        </p>
      </section>
    </AppShell>
  )
}
