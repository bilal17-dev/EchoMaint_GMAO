import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import './Layout.css'

const PAGE_KEYS = {
  '/dashboard':             'layout.dashboard',
  '/batiments':             'layout.batiments',
  '/equipements':           'layout.equipements',
  '/interventions':         'layout.interventions',
  '/planning':              'layout.planning',
  '/demandes-intervention': 'layout.demandes',
  '/maintenance-plans':     'layout.maintenancePlans',
  '/stats':                 'layout.stats',
  '/utilisateurs':          'layout.utilisateurs',
}

export default function Layout() {
  const { t } = useTranslation()
  const [collapsed,   setCollapsed]   = useState(true)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const location = useLocation()

  const matchedKey = Object.entries(PAGE_KEYS).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1]

  const title    = matchedKey ? t(`${matchedKey}.title`)    : ''
  const subtitle = matchedKey ? t(`${matchedKey}.subtitle`) : ''

  const handleMenuToggle = () => {
    if (window.innerWidth < 768) setMobileOpen(o => !o)
    else setCollapsed(c => !c)
  }

  const closeMobileSidebar = () => setMobileOpen(false)

  return (
    <div className="layout">

      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={closeMobileSidebar} />
      )}

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileSidebar}
      />
      <div className="layout-main">
        <Navbar
          title={title}
          subtitle={subtitle}
          onMenuToggle={handleMenuToggle}
        />
        <div className="layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
