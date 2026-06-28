import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from '../components/Sidebar'
import { getUser } from '../store/auth.store'
import './Layout.css'

// Mapping chemin → clé i18n pour le titre dans la topbar mobile
// Ordre du plus spécifique au moins spécifique pour éviter les faux positifs startsWith
const PAGE_TITLES = [
  ['/demandes-intervention', 'nav.demandes'],
  ['/interventions',         'nav.interventions'],
  ['/maintenance-plans',     'nav.maintenanceplans'],
  ['/dashboard',             'nav.dashboard'],
  ['/planning',              'nav.planning'],
  ['/equipements',           'nav.equipements'],
  ['/batiments',             'nav.batiments'],
  ['/stats',                 'nav.stats'],
  ['/utilisateurs',          'nav.utilisateurs'],
]

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
  const location = useLocation()

  const bottomItems = BOTTOM_NAV[user?.role] || BOTTOM_NAV.client
  const currentPageKey = PAGE_TITLES.find(([path]) => location.pathname.startsWith(path))?.[1] || 'nav.dashboard'

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

        {/* Barre mobile — titre de page centré (la navigation est dans la bottom nav) */}
        <div className="layout-mobile-bar">
          <span className="layout-mobile-title">{t(currentPageKey)}</span>
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
