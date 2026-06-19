import { useTranslation } from 'react-i18next'
import './LanguageSelector.css'

// --- À brancher sur PUT /users/:id/langue une fois Dev 1 prêt ---
export default function LanguageSelector() {
  // eslint-disable-next-line no-unused-vars
  const { i18n, t } = useTranslation()

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('echomaint_langue', lng)
    // TODO : appeler api.put(`/users/${user.id}/langue`, { langue: lng })
  }

  return (
    <div className="lang-selector">
      <button
        className={`lang-btn ${i18n.language === 'fr' ? 'lang-btn-active' : ''}`}
        onClick={() => changeLanguage('fr')}
      >
        FR
      </button>
      <span className="lang-divider">|</span>
      <button
        className={`lang-btn ${i18n.language === 'en' ? 'lang-btn-active' : ''}`}
        onClick={() => changeLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}