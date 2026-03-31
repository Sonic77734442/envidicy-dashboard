'use client'

import { useEffect, useState } from 'react'
import LanguageToggle from '../../components/layout/LanguageToggle'

const COPY = {
  en: {
    title: 'Sign in',
    badge: 'Meta reviewer flow ready',
    eyebrow: 'Business Login',
    subtitle: 'Platform access',
    description: 'Sign in as the Envidicy platform owner, an agency admin, or a client viewer. The server determines the role after authentication.',
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'name@company.com',
    passwordPlaceholder: 'Enter password',
    submit: 'Sign in',
    pending: 'Signing in...',
    help: 'Use the credentials provided in reviewer instructions. Access level is determined by the authenticated account.',
    legalPrefix: 'By signing in, you agree to the',
    terms: 'Terms of Use',
    legalMiddle: 'and acknowledge the',
    privacy: 'Privacy Policy',
    errorFallback: 'Unable to create session',
  },
  ru: {
    title: 'Войти',
    badge: 'Meta reviewer flow ready',
    eyebrow: 'Бизнес-вход',
    subtitle: 'Доступ к платформе',
    description: 'Войдите как владелец платформы Envidicy, администратор агентства или клиент. Роль определяется сервером после аутентификации.',
    email: 'Email',
    password: 'Пароль',
    emailPlaceholder: 'name@company.com',
    passwordPlaceholder: 'Введите пароль',
    submit: 'Войти',
    pending: 'Вход...',
    help: 'Используйте учетные данные из reviewer instructions. Уровень доступа определяется аутентифицированной учетной записью.',
    legalPrefix: 'Входя в систему, вы соглашаетесь с',
    terms: 'Условиями использования',
    legalMiddle: 'и подтверждаете',
    privacy: 'Политику конфиденциальности',
    errorFallback: 'Не удалось создать сессию',
  },
}

export default function LoginPage() {
  const [language, setLanguage] = useState('en')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem('dashboard_language')
    if (saved === 'ru' || saved === 'en') setLanguage(saved)
  }, [])

  function updateLanguage(nextLanguage) {
    setLanguage(nextLanguage)
    window.localStorage.setItem('dashboard_language', nextLanguage)
  }

  const t = COPY[language]

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
        throw new Error(data?.detail || t.errorFallback)
      }
      window.location.assign('/dashboard')
    } catch (err) {
      setError(err?.message || t.errorFallback)
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
            <h1>{t.title}</h1>
          </div>
          <span className="auth-chip">{t.badge}</span>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="panel" style={{ background: 'rgba(13, 19, 36, 0.55)' }}>
            <div className="panel-head" style={{ marginBottom: 14 }}>
              <div>
                <p className="eyebrow">{t.eyebrow}</p>
                <h2 style={{ marginTop: 0 }}>{t.subtitle}</h2>
              </div>
              <LanguageToggle language={language} onChange={updateLanguage} />
            </div>
            <p className="muted small" style={{ marginBottom: 14 }}>
              {t.description}
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                <span>{t.email}</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.emailPlaceholder} />
              </label>
              <label>
                <span>{t.password}</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t.passwordPlaceholder} />
              </label>
              <button className="auth-primary" type="submit" disabled={pending}>
                {pending ? t.pending : t.submit}
              </button>
            </form>
            <p className="auth-status">
              {t.help}
            </p>
            <p className="muted small" style={{ marginTop: 10 }}>
              {t.legalPrefix}{' '}
              <a href="https://www.envidicy.kz/term-of-use.pdf" target="_blank" rel="noreferrer">
                {t.terms}
              </a>{' '}
              {t.legalMiddle}{' '}
              <a href="https://www.envidicy.kz/policy.pdf" target="_blank" rel="noreferrer">
                {t.privacy}
              </a>
              .
            </p>
            {error ? <p className="auth-status">{error}</p> : null}
          </section>
        </div>
      </section>
    </main>
  )
}
