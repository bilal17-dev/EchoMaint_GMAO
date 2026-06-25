import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getUser, clearSession } from '../store/auth.store'
import './Navbar.css'

const LANG_LABELS = { fr: 'FR', en: 'EN' }

function getInitiales(nom = '', prenom = '') {
  return `${(prenom[0] || '').toUpperCase()}${(nom[0] || '').toUpperCase()}` || 'U'
}

// eslint-disable-next-line no-unused-vars
export default function Navbar({ title, subtitle, onMenuToggle }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()

  const isClientDashboard     = user?.role === 'client'     && location.pathname === '/dashboard'
  const isTechnicienDashboard = user?.role === 'technicien' && location.pathname === '/dashboard'

  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const langRef = useRef(null)
  const profileRef = useRef(null)

  const initiales = getInitiales(user?.nom, user?.prenom)
  const displayName = user
    ? `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email
    : '—'
  const roleLabel = t(`nav.roleLabels.${user?.role}`) || ''
  const currentLang = LANG_LABELS[i18n.language] || 'FR'

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  const changeLang = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('echomaint_langue', lng)
    setShowLangMenu(false)
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setShowLangMenu(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t('nav.greeting.morning')
    if (h < 18) return t('nav.greeting.afternoon')
    return t('nav.greeting.evening')
  }

  const firstName = user?.prenom || user?.nom || 'Admin'

  return (
    <div className="navbar">
      <div className="navbar-inner">

        {/* Partie gauche */}
        <div className="navbar-left">
          <button className="navbar-hamburger" onClick={onMenuToggle} title="Menu">
            <i className="ti ti-menu-2" aria-hidden="true" />
          </button>
          <div className="navbar-greeting">
            <p className="navbar-title">
              {getGreeting()} <span className="navbar-firstname">{firstName},</span>
            </p>
            {subtitle && <p className="navbar-subtitle">{subtitle}</p>}
          </div>
        </div>

        {/* Partie droite */}
        <div className="navbar-right">

          {/* Bouton contextuel : visible uniquement sur le dashboard client */}
          {isClientDashboard && (
            <>
              <button
                className="btn-nouvelle-di btn-nouvelle-di--sm"
                onClick={() => navigate('/demandes-intervention')}
              >
                <i className="ti ti-plus" /> {t('nav.nouvelleDemande')}
              </button>
              <div className="navbar-sep" />
            </>
          )}

          {/* Bouton contextuel : visible uniquement sur le dashboard technicien */}
          {isTechnicienDashboard && (
            <>
              <button
                className="btn-nouvelle-di btn-nouvelle-di--sm btn-nouvelle-di--violet"
                onClick={() => navigate('/interventions')}
              >
                <i className="ti ti-list-check" /> {t('nav.mesInterventions')}
              </button>
              <div className="navbar-sep" />
            </>
          )}

          <div className="navbar-sep" />

          {/* Notifications */}
          <button className="navbar-icon-btn" title={t('nav.notifications')}>
            <i className="ti ti-bell" aria-hidden="true" />
            <span className="navbar-notif-badge">3</span>
          </button>

          <div className="navbar-sep" />

          {/* Sélecteur de langue */}
          <div className="navbar-lang-wrap" ref={langRef}>
            <button
              className="navbar-lang-btn"
              onClick={() => setShowLangMenu(v => !v)}
            >
              <i className="ti ti-world" aria-hidden="true" />
              <span>{currentLang}</span>
              <i className="ti ti-chevron-down" aria-hidden="true" />
            </button>
            {showLangMenu && (
              <div className="navbar-dropdown">
                <button
                  className={`navbar-dropdown-item ${i18n.language === 'fr' ? 'active' : ''}`}
                  onClick={() => changeLang('fr')}
                >
                  🇫🇷 {t('lang.fr')}
                </button>
                <button
                  className={`navbar-dropdown-item ${i18n.language === 'en' ? 'active' : ''}`}
                  onClick={() => changeLang('en')}
                >
                  🇬🇧 {t('lang.en')}
                </button>
              </div>
            )}
          </div>

          <div className="navbar-sep" />

          {/* Profil */}
          <div className="navbar-profile-wrap" ref={profileRef}>
            <button
              className="navbar-profile-btn"
              onClick={() => setShowProfileMenu(v => !v)}
            >
              <div className="navbar-avatar">{initiales}</div>
              <i className="ti ti-chevron-down" aria-hidden="true" />
            </button>
            {showProfileMenu && (
              <div className="navbar-dropdown navbar-dropdown-right">
                <div className="navbar-dropdown-header">
                  <p className="navbar-dropdown-name">{displayName}</p>
                  <p className="navbar-dropdown-role">{roleLabel}</p>
                </div>
                <div className="navbar-dropdown-divider" />
                <button className="navbar-dropdown-item">
                  <i className="ti ti-user" aria-hidden="true" /> {t('nav.monProfil')}
                </button>
                <button className="navbar-dropdown-item">
                  <i className="ti ti-settings" aria-hidden="true" /> {t('nav.parametres')}
                </button>
                <div className="navbar-dropdown-divider" />
                <button className="navbar-dropdown-item navbar-dropdown-logout" onClick={handleLogout}>
                  <i className="ti ti-logout" aria-hidden="true" /> {t('nav.deconnexion')}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
