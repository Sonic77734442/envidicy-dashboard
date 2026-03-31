'use client'

import { useEffect, useState } from 'react'
import LanguageToggle from '../layout/LanguageToggle'

const COPY = {
  en: {
    purpose: 'Purpose',
    verify: 'What reviewers should verify',
    auth: 'Agency-only auth',
    oauth: 'Meta OAuth',
    authBody: 'Only agency admins authenticate with Meta. Client viewers never log into Meta or receive Meta tokens.',
    readOnly: 'Read-only use',
    insights: 'Insights',
    insightsBody: 'The app imports available ad accounts and reads campaign and audience reporting data for dashboards.',
    delivery: 'Client delivery',
    reports: 'Internal reports',
    reportsBody: 'Clients consume only synced internal reports inside Envidicy Dashboard without any direct Meta access.',
    demo: 'Reviewer Demo',
    flow: 'Suggested test flow',
    permissions: 'Permissions',
    scope: 'Initial scope request',
    artifacts: 'Artifacts',
    files: 'Files prepared in this project',
    reviewerNotes: 'Reviewer notes',
    screencast: 'Screencast script',
    reviewerNotesBody: 'See `docs/META_REVIEW_NOTES.md` for the full English text to paste into Meta review notes.',
    screencastBody: 'See `docs/META_SCREENCAST_SCRIPT.md` for the exact video sequence and talking points.',
    steps: [
      'Log into Envidicy Dashboard as the agency admin test user.',
      'Open the Agency workspace.',
      'Click Connect Meta and complete Facebook Login.',
      'Return to the Agency workspace and click Import META.',
      'Activate one imported account for dashboard use.',
      'Run sync to read reporting snapshots.',
      'Open the Dashboard page and verify synced reporting data is displayed.',
      'Optionally log in as a client viewer and verify read-only access without Meta authentication.',
    ],
    adsRead: 'Required to read ad account reporting data, including campaign performance and audience breakdowns used in the agency dashboard.',
    businessManagement: 'Required to discover ad accounts available through Business Manager relationships when agency admins connect shared business assets.',
  },
  ru: {
    purpose: 'Назначение',
    verify: 'Что должен проверить ревьюер',
    auth: 'Только агентский доступ',
    oauth: 'Meta OAuth',
    authBody: 'Только администраторы агентства авторизуются через Meta. Клиенты не входят в Meta и не получают Meta tokens.',
    readOnly: 'Read-only использование',
    insights: 'Отчетные данные',
    insightsBody: 'Приложение импортирует доступные рекламные аккаунты и читает кампанийные и аудиторные данные для дашбордов.',
    delivery: 'Выдача клиенту',
    reports: 'Внутренние отчеты',
    reportsBody: 'Клиенты используют только синхронизированные внутренние отчеты внутри Envidicy Dashboard без прямого доступа к Meta.',
    demo: 'Демо для ревьюера',
    flow: 'Рекомендуемый сценарий проверки',
    permissions: 'Разрешения',
    scope: 'Первичный набор scope',
    artifacts: 'Материалы',
    files: 'Файлы, подготовленные в проекте',
    reviewerNotes: 'Reviewer notes',
    screencast: 'Скрипт скринкаста',
    reviewerNotesBody: 'См. `docs/META_REVIEW_NOTES.md` для полного английского текста, который нужно вставить в Meta review notes.',
    screencastBody: 'См. `docs/META_SCREENCAST_SCRIPT.md` для точной последовательности видео и talking points.',
    steps: [
      'Войдите в Envidicy Dashboard под тестовым agency admin.',
      'Откройте Agency workspace.',
      'Нажмите Connect Meta и завершите Facebook Login.',
      'Вернитесь в Agency workspace и нажмите Import META.',
      'Активируйте один импортированный аккаунт для dashboard.',
      'Запустите sync, чтобы получить reporting snapshots.',
      'Откройте Dashboard и проверьте, что отображаются синхронизированные данные.',
      'При необходимости войдите как client viewer и проверьте read-only доступ без Meta authentication.',
    ],
    adsRead: 'Нужно для чтения отчетных данных рекламных аккаунтов, включая кампанийную статистику и audience breakdowns, используемые в agency dashboard.',
    businessManagement: 'Нужно для обнаружения рекламных аккаунтов, доступных через связи Business Manager, когда agency admins подключают shared business assets.',
  },
}

export default function ReviewContent() {
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
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">{t.purpose}</p>
            <h2>{t.verify}</h2>
          </div>
          <LanguageToggle language={language} onChange={updateLanguage} />
        </div>
        <div className="grid-3">
          <article className="stat">
            <p className="muted">{t.auth}</p>
            <h3>{t.oauth}</h3>
            <p className="muted small">{t.authBody}</p>
          </article>
          <article className="stat">
            <p className="muted">{t.readOnly}</p>
            <h3>{t.insights}</h3>
            <p className="muted small">{t.insightsBody}</p>
          </article>
          <article className="stat">
            <p className="muted">{t.delivery}</p>
            <h3>{t.reports}</h3>
            <p className="muted small">{t.reportsBody}</p>
          </article>
        </div>
      </section>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{t.demo}</p>
              <h2>{t.flow}</h2>
            </div>
          </div>
          <ol className="muted small" style={{ display: 'grid', gap: 10, paddingLeft: 18, margin: 0 }}>
            {t.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{t.permissions}</p>
              <h2>{t.scope}</h2>
            </div>
          </div>
          <div className="details-grid">
            <div className="details-section">
              <h4>`ads_read`</h4>
              <p className="muted small">{t.adsRead}</p>
            </div>
            <div className="details-section">
              <h4>`business_management`</h4>
              <p className="muted small">{t.businessManagement}</p>
            </div>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">{t.artifacts}</p>
            <h2>{t.files}</h2>
          </div>
        </div>
        <div className="details-grid">
          <div className="details-section">
            <h4>{t.reviewerNotes}</h4>
            <p className="muted small">{t.reviewerNotesBody}</p>
          </div>
          <div className="details-section">
            <h4>{t.screencast}</h4>
            <p className="muted small">{t.screencastBody}</p>
          </div>
        </div>
      </section>
    </>
  )
}
