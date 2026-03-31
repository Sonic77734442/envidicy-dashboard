'use client'

import { useEffect, useState } from 'react'
import LanguageToggle from '../layout/LanguageToggle'

const COPY = {
  en: {
    purpose: 'Purpose',
    title: 'Connect ad accounts and deliver client reporting',
    body:
      'Envidicy Dashboard is a SaaS application for agencies. Agency admins connect supported ad platforms, import the ad accounts they can access, activate selected accounts for sync, and provide clients with read-only dashboards that show only assigned reporting data.',
    signIn: 'Sign in',
    guide: 'Reviewer guide',
    privacy: 'Privacy Policy',
    terms: 'Terms of Use',
    access: 'Access model',
    owner: 'Platform owner',
    ownerValue: 'Manages agencies',
    agency: 'Agency admin',
    agencyValue: 'Connects integrations',
    client: 'Client viewer',
    clientValue: 'Read-only reports',
    step1: '1. Connect',
    step1Title: 'Authorize ad platforms',
    step1Body: 'Agency admins connect supported ad platforms through OAuth and keep tokens on the server side.',
    step2: '2. Import',
    step2Title: 'Import accessible accounts',
    step2Body: 'The app discovers accessible ad accounts, including manager-account hierarchies where applicable, and lets the agency choose what to sync.',
    step3: '3. Share',
    step3Title: 'Deliver client dashboards',
    step3Body: 'Clients sign in to view reporting only for the accounts assigned to them. They do not authenticate with the ad platforms directly.',
  },
  ru: {
    purpose: 'Назначение',
    title: 'Подключайте рекламные аккаунты и выдавайте клиентскую отчетность',
    body:
      'Envidicy Dashboard — это SaaS-приложение для агентств. Администраторы агентства подключают поддерживаемые рекламные платформы, импортируют доступные им аккаунты, активируют выбранные аккаунты для синхронизации и выдают клиентам read-only дашборды только с назначенными данными.',
    signIn: 'Войти',
    guide: 'Гайд для ревью',
    privacy: 'Политика конфиденциальности',
    terms: 'Условия использования',
    access: 'Модель доступа',
    owner: 'Владелец платформы',
    ownerValue: 'Управляет агентствами',
    agency: 'Админ агентства',
    agencyValue: 'Подключает интеграции',
    client: 'Клиент',
    clientValue: 'Только отчеты',
    step1: '1. Подключение',
    step1Title: 'Авторизация рекламных платформ',
    step1Body: 'Администраторы агентства подключают поддерживаемые рекламные платформы через OAuth, а токены хранятся на стороне сервера.',
    step2: '2. Импорт',
    step2Title: 'Импорт доступных аккаунтов',
    step2Body: 'Приложение находит доступные рекламные аккаунты, включая иерархии manager-аккаунтов, где это применимо, и позволяет агентству выбрать, что синхронизировать.',
    step3: '3. Доступ клиенту',
    step3Title: 'Клиентские дашборды',
    step3Body: 'Клиенты входят в систему и видят отчеты только по назначенным им аккаунтам. Они не авторизуются напрямую в рекламных платформах.',
  },
}

export default function HomeContent() {
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    const saved = window.localStorage.getItem('dashboard_language')
    if (saved === 'ru' || saved === 'en') setLanguage(saved)
  }, [])

  function updateLanguage(nextLanguage) {
    setLanguage(nextLanguage)
    window.localStorage.setItem('dashboard_language', nextLanguage)
  }

  const t = COPY[language]

  return (
    <>
      <section className="dashboard-hero panel">
        <div className="panel-head" style={{ marginBottom: 18 }}>
          <LanguageToggle language={language} onChange={updateLanguage} />
        </div>
        <div className="dashboard-hero-grid">
          <div className="dashboard-hero-main">
            <p className="eyebrow">{t.purpose}</p>
            <h1>{t.title}</h1>
            <p className="dashboard-hero-copy">{t.body}</p>
            <div className="dashboard-hero-actions">
              <a className="btn primary" href="/login">{t.signIn}</a>
              <a className="btn ghost" href="/review">{t.guide}</a>
            </div>
            <div className="dashboard-hero-pills">
              <a className="chip chip-ghost" href="https://www.envidicy.kz/policy.pdf" target="_blank" rel="noreferrer">{t.privacy}</a>
              <a className="chip chip-ghost" href="https://www.envidicy.kz/term-of-use.pdf" target="_blank" rel="noreferrer">{t.terms}</a>
            </div>
          </div>
          <div className="dashboard-hero-side">
            <div className="dashboard-hero-side-card">
              <p className="eyebrow">{t.access}</p>
              <div className="dashboard-hero-side-row">
                <span>{t.owner}</span>
                <strong>{t.ownerValue}</strong>
              </div>
              <div className="dashboard-hero-side-row">
                <span>{t.agency}</span>
                <strong>{t.agencyValue}</strong>
              </div>
              <div className="dashboard-hero-side-row">
                <span>{t.client}</span>
                <strong>{t.clientValue}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-3">
        <article className="stat">
          <p className="muted">{t.step1}</p>
          <h3>{t.step1Title}</h3>
          <p className="muted small">{t.step1Body}</p>
        </article>
        <article className="stat">
          <p className="muted">{t.step2}</p>
          <h3>{t.step2Title}</h3>
          <p className="muted small">{t.step2Body}</p>
        </article>
        <article className="stat">
          <p className="muted">{t.step3}</p>
          <h3>{t.step3Title}</h3>
          <p className="muted small">{t.step3Body}</p>
        </article>
      </section>
    </>
  )
}
