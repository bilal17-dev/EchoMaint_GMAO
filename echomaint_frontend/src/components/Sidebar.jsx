import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import logo from '../assets/logo.png'
import { getUser, clearSession } from '../store/auth.store'
import LanguageSelector from './LanguageSelector'
import './Sidebar.css'

// Navigation filtrée par rôle
const NAV_ITEMS_ADMIN = [
  { to: '/dashboard',              icon: 'ti-layout-dashboard', key: 'nav.dashboard' },
  { to: '/batiments',              icon: 'ti-building',          key: 'nav.batiments' },
  { to: '/equipements',            icon: 'ti-cpu',               key: 'nav.equipements' },
  { to: '/interventions',          icon: 'ti-tool',              key: 'nav.interventions' },
  { to: '/planning',               icon: 'ti-calendar',          key: 'nav.planning' },
  { to: '/demandes-intervention',  icon: 'ti-clipboard-list',    key: 'nav.demandes' },
  { to: '/stats',                  icon: 'ti-chart-bar',         key: 'nav.stats' },
  { to: '/utilisateurs',           icon: 'ti-users',             key: 'nav.utilisateurs' },
]

const NAV_ITEMS_TECHNICIEN = [
  { to: '/dashboard',    icon: 'ti-layout-dashboard', key: 'nav.dashboard' },
  { to: '/equipements',  icon: 'ti-cpu',               key: 'nav.equipements' },
  { to: '/interventions',icon: 'ti-tool',              key: 'nav.interventions' },
  { to: '/planning',     icon: 'ti-calendar',          key: 'nav.planning' },
]

const NAV_ITEMS_CLIENT = [
  { to: '/dashboard',             icon: 'ti-layout-dashboard', key: 'nav.dashboard' },
  { to: '/batiments',             icon: 'ti-building',          key: 'nav.batiments' },
  { to: '/equipements',           icon: 'ti-cpu',               key: 'nav.equipements' },
  { to: '/demandes-intervention', icon: 'ti-clipboard-list',    key: 'nav.demandes' },
]

const NAV_BY_ROLE = {
  admin:      NAV_ITEMS_ADMIN,
  technicien: NAV_ITEMS_TECHNICIEN,
  client:     NAV_ITEMS_CLIENT,
}

const ROLE_LABELS = {
  admin:      'Administrateur',
  technicien: 'Technicien',
  client:     'Client',
}

function getInitiales(nom = '', prenom = '') {
  return `${(prenom[0] || '').toUpperCase()}${(nom[0] || '').toUpperCase()}` || 'U'
}

export default function Sidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = getUser()
  const [collapsed, setCollapsed] = useState(true)

  const navItems = NAV_BY_ROLE[user?.role] || NAV_ITEMS_CLIENT

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  const initiales = getInitiales(user?.nom, user?.prenom)
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || ''

  return (
    <div className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>

      {/* Logo */}
      <div className="sidebar-logo">
        <img src={logo} alt="EchoMaint" className="sidebar-logo-img" />
        {!collapsed && <span className="sidebar-logo-text" />}
      </div>

      {/* Bouton collapse */}
      <button
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Ouvrir' : 'Réduire'}
      >
        <i className={`ti ${collapsed ? 'ti-chevrons-right' : 'ti-chevrons-left'}`} aria-hidden="true" />
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
            title={collapsed ? t(item.key) : ''}
          >
            <div className="sidebar-link-icon">
              <i className={`ti ${item.icon}`} aria-hidden="true" />
            </div>
            {!collapsed && (
              <span className="sidebar-link-label">{t(item.key)}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">

        {/* Sélecteur de langue (RG-I18N-01) */}
        {!collapsed && (
          <div className="sidebar-lang">
            <LanguageSelector />
          </div>
        )}

        {/* Notifications */}
        <button className="sidebar-link sidebar-notif" title={collapsed ? 'Notifications' : ''}>
          <div className="sidebar-link-icon">
            <i className="ti ti-bell" aria-hidden="true" />
            <span className="sidebar-badge">3</span>
          </div>
          {!collapsed && (
            <span className="sidebar-link-label">Notifications</span>
          )}
        </button>

        <div className="sidebar-divider" />

        {/* User */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initiales}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">
                {user ? `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email : '—'}
              </p>
              <p className="sidebar-user-role">{roleLabel}</p>
            </div>
          )}
        </div>

        {/* Déconnexion */}
        <button
          className="sidebar-link sidebar-logout"
          onClick={handleLogout}
          title={collapsed ? t('nav.logout') : ''}
        >
          <div className="sidebar-link-icon">
            <i className="ti ti-logout" aria-hidden="true" />
          </div>
          {!collapsed && (
            <span className="sidebar-link-label sidebar-logout-label">
              {t('nav.logout')}
            </span>
          )}
        </button>

      </div>
    </div>
  )
}