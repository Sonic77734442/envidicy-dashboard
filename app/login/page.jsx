'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const res = await fetch('/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail || 'Unable to create session')
      }
      window.location.assign('/dashboard')
    } catch (err) {
      setError(err?.message || 'Unable to create session')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-blur" />
      <section className="auth-card" style={{ width: 'min(960px, 95vw)', display: 'grid', gap: 18 }}>
        <div className="auth-head">
          <div>
            <p className="auth-eyebrow">Envidicy Dashboard</p>
            <h1>Sign in</h1>
          </div>
          <span className="auth-chip">Meta reviewer flow ready</span>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="panel" style={{ background: 'rgba(13, 19, 36, 0.55)' }}>
            <p className="eyebrow">Business Login</p>
            <h2 style={{ marginTop: 0 }}>Platform access</h2>
            <p className="muted small" style={{ marginBottom: 14 }}>
              Sign in as the Envidicy platform owner, an agency admin, or a client viewer. The server determines the role after authentication.
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" />
              </label>
              <label>
                <span>Password</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
              </label>
              <button className="auth-primary" type="submit" disabled={pending}>
                {pending ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <p className="auth-status">
              Use the credentials provided in reviewer instructions. Access level is determined by the authenticated account.
            </p>
            {error ? <p className="auth-status">{error}</p> : null}
          </section>
        </div>
      </section>
    </main>
  )
}
