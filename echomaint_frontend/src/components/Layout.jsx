import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from '../components/Sidebar'
import { getUser } from '../store/auth.store'
import logo1 from '../assets/logo1.png'
import './Layout.css'

const BOTTOM_NAV = {
  admin: [
    { to: '/dashboard',             icon: 'ti-layout-dashboard', labelKey: 'nav.dashboard' },
    { to: '/interventions',         icon: 'ti-tool',             labelKey: 'nav.interventions' },
    { to: '/demandes-intervention', icon: 'ti-clipboard-list',   labelKey: 'nav.demandes' },
    { to: '/planning',              icon: 'ti-calendar',         labelKey: 'nav.planning' },
  ],
  technicien: [
    { to: '/dashboard',     icon: 'ti-layout-dashboard', labelKey: 'nav.dashboard' },
    { to: '/interventions', icon: 'ti-tool',             labelKey: 'nav.interventions' },
    { to: '/planning',      icon: 'ti-calendar',         labelKey: 'nav.planning' },
    { to: '/equipements',   icon: 'ti-cpu',              labelKey: 'nav.equipements' },
  ],
  client: [
    { to: '/dashboard',             icon: 'ti-layout-dashboard', labelKey: 'nav.dashboard' },
    { to: '/demandes-intervention', icon: 'ti-clipboard-list',   labelKey: 'nav.demandes' },
    { to: '/interventions',         icon: 'ti-tool',             labelKey: 'nav.interventions_client' },
    { to: '/equipements',           icon: 'ti-cpu',              labelKey: 'nav.equipements' },
  ],
}

export default function Layout() {
  const [collapsed,  setCollapsed]  = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation()
  const user = getUser()

  const bottomItems = BOTTOM_NAV[user?.role] || BOTTOM_NAV.client

  return (
    <div className={`layout${collapsed ? ' layout-collapsed' : ''}`}>

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Bouton toggle desktop — aligné sur le bord droit de la sidebar */}
      <button
        className="sidebar-toggle-ext"
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Agrandir la sidebar' : 'Réduire la sidebar'}
        title={collapsed ? 'Agrandir' : 'Réduire'}
      >
        <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-left'}`} aria-hidden="true" />
      </button>

      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <div className="main-content">

        {/* Barre mobile uniquement */}
        <div className="layout-mobile-bar">
          <button
            className="layout-hamburger"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
          >
            <i className="ti ti-menu-2" aria-hidden="true" />
          </button>
          <img src={logo1} alt="EchoMaint" className="layout-mobile-logo" />
        </div>

        <Outlet />

      </div>

      {/* Bottom navigation mobile */}
      <nav className="bottom-nav" aria-label="Navigation principale">
        {bottomItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true" />
            <span className="bottom-nav-label">{t(item.labelKey)}</span>
          </NavLink>
        ))}
        <button
          className={`bottom-nav-item bottom-nav-menu${mobileOpen ? ' active' : ''}`}
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Menu"
        >
          <i className="ti ti-menu-2" aria-hidden="true" />
          <span className="bottom-nav-label">Menu</span>
          {mobileOpen && <span className="bottom-nav-badge" aria-hidden="true" />}
        </button>
      </nav>

    </div>
  )
}
