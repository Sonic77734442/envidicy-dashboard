'use client'

export default function LanguageToggle({ language = 'en', onChange }) {
  return (
    <div className="panel-actions" style={{ marginLeft: 'auto' }}>
      <button className={`btn ${language === 'en' ? 'primary' : 'ghost'}`} type="button" onClick={() => onChange('en')}>
        EN
      </button>
      <button className={`btn ${language === 'ru' ? 'primary' : 'ghost'}`} type="button" onClick={() => onChange('ru')}>
        RU
      </button>
    </div>
  )
}
