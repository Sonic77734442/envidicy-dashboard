import AppShell from '../../components/layout/AppShell'
import { requirePlatformPagePersona } from '../../lib/server/dashboard-api/page-auth'

export default async function ReviewPage() {
  await requirePlatformPagePersona()
  return (
    <AppShell
      eyebrow="Envidicy Dashboard"
      title="Meta Review Notes"
      subtitle="Short reviewer packet for Meta App Review submission."
    >
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Purpose</p>
            <h2>What reviewers should verify</h2>
          </div>
        </div>
        <div className="grid-3">
          <article className="stat">
            <p className="muted">Agency-only auth</p>
            <h3>Meta OAuth</h3>
            <p className="muted small">Only agency admins authenticate with Meta. Client viewers never log into Meta or receive Meta tokens.</p>
          </article>
          <article className="stat">
            <p className="muted">Read-only use</p>
            <h3>Insights</h3>
            <p className="muted small">The app imports available ad accounts and reads campaign and audience reporting data for dashboards.</p>
          </article>
          <article className="stat">
            <p className="muted">Client delivery</p>
            <h3>Internal reports</h3>
            <p className="muted small">Clients consume only synced internal reports inside Envidicy Dashboard without any direct Meta access.</p>
          </article>
        </div>
      </section>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Reviewer Demo</p>
              <h2>Suggested test flow</h2>
            </div>
          </div>
          <ol className="muted small" style={{ display: 'grid', gap: 10, paddingLeft: 18, margin: 0 }}>
            <li>Log into Envidicy Dashboard as the agency admin test user.</li>
            <li>Open the Agency workspace.</li>
            <li>Click Connect Meta and complete Facebook Login.</li>
            <li>Return to the Agency workspace and click Import META.</li>
            <li>Activate one imported account for dashboard use.</li>
            <li>Run sync to read reporting snapshots.</li>
            <li>Open the Dashboard page and verify synced reporting data is displayed.</li>
            <li>Optionally log in as a client viewer and verify read-only access without Meta authentication.</li>
          </ol>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Permissions</p>
              <h2>Initial scope request</h2>
            </div>
          </div>
          <div className="details-grid">
            <div className="details-section">
              <h4>`ads_read`</h4>
              <p className="muted small">
                Required to read ad account reporting data, including campaign performance and audience breakdowns used in the agency dashboard.
              </p>
            </div>
            <div className="details-section">
              <h4>`business_management`</h4>
              <p className="muted small">
                Required to discover ad accounts available through Business Manager relationships when agency admins connect shared business assets.
              </p>
            </div>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Artifacts</p>
            <h2>Files prepared in this project</h2>
          </div>
        </div>
        <div className="details-grid">
          <div className="details-section">
            <h4>Reviewer notes</h4>
            <p className="muted small">See `docs/META_REVIEW_NOTES.md` for the full English text to paste into Meta review notes.</p>
          </div>
          <div className="details-section">
            <h4>Screencast script</h4>
            <p className="muted small">See `docs/META_SCREENCAST_SCRIPT.md` for the exact video sequence and talking points.</p>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
