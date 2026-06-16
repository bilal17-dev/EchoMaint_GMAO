import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import './Layout.css'

const pageTitles = {
  '/dashboard': { title: 'Tableau de bord', subtitle: "Vue d'ensemble de la maintenance" },
  '/batiments': { title: 'Bâtiments', subtitle: 'Gestion du référentiel immobilier' },
  '/equipements': { title: 'Équipements', subtitle: "Suivi du parc d'équipements" },
  '/interventions': { title: 'Interventions', subtitle: 'Gestion des interventions' },
  '/planning': { title: 'Planning', subtitle: 'Calendrier des interventions' },
  '/stats': { title: 'Statistiques', subtitle: 'Indicateurs de performance' },
  '/utilisateurs': { title: 'Utilisateurs', subtitle: 'Gestion des comptes' },
}

export default function Layout() {
  const location = useLocation()
  const page = pageTitles[location.pathname] || { title: 'EchoMaint', subtitle: '' }

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <Navbar title={page.title} subtitle={page.subtitle} />
        <div className="layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}