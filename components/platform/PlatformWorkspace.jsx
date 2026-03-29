'use client'

import { useEffect, useState } from 'react'
import AppShell from '../layout/AppShell'

export default function PlatformWorkspace() {
  const [agencies, setAgencies] = useState([])
  const [status, setStatus] = useState('Loading super-admin workspace...')
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState({ name: '', admin_name: '', admin_email: '' })

  async function load() {
    setPending(true)
    try {
      const res = await fetch('/platform/mock')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to load agencies')
      }
      const data = await res.json()
      setAgencies(data?.agencies || [])
      setStatus('Super-admin workspace ready.')
    } catch (error) {
      setAgencies([])
      setStatus(error?.message || 'Failed to load agencies')
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function createAgency(event) {
    event.preventDefault()
    setPending(true)
    try {
      const res = await fetch('/platform/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to create agency')
      }
      const data = await res.json()
      setAgencies(data?.agencies || [])
      setForm({ name: '', admin_name: '', admin_email: '' })
      setStatus(
        `Agency ${data?.agency?.name || ''} created.${data?.agency?.temp_password ? ` Temporary admin password: ${data.agency.temp_password}.` : ''}`
      )
    } catch (error) {
      setStatus(error?.message || 'Failed to create agency')
    } finally {
      setPending(false)
    }
  }

  return (
    <AppShell eyebrow="Envidicy Dashboard" title="Envidicy Super Admin" subtitle="Envidicy as the owner of the entire dashboard platform.">
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Level 1</p>
            <h2>Envidicy Super Admin</h2>
          </div>
          <div className="panel-actions">
            <button className="btn ghost" type="button" onClick={load} disabled={pending}>
              {pending ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="grid-3">
          <article className="stat">
            <p className="muted">Agencies</p>
            <h3>{agencies.length}</h3>
            <p className="muted small">Envidicy creates tenant agencies and grants them access to the product.</p>
          </article>
          <article className="stat">
            <p className="muted">Agency admins</p>
            <h3>{agencies.length}</h3>
            <p className="muted small">Each agency gets its own admin who connects Meta and manages client access.</p>
          </article>
          <article className="stat">
            <p className="muted">Role split</p>
            <h3>3 surfaces</h3>
            <p className="muted small">Envidicy, the agency, and the client dashboard are separated into distinct surfaces.</p>
          </article>
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>{status}</p>
      </section>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Create tenant</p>
              <h2>Create a new agency</h2>
            </div>
          </div>
          <form onSubmit={createAgency}>
            <div className="grid-3">
              <input
                className="field-input"
                placeholder="Agency name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Agency admin name"
                value={form.admin_name}
                onChange={(event) => setForm((current) => ({ ...current, admin_name: event.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Agency admin email"
                value={form.admin_email}
                onChange={(event) => setForm((current) => ({ ...current, admin_email: event.target.value }))}
              />
            </div>
            <div className="panel-actions" style={{ marginTop: 12 }}>
              <button className="btn primary" type="submit" disabled={pending}>
                {pending ? 'Creating...' : 'Create agency'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Tenants</p>
              <h2>Current agencies</h2>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>Slug</th>
                  <th>Agency admin</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((agency) => (
                  <tr key={agency.id}>
                    <td>{agency.name}</td>
                    <td>{agency.slug}</td>
                    <td>
                      {agency.admin_name}
                      <br />
                      <span className="muted small">{agency.admin_email}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>
            After creation, the agency admin can sign in via `/login` and open the Agency workspace.
          </p>
        </section>
      </section>
    </AppShell>
  )
}
