import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import logo1 from '../assets/logo1.png'
import logo2 from '../assets/logo2.png'
import { getUser, clearSession } from '../store/auth.store'
import './Sidebar.css'

const NAV_GROUPS_ADMIN = [
  {
    labelKey: 'nav.group.overview',
    items: [
      { to: '/dashboard', icon: 'ti-layout-dashboard', key: 'nav.dashboard' },
    ],
  },
  {
    labelKey: 'nav.group.operations',
    items: [
      { to: '/interventions',         icon: 'ti-tool',           key: 'nav.interventions' },
      { to: '/demandes-intervention', icon: 'ti-clipboard-list', key: 'nav.demandes' },
      { to: '/planning',              icon: 'ti-calendar',       key: 'nav.planning' },
    ],
  },
  {
    labelKey: 'nav.group.patrimoine',
    items: [
      { to: '/equipements',       icon: 'ti-cpu',             key: 'nav.equipements' },
      { to: '/batiments',         icon: 'ti-building',        key: 'nav.batiments' },
      { to: '/maintenance-plans', icon: 'ti-calendar-repeat', key: 'nav.maintenanceplans' },
    ],
  },
  {
    labelKey: 'nav.group.pilotage',
    items: [
      { to: '/stats',        icon: 'ti-chart-bar', key: 'nav.stats' },
      { to: '/utilisateurs', icon: 'ti-users',     key: 'nav.utilisateurs' },
    ],
  },
]

const NAV_GROUPS_TECHNICIEN = [
  {
    labelKey: 'nav.group.overview',
    items: [{ to: '/dashboard', icon: 'ti-layout-dashboard', key: 'nav.dashboard' }],
  },
  {
    labelKey: 'nav.group.operations',
    items: [
      { to: '/interventions', icon: 'ti-tool',     key: 'nav.interventions' },
      { to: '/planning',      icon: 'ti-calendar', key: 'nav.planning' },
    ],
  },
  {
    labelKey: 'nav.group.patrimoine',
    items: [{ to: '/equipements', icon: 'ti-cpu', key: 'nav.equipements' }],
  },
]

const NAV_GROUPS_CLIENT = [
  {
    labelKey: 'nav.group.overview',
    items: [{ to: '/dashboard', icon: 'ti-layout-dashboard', key: 'nav.dashboard' }],
  },
  {
    labelKey: 'nav.group.operations',
    items: [
      { to: '/demandes-intervention', icon: 'ti-clipboard-list', key: 'nav.demandes' },
      { to: '/interventions',         icon: 'ti-tool',           key: 'nav.interventions_client' },
    ],
  },
  {
    labelKey: 'nav.group.patrimoine',
    items: [
      { to: '/equipements', icon: 'ti-cpu',     key: 'nav.equipements' },
      { to: '/batiments',   icon: 'ti-building', key: 'nav.batiments' },
    ],
  },
]

const NAV_BY_ROLE = {
  admin:      NAV_GROUPS_ADMIN,
  technicien: NAV_GROUPS_TECHNICIEN,
  client:     NAV_GROUPS_CLIENT,
}

function getInitiales(nom = '', prenom = '') {
  return `${(prenom[0] || '').toUpperCase()}${(nom[0] || '').toUpperCase()}` || 'U'
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }) {
  const { t, i18n } = useTranslation()
  const navigate     = useNavigate()
  const user         = getUser()

  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const langRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setShowLangMenu(false)
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const changeLang = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('echomaint_langue', lng)
    setShowLangMenu(false)
  }

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  const navGroups   = NAV_BY_ROLE[user?.role] || NAV_GROUPS_CLIENT
  const initiales   = getInitiales(user?.nom, user?.prenom)
  const displayName = user
    ? `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email
    : '—'
  const roleLabel   = t(`nav.roleLabels.${user?.role}`) || user?.role || ''
  const currentLang = i18n.language?.startsWith('en') ? 'EN' : 'FR'

  return (
    <div className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' sidebar-mobile-open' : ''}`}>

      {/* Logo */}
      <div className="sidebar-header">
        {!collapsed
          ? <img src={logo1} alt="EchoMaint" className="sidebar-logo-full" />
          : <img src={logo2} alt="EM" className="sidebar-logo-icon" />
        }
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map((group, gi) => (
          <div className="sidebar-group" key={gi}>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                data-tooltip={t(item.key)}
                onClick={onMobileClose}
              >
                {({ isActive }) => (
                  <>
                    <i className={`ti ${item.icon}`} aria-hidden="true" />
                    <span className="sidebar-item-label">{t(item.key)}</span>
                    {isActive && <span className="nav-active-dot" aria-hidden="true" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bas : langue + profil */}
      <div className="sidebar-bottom">

        {/* Sélecteur de langue */}
        <div className="sidebar-lang-wrap" ref={langRef}>
          <button
            className="lang-btn"
            onClick={() => setShowLangMenu(v => !v)}
            title={collapsed ? t('nav.language') : undefined}
          >
            <i className="ti ti-world" aria-hidden="true" />
            <span className="lang-label">
              {currentLang === 'EN' ? '🇬🇧 English' : '🇫🇷 Français'}
            </span>
          </button>
          {showLangMenu && (
            <div className={`user-dropdown${collapsed ? ' dropdown-right' : ' dropdown-up'}`}>
              <button
                className={`dropdown-item${i18n.language?.startsWith('fr') ? ' active' : ''}`}
                onClick={() => changeLang('fr')}
              >
                🇫🇷 {t('lang.fr')}
              </button>
              <button
                className={`dropdown-item${i18n.language?.startsWith('en') ? ' active' : ''}`}
                onClick={() => changeLang('en')}
              >
                🇬🇧 {t('lang.en')}
              </button>
            </div>
          )}
        </div>

        {/* Profil utilisateur */}
        <div className="sidebar-user-wrap" ref={userRef}>
          <button
            className="user-profile-btn"
            onClick={() => setShowUserMenu(v => !v)}
            title={collapsed ? displayName : undefined}
          >
            <div className="user-avatar">{initiales}</div>
            {!collapsed && (
              <div className="user-info">
                <div className="user-name">{displayName}</div>
                <div className="user-role">{roleLabel}</div>
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className={`user-dropdown dropdown-up${collapsed ? ' dropdown-right' : ''}`}>
              <div className="dropdown-header">
                <div className="d-name">{displayName}</div>
                <div className="d-email">{user?.email || roleLabel}</div>
              </div>
              <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                <i className="ti ti-logout" aria-hidden="true" />
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
