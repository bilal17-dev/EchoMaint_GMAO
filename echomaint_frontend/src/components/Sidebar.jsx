import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import logo from '../assets/logo.png'
import { getUser, clearSession } from '../store/auth.store'
import './Sidebar.css'

const NAV_ITEMS_ADMIN = [
  { to: '/dashboard',             icon: 'ti-layout-dashboard', key: 'nav.dashboard' },
  { to: '/batiments',             icon: 'ti-building',          key: 'nav.batiments' },
  { to: '/equipements',           icon: 'ti-cpu',               key: 'nav.equipements' },
  { to: '/demandes-intervention', icon: 'ti-clipboard-list',    key: 'nav.demandes' },
  { to: '/interventions',         icon: 'ti-tool',              key: 'nav.interventions' },
  { to: '/maintenance-plans',     icon: 'ti-calendar-repeat',   key: 'nav.maintenanceplans' },
  { to: '/planning',              icon: 'ti-calendar',          key: 'nav.planning' },
  { to: '/stats',                 icon: 'ti-chart-bar',         key: 'nav.stats' },
  { to: '/utilisateurs',          icon: 'ti-users',             key: 'nav.utilisateurs' },
]

const NAV_ITEMS_TECHNICIEN = [
  { to: '/dashboard',     icon: 'ti-layout-dashboard', key: 'nav.dashboard' },
  { to: '/equipements',   icon: 'ti-cpu',               key: 'nav.equipements' },
  { to: '/interventions', icon: 'ti-tool',              key: 'nav.interventions' },
  { to: '/planning',      icon: 'ti-calendar',          key: 'nav.planning' },
]

const NAV_ITEMS_CLIENT = [
  { to: '/dashboard',             icon: 'ti-layout-dashboard', key: 'nav.dashboard' },
  { to: '/batiments',             icon: 'ti-building',          key: 'nav.batiments' },
  { to: '/equipements',           icon: 'ti-cpu',               key: 'nav.equipements' },
  { to: '/demandes-intervention', icon: 'ti-clipboard-list',    key: 'nav.demandes' },
  { to: '/interventions',         icon: 'ti-tool',              key: 'nav.interventions_client' },
]

const NAV_BY_ROLE = {
  admin:      NAV_ITEMS_ADMIN,
  technicien: NAV_ITEMS_TECHNICIEN,
  client:     NAV_ITEMS_CLIENT,
}

function getInitiales(nom = '', prenom = '') {
  return `${(prenom[0] || '').toUpperCase()}${(nom[0] || '').toUpperCase()}` || 'U'
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = getUser()

  const navItems = NAV_BY_ROLE[user?.role] || NAV_ITEMS_CLIENT

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  const initiales = getInitiales(user?.nom, user?.prenom)
  const roleLabel = t(`nav.roleLabels.${user?.role}`) || user?.role || ''

  return (
    <div className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>

      {/* Logo */}
      <div className="sidebar-logo">
        <img src={logo} alt="EchoMaint" className="sidebar-logo-img" />
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
            title={collapsed ? t(item.key) : ''}
            onClick={onMobileClose}
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
