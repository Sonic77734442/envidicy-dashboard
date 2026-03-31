'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getPersonaLabel } from '../../lib/dashboard/mock-session'

function getNavItems(session) {
  if (!session) return []
  if (session.role === 'platform_owner') {
    return [
      { label: 'Envidicy', href: '/platform' },
      { label: 'Agency', href: '/agency' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Review', href: '/review' },
    ]
  }
  if (session.role === 'agency_admin') {
    return [
      { label: 'Agency', href: '/agency' },
      { label: 'Dashboard', href: '/dashboard' },
    ]
  }
  return [{ label: 'Dashboard', href: '/dashboard' }]
}

export default function AppShell({ eyebrow, title, subtitle, children }) {
  const pathname = usePathname()
  const [session, setSession] = useState(null)
  const navItems = getNavItems(session)
  const showSidebar = !(pathname === '/' && !session)

  useEffect(() => {
    let active = true
    async function loadSession() {
      const sessionRes = await fetch('/auth/session').catch(() => null)
      if (!active) return
      if (!sessionRes || !sessionRes.ok) {
        setSession(null)
        return
      }
      const data = await sessionRes.json().catch(() => null)
      if (!active) return
      setSession(data?.session || null)
    }
    loadSession()
    return () => {
      active = false
    }
  }, [pathname])

  async function logout() {
    await fetch('/auth/session', { method: 'DELETE' }).catch(() => null)
    window.location.href = '/login'
  }

  return (
    <>
      {showSidebar ? (
        <nav className="sidebar">
          <div className="sidebar-brand">Envidicy Dashboard</div>
          <div className="nav">
            {navItems.map((item) => (
              <a key={item.href} className={`nav-link ${pathname === item.href ? 'active' : ''}`} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <div className="nav-footer">
            {session ? (
              <>
                <span className="muted small">{getPersonaLabel(session)}</span>
                <span className="muted small">
                  {session.role === 'platform_owner'
                    ? 'Envidicy platform level'
                    : session.role === 'agency_admin'
                      ? `${session.agency?.name || 'Agency'} · manages access and integrations`
                      : `${session.client?.name || 'Client'} · read-only`}
                </span>
                <button className="nav-link nav-exit" type="button" onClick={logout}>
                  Sign out
                </button>
                <a
                  className="nav-link"
                  href="https://www.envidicy.kz/term-of-use.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Terms of Use
                </a>
                <a
                  className="nav-link"
                  href="https://www.envidicy.kz/policy.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy Policy
                </a>
              </>
            ) : (
              <>
                <a className="nav-link" href="/login">Sign in</a>
                <a
                  className="nav-link"
                  href="https://www.envidicy.kz/term-of-use.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Terms of Use
                </a>
                <a
                  className="nav-link"
                  href="https://www.envidicy.kz/policy.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy Policy
                </a>
              </>
            )}
          </div>
        </nav>
      ) : null}

      <div className={`app ${showSidebar ? 'with-sidebar' : ''} plan-app`}>
        <div className="bg-blur" />
        <header className="topbar">
          <div className="topbar-right">
            <span className="topbar-context">{eyebrow || 'Envidicy Dashboard'}</span>
          </div>
        </header>

        <main className="plan-wrap">
          <section className="hero">
            <p className="eyebrow">{eyebrow || 'Envidicy Dashboard'}</p>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </section>
          {children}
        </main>
      </div>
    </>
  )
}
