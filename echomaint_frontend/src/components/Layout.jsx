import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import './Layout.css'

export default function Layout() {
  const [collapsed,  setCollapsed]  = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

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
          <span className="layout-mobile-brand">EchoMaint</span>
        </div>

        <Outlet />

      </div>
    </div>
  )
}
