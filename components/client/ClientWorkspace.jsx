'use client'

import { useEffect, useState } from 'react'
import AppShell from '../layout/AppShell'

export default function ClientWorkspace() {
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [status, setStatus] = useState('Loading client scope...')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [profileRes, accountsRes] = await Promise.all([
          fetch('/api/dashboard/profile'),
          fetch('/api/dashboard/reporting/accounts'),
        ])
        if (!profileRes.ok || !accountsRes.ok) {
          throw new Error('Failed to load client context')
        }
        const [profileData, accountsData] = await Promise.all([profileRes.json(), accountsRes.json()])
        if (!active) return
        setProfile(profileData)
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
        setStatus('Client scope loaded.')
      } catch (error) {
        if (!active) return
        setStatus(error?.message || 'Failed to load client context')
        setProfile(null)
        setAccounts([])
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <AppShell eyebrow="Envidicy Dashboard" title="Client Layer" subtitle="Read-only client surface for the agency.">
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Level 3</p>
            <h2>Client Viewer</h2>
          </div>
          <div className="panel-actions">
            <a className="btn ghost" href="/dashboard">Open dashboard</a>
          </div>
        </div>
        <div className="grid-3">
          <article className="stat">
            <p className="muted">Visibility</p>
            <h3>{accounts.length}</h3>
            <p className="muted small">Only accounts assigned by the agency.</p>
          </article>
          <article className="stat">
            <p className="muted">Agency</p>
            <h3>{profile?.agency?.name || '—'}</h3>
            <p className="muted small">The tenant that manages access and reporting.</p>
          </article>
          <article className="stat">
            <p className="muted">Client</p>
            <h3>{profile?.client?.name || '—'}</h3>
            <p className="muted small">Read-only consumer layer without integrations or admin actions.</p>
          </article>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>{status}</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Assigned accounts</p>
            <h2>What the client will see in the dashboard</h2>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Account</th>
                <th>External ID</th>
                <th>Currency</th>
              </tr>
            </thead>
            <tbody>
              {!accounts.length ? (
                <tr>
                  <td colSpan={4}>No assigned accounts.</td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{String(account.platform || '').toUpperCase()}</td>
                    <td>{account.name}</td>
                    <td>{account.external_id}</td>
                    <td>{account.currency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
