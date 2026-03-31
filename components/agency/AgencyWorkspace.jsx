'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '../layout/AppShell'

function AccountPill({ account }) {
  return (
    <span className="chip chip-ghost" key={account.id}>
      {String(account.platform || '').toUpperCase()} · {account.name}
    </span>
  )
}

export default function AgencyWorkspace() {
  const ENABLED_AGENCY_PLATFORMS = ['meta']
  const [payload, setPayload] = useState({
    agency: null,
    accounts: [],
    clients: [],
    connections: [],
    external_accounts: [],
    dashboard_accounts: [],
    sync_jobs: [],
    sync_state: [],
    conversion_sources: [],
    conversion_events: [],
  })
  const [status, setStatus] = useState('Loading tenant workspace...')
  const [pending, setPending] = useState(false)
  const [createPending, setCreatePending] = useState(false)
  const [metaImportPending, setMetaImportPending] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedAccountIds, setSelectedAccountIds] = useState([])
  const [activatedAccountIds, setActivatedAccountIds] = useState([])
  const [form, setForm] = useState({ name: '', viewer_name: '', viewer_email: '' })

  async function loadWorkspace() {
    setPending(true)
    try {
      const [agencyRes, integrationsRes] = await Promise.all([fetch('/agency/mock'), fetch('/api/dashboard/integrations')])
      if (!agencyRes.ok || !integrationsRes.ok) {
        const err = await agencyRes.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to load agency workspace')
      }
      const [agencyData, integrationData] = await Promise.all([agencyRes.json(), integrationsRes.json()])
      const merged = {
        ...agencyData,
        ...integrationData,
        accounts: agencyData.accounts || integrationData.dashboard_accounts || [],
      }
      setPayload(merged)
      const firstClientId = merged?.clients?.[0]?.id || ''
      setSelectedClientId((current) => current || firstClientId)
      setActivatedAccountIds((integrationData.dashboard_accounts || []).map((account) => String(account.id)))
      setStatus('Agency workspace ready.')
    } catch (error) {
      setStatus(error?.message || 'Failed to load agency workspace')
      setPayload({
        agency: null,
        accounts: [],
        clients: [],
        connections: [],
        external_accounts: [],
        dashboard_accounts: [],
        sync_jobs: [],
        sync_state: [],
        conversion_sources: [],
        conversion_events: [],
      })
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    loadWorkspace()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const metaConnected = params.get('meta_connected')
    const provider = params.get('provider')
    const metaError = params.get('meta_error')
    if (metaConnected === '1' && provider === 'meta') {
      setStatus('Meta connected. Next step: click "Import META" to load available ad accounts.')
      const cleanUrl = `${window.location.pathname}`
      window.history.replaceState({}, '', cleanUrl)
    } else if (metaError) {
      setStatus(`Meta connect error: ${metaError}`)
    }
  }, [])

  const selectedClient = useMemo(
    () => payload.clients.find((client) => client.id === selectedClientId) || payload.clients[0] || null,
    [payload.clients, selectedClientId]
  )

  const selectedClientAccounts = useMemo(() => {
    if (!selectedClient) return []
    const assigned = new Set((selectedClient.account_ids || []).map((id) => String(id)))
    return payload.accounts.filter((account) => assigned.has(String(account.id)))
  }, [payload.accounts, selectedClient])

  useEffect(() => {
    setSelectedAccountIds(selectedClient?.account_ids || [])
  }, [selectedClient])

  async function saveAssignments() {
    if (!selectedClient) return
    setPending(true)
    try {
      const res = await fetch('/agency/mock/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient.id,
          account_ids: selectedAccountIds,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to save assignments')
      }
      await loadWorkspace()
      setSelectedClientId(selectedClient.id)
      setStatus(`Assignments for ${selectedClient.name} updated.`)
    } catch (error) {
      setStatus(error?.message || 'Failed to save assignments')
    } finally {
      setPending(false)
    }
  }

  async function createClient(event) {
    event.preventDefault()
    setCreatePending(true)
    try {
      const res = await fetch('/agency/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to create client')
      }
      const data = await res.json()
      await loadWorkspace()
      setSelectedClientId(data?.client?.id || '')
      setForm({ name: '', viewer_name: '', viewer_email: '' })
      setStatus(`Client ${data?.client?.name || ''} created.${data?.client?.temp_password ? ` Temporary client password: ${data.client.temp_password}.` : ''}`)
    } catch (error) {
      setStatus(error?.message || 'Failed to create client')
    } finally {
      setCreatePending(false)
    }
  }

  async function connectProvider(provider) {
    if (provider === 'meta') {
      window.location.href = '/api/dashboard/integrations/meta/start'
      return
    }
    if (provider === 'google') {
      window.location.href = '/api/dashboard/integrations/google/start'
      return
    }
    setPending(true)
    try {
      const res = await fetch('/api/dashboard/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect_provider', provider }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to connect provider')
      }
      await loadWorkspace()
      setStatus(`${provider} connection updated.`)
    } catch (error) {
      setStatus(error?.message || 'Failed to connect provider')
    } finally {
      setPending(false)
    }
  }

  async function importAccounts(connectionId, options = {}) {
    const isMeta = String(connectionId || '').includes('conn_meta_')
    setPending(true)
    if (isMeta) setMetaImportPending(true)
    try {
      const res = await fetch('/api/dashboard/integrations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to import accounts')
      }
      const data = await res.json().catch(() => ({}))
      await loadWorkspace()
      const importedCount = Array.isArray(data?.imported) ? data.imported.length : null
      if (importedCount === 0) {
        if (isMeta && data?.meta_debug) {
          const dbg = data.meta_debug
          setStatus(
            `Meta import: 0 accounts. me/adaccounts=${dbg.me_adaccounts}, businesses=${dbg.businesses}, owned=${dbg.owned_ad_accounts}, client=${dbg.client_ad_accounts}.`
          )
        } else {
          setStatus(isMeta ? 'Meta import completed, but no available accounts were found.' : 'Import completed, but no accounts were found.')
        }
      } else if (importedCount != null) {
        setStatus(`Import completed. Accounts found: ${importedCount}.`)
      } else {
        setStatus('External account import completed.')
      }
    } catch (error) {
      setStatus(error?.message || 'Failed to import accounts')
    } finally {
      setPending(false)
      if (isMeta) setMetaImportPending(false)
    }
  }

  async function saveActivatedAccounts() {
    setPending(true)
    try {
      const res = await fetch('/api/dashboard/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate_dashboard_accounts', account_ids: activatedAccountIds }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to update dashboard accounts')
      }
      await loadWorkspace()
      setStatus('Dashboard account set updated.')
    } catch (error) {
      setStatus(error?.message || 'Failed to update dashboard accounts')
    } finally {
      setPending(false)
    }
  }

  async function runSync() {
    setPending(true)
    try {
      const res = await fetch('/api/dashboard/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_sync' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to run sync')
      }
      await loadWorkspace()
      setStatus('Sync completed. The dashboard now reads internal snapshots.')
    } catch (error) {
      setStatus(error?.message || 'Failed to run sync')
    } finally {
      setPending(false)
    }
  }

  function toggleAccount(accountId) {
    setSelectedAccountIds((current) =>
      current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId]
    )
  }

  function toggleActivatedAccount(accountId) {
    setActivatedAccountIds((current) =>
      current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId]
    )
  }

  const visibleConnections = useMemo(
    () => payload.connections.filter((connection) => ENABLED_AGENCY_PLATFORMS.includes(String(connection.provider || '').toLowerCase())),
    [payload.connections]
  )

  const visibleExternalAccounts = useMemo(
    () => payload.external_accounts.filter((account) => ENABLED_AGENCY_PLATFORMS.includes(String(account.provider || '').toLowerCase())),
    [payload.external_accounts]
  )

  const visibleDashboardAccounts = useMemo(
    () => payload.dashboard_accounts.filter((account) => ENABLED_AGENCY_PLATFORMS.includes(String(account.platform || '').toLowerCase())),
    [payload.dashboard_accounts]
  )

  const externalAccountsByConnection = useMemo(() => {
    const map = new Map()
    visibleExternalAccounts.forEach((account) => {
      const rows = map.get(account.connection_id) || []
      rows.push(account)
      map.set(account.connection_id, rows)
    })
    return map
  }, [visibleExternalAccounts])

  const connectedProviders = visibleConnections.filter((connection) => connection.status === 'connected')
  const importedAccountsCount = visibleExternalAccounts.filter((account) => account.imported_at).length
  const activatedAccountsCount = visibleDashboardAccounts.length
  const canRunSync = activatedAccountsCount > 0
  const availableClientAccounts = visibleDashboardAccounts.length
    ? visibleDashboardAccounts
    : payload.accounts.filter((account) => ENABLED_AGENCY_PLATFORMS.includes(String(account.platform || '').toLowerCase()))
  const recentMetaSyncJobs = payload.sync_jobs.filter((job) => job.kind === 'meta_live_sync').slice(0, 10)
  const currentStep = !connectedProviders.length
    ? 'Connect at least one source'
    : !importedAccountsCount
      ? 'Import accounts from the connected source'
      : !activatedAccountsCount
        ? 'Activate the accounts you want inside the dashboard'
        : !payload.sync_jobs.length
          ? 'Run the first sync'
          : !payload.clients.length
            ? 'Create the first agency client'
            : 'Assign activated accounts to the client'

  return (
    <AppShell eyebrow="Envidicy Dashboard" title="Agency Workspace" subtitle="Connect ad sources, import accounts, and grant clients access only to their reports.">
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Tenant Admin</p>
            <h2>{payload.agency?.name || 'Agency'}</h2>
          </div>
          <div className="panel-actions">
            <span className="chip chip-ghost">Current step: {currentStep}</span>
            <button className="btn ghost" type="button" onClick={loadWorkspace} disabled={pending}>
              {pending ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="grid-3">
          <article className="stat">
            <p className="muted">Connected sources</p>
            <h3>{visibleConnections.length}</h3>
            <p className="muted small">OAuth and tokens stay on the agency side only. Clients never see them.</p>
          </article>
          <article className="stat">
            <p className="muted">Imported accounts</p>
            <h3>{visibleExternalAccounts.length}</h3>
            <p className="muted small">These are external ad accounts imported from Meta after the agency connects access.</p>
          </article>
          <article className="stat">
            <p className="muted">Active in dashboard</p>
            <h3>{visibleDashboardAccounts.length}</h3>
            <p className="muted small">Only these accounts are synced and can be assigned to agency clients.</p>
          </article>
          <article className="stat">
            <p className="muted">Conversion sources</p>
            <h3>{payload.conversion_sources.length}</h3>
            <p className="muted small">An internal conversion layer that can later be connected to a conversion API.</p>
          </article>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>{status}</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Quick start</p>
            <h2>Step-by-step flow</h2>
          </div>
        </div>
        <div className="grid-3">
          <article className="stat">
            <p className="muted">Step 1</p>
            <h3>Connect a source</h3>
            <p className="muted small">Start with Meta. After the agency authorizes access, we can import real ad accounts.</p>
            <div className="panel-actions" style={{ marginTop: 12 }}>
              <button className="btn primary" type="button" onClick={() => connectProvider('meta')} disabled={pending}>
                Connect Meta
              </button>
            </div>
          </article>

          <article className="stat">
            <p className="muted">Step 2</p>
            <h3>Import accounts</h3>
            <p className="muted small">After connection, load the available ad accounts. They will appear below as imported accounts.</p>
            <div className="panel-actions" style={{ marginTop: 12 }}>
              {visibleConnections.map((connection) => (
                <button
                  key={connection.id}
                  className="btn ghost"
                  type="button"
                  onClick={() => importAccounts(connection.id)}
                  disabled={pending || connection.status !== 'connected'}
                >
                  Import {String(connection.provider || '').toUpperCase()}
                </button>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 12 }}>
              {metaImportPending ? 'Meta import in progress...' : 'After a successful Meta connect, import can be run immediately.'}
            </p>
          </article>

          <article className="stat">
            <p className="muted">Step 3</p>
            <h3>Activate in dashboard and sync</h3>
            <p className="muted small">Select only the accounts needed in the product and run sync for them.</p>
            <div className="panel-actions" style={{ marginTop: 12 }}>
              <button className="btn primary" type="button" onClick={saveActivatedAccounts} disabled={pending}>
                Activate selected
              </button>
              <button className="btn ghost" type="button" onClick={runSync} disabled={pending || !canRunSync}>
                Run sync
              </button>
            </div>
          </article>
        </div>
        <div className="dashboard-hero-pills" style={{ marginTop: 14 }}>
          <span className="chip chip-ghost">Connected: {connectedProviders.length}</span>
          <span className="chip chip-ghost">Imported: {importedAccountsCount}</span>
          <span className="chip chip-ghost">Activated: {activatedAccountsCount}</span>
        </div>
        <div className="panel" style={{ marginTop: 16, background: 'rgba(15, 23, 42, 0.4)' }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Reviewer flow</p>
              <h2>Production-like demo path</h2>
            </div>
          </div>
          <p className="muted small">
            For Meta App Review, show only this path: connect Meta, import available ad accounts, activate an account in the
            dashboard, run sync, and view the report as a client without Meta authentication.
          </p>
          <div className="dashboard-hero-pills" style={{ marginTop: 12 }}>
            <span className="chip chip-ghost">1. Connect Meta</span>
            <span className="chip chip-ghost">2. Import accounts</span>
            <span className="chip chip-ghost">3. Activate account</span>
            <span className="chip chip-ghost">4. Run sync</span>
            <span className="chip chip-ghost">5. Open dashboard</span>
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>
            Reviewer demo account: `Smart Lab Admin` as agency admin. Client viewers consume synced reports only and never log into
            Meta.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Step 1</p>
              <h2>Agency sources</h2>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Connection</th>
                <th>Status</th>
                <th>Imported</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleConnections.map((connection) => (
                <tr key={connection.id}>
                  <td>{String(connection.provider || '').toUpperCase()}</td>
                  <td>
                    {connection.label}
                    <br />
                    <span className="muted small">{connection.external_owner}{connection.auth_mode ? ` · ${connection.auth_mode}` : ''}</span>
                  </td>
                  <td>{connection.status}</td>
                  <td>{connection.imported_accounts}</td>
                  <td>
                    <div className="panel-actions">
                      <button className="btn ghost" type="button" onClick={() => connectProvider(connection.provider)} disabled={pending}>
                        {connection.status === 'connected' ? 'Refresh auth' : 'Connect'}
                      </button>
                      <button className="btn ghost" type="button" onClick={() => importAccounts(connection.id)} disabled={pending || connection.status !== 'connected'}>
                        Import
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Step 2</p>
              <h2>Imported accounts</h2>
            </div>
          </div>
          <p className="muted small">These are real accounts returned from connected ad sources.</p>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Account</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleExternalAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>{String(account.provider || '').toUpperCase()}</td>
                    <td>
                      {account.name}
                      <br />
                      <span className="muted small">{account.external_id}</span>
                    </td>
                    <td>{account.active_in_dashboard ? 'Active in dashboard' : 'Imported only'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleConnections.map((connection) => {
            const rows = externalAccountsByConnection.get(connection.id) || []
            return rows.length ? (
              <div key={connection.id} style={{ marginTop: 10 }}>
                <p className="muted small">{String(connection.provider || '').toUpperCase()} · {rows.length} imported accounts</p>
              </div>
            ) : null
          })}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Step 3</p>
              <h2>Include in client dashboard</h2>
            </div>
          </div>
          <p className="muted small">Only the accounts checked below will be synced, reported, and assignable to clients.</p>
          <div className="table-wrapper" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Use</th>
                  <th>Platform</th>
                  <th>Account</th>
                  <th>External ID</th>
                </tr>
              </thead>
              <tbody>
                {visibleExternalAccounts.filter((account) => account.dashboard_account_id).map((account) => (
                  <tr key={account.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={activatedAccountIds.includes(String(account.dashboard_account_id))}
                        onChange={() => toggleActivatedAccount(String(account.dashboard_account_id))}
                      />
                    </td>
                    <td>{String(account.provider || '').toUpperCase()}</td>
                    <td>{account.name}</td>
                    <td>{account.external_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-actions" style={{ marginTop: 12 }}>
            <button className="btn primary" type="button" onClick={saveActivatedAccounts} disabled={pending}>
              {pending ? 'Saving...' : 'Update dashboard accounts'}
            </button>
            <button className="btn ghost" type="button" onClick={runSync} disabled={pending || !visibleDashboardAccounts.length}>
              {pending ? '...' : 'Run first sync'}
            </button>
          </div>
        </section>
      </section>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Step 4</p>
              <h2>Agency clients</h2>
            </div>
          </div>

          <form onSubmit={createClient} style={{ marginBottom: 18 }}>
            <p className="muted small" style={{ marginBottom: 12 }}>Create a client viewer who will later receive access only to the required accounts.</p>
            <div className="grid-3">
              <input
                className="field-input"
                placeholder="Client name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Viewer name"
                value={form.viewer_name}
                onChange={(event) => setForm((current) => ({ ...current, viewer_name: event.target.value }))}
              />
              <input
                className="field-input"
                placeholder="viewer email"
                value={form.viewer_email}
                onChange={(event) => setForm((current) => ({ ...current, viewer_email: event.target.value }))}
              />
            </div>
            <div className="panel-actions" style={{ marginTop: 12 }}>
              <button className="btn primary" type="submit" disabled={createPending}>
                {createPending ? 'Creating...' : 'Create client'}
              </button>
            </div>
          </form>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Viewer</th>
                  <th>Assignments</th>
                  <th>Persona</th>
                </tr>
              </thead>
              <tbody>
                {payload.clients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    style={{ cursor: 'pointer', background: client.id === selectedClient?.id ? 'rgba(59,130,246,0.08)' : undefined }}
                  >
                    <td>{client.name}</td>
                    <td>
                      {client.viewer_name}
                      <br />
                      <span className="muted small">{client.viewer_email}</span>
                    </td>
                    <td>{Array.isArray(client.account_ids) ? client.account_ids.length : 0}</td>
                    <td><span className="muted small">{client.persona_id}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Step 5</p>
              <h2>{selectedClient ? `Account assignments for ${selectedClient.name}` : 'Select a client'}</h2>
            </div>
          </div>

          {selectedClient ? (
            <>
              <p className="muted small">
                Viewer: {selectedClient.viewer_name} · {selectedClient.viewer_email}
              </p>
              <div className="dashboard-hero-pills" style={{ marginTop: 12 }}>
                {selectedClientAccounts.length
                  ? selectedClientAccounts.map((account) => <AccountPill key={account.id} account={account} />)
                  : <span className="muted small">No assigned accounts yet</span>}
              </div>
              <div className="table-wrapper" style={{ marginTop: 16 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Access</th>
                      <th>Platform</th>
                      <th>Account</th>
                      <th>External ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableClientAccounts.map((account) => {
                      const checked = selectedAccountIds.includes(account.id)
                      return (
                        <tr key={account.id}>
                          <td>
                            <input type="checkbox" checked={checked} onChange={() => toggleAccount(account.id)} />
                          </td>
                          <td>{String(account.platform || '').toUpperCase()}</td>
                          <td>{account.name}</td>
                          <td>{account.external_id}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="panel-actions" style={{ marginTop: 12 }}>
                <button className="btn primary" type="button" onClick={saveAssignments} disabled={pending}>
                  {pending ? 'Saving...' : 'Save assignments'}
                </button>
                <a className="btn ghost" href="/client">
                  Open client layer
                </a>
              </div>
            </>
          ) : (
            <p className="muted small">Select a client first.</p>
          )}
        </section>
      </section>
    </AppShell>
  )
}
