import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import logo1 from '../assets/logo1.png'
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

      {/* Bouton toggle desktop — bord droit de la sidebar */}
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

        {/* Topbar mobile : logo à gauche, hamburger à droite */}
        <div className="layout-mobile-bar">
          <img src={logo1} alt="EchoMaint" className="layout-mobile-logo" />
          <button
            className={`layout-hamburger${mobileOpen ? ' is-open' : ''}`}
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
          >
            <i className={`ti ${mobileOpen ? 'ti-x' : 'ti-menu-2'}`} aria-hidden="true" />
          </button>
        </div>

        <Outlet />
      </div>

    </div>
  )
}
