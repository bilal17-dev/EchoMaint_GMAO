import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import './Layout.css'

const PAGE_TITLES = {
  '/dashboard':               { title: 'Tableau de bord',         subtitle: 'Vue d\'ensemble de vos opérations de maintenance.' },
  '/batiments':               { title: 'Bâtiments',               subtitle: 'Gérez votre référentiel immobilier.' },
  '/equipements':             { title: 'Équipements',             subtitle: 'Suivez l\'état de votre parc machines.' },
  '/interventions':           { title: 'Interventions',           subtitle: 'Pilotez vos ordres de travail.' },
  '/planning':                { title: 'Planning',                subtitle: 'Visualisez les interventions planifiées.' },
  '/demandes-intervention':   { title: 'Demandes d\'intervention',subtitle: 'Traitez les signalements clients.' },
  '/maintenance-plans':       { title: 'Plans de maintenance',    subtitle: 'Configurez la maintenance préventive automatique.' },
  '/stats':                   { title: 'Statistiques & Exports',  subtitle: 'Analysez vos données de maintenance.' },
  '/utilisateurs':            { title: 'Utilisateurs',            subtitle: 'Gérez les comptes et les accès.' },
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(true)
  const location = useLocation()

  const matched = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )
  const { title = '', subtitle = '' } = matched?.[1] || {}

  return (
    <div className="layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="layout-main">
        <Navbar
          title={title}
          subtitle={subtitle}
          onMenuToggle={() => setCollapsed(c => !c)}
        />
        <div className="layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}