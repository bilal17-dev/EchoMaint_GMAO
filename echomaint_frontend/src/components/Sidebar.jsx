import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import logo from '../assets/logo.png'
import './Sidebar.css'

const navItems = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Tableau de bord' },
  { to: '/batiments', icon: 'ti-building', label: 'Bâtiments' },
  { to: '/equipements', icon: 'ti-cpu', label: 'Équipements' },
  { to: '/interventions', icon: 'ti-tool', label: 'Interventions' },
  { to: '/planning', icon: 'ti-calendar', label: 'Planning' },
  { to: '/stats', icon: 'ti-chart-bar', label: 'Statistiques' },
  { to: '/utilisateurs', icon: 'ti-users', label: 'Utilisateurs' },
]

const mockUser = {
  nom: 'Aïshatou Diop',
  role: 'Administrateur',
  initiales: 'AD'
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>

      {/* Logo */}
        <div className="sidebar-logo">
        <img src={logo} alt="EchoMaint" className="sidebar-logo-img" />
        {!collapsed && (
            <span className="sidebar-logo-text">
            
            </span>
        )}
        </div>

      {/* Bouton collapse */}
      <button
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Ouvrir' : 'Réduire'}
      >
        <i
          className={`ti ${collapsed ? 'ti-chevrons-right' : 'ti-chevrons-left'}`}
          aria-hidden="true"
        />
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
            title={collapsed ? item.label : ''}
          >
            <div className="sidebar-link-icon">
              <i className={`ti ${item.icon}`} aria-hidden="true" />
            </div>
            {!collapsed && (
              <span className="sidebar-link-label">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Notifications */}
        <button
          className="sidebar-link sidebar-notif"
          title={collapsed ? 'Notifications' : ''}
        >
          <div className="sidebar-link-icon">
            <i className="ti ti-bell" aria-hidden="true" />
            <span className="sidebar-badge">3</span>
          </div>
          {!collapsed && (
            <span className="sidebar-link-label">Notifications</span>
          )}
        </button>

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* User */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{mockUser.initiales}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{mockUser.nom}</p>
              <p className="sidebar-user-role">{mockUser.role}</p>
            </div>
          )}
        </div>

        {/* Déconnexion */}
        <button
          className="sidebar-link sidebar-logout"
          title={collapsed ? 'Déconnexion' : ''}
        >
          <div className="sidebar-link-icon">
            <i className="ti ti-logout" aria-hidden="true" />
          </div>
          {!collapsed && (
            <span className="sidebar-link-label sidebar-logout-label">
              Déconnexion
            </span>
          )}
        </button>
      </div>

    </div>
  )
}