import { useTranslation } from 'react-i18next'
import { getUser } from '../store/auth.store'
import LanguageSelector from './LanguageSelector'
import './Navbar.css'

const ROLE_LABELS = {
  admin:      'Administrateur',
  technicien: 'Technicien',
  client:     'Client',
}

function getInitiales(nom = '', prenom = '') {
  return `${(prenom[0] || '').toUpperCase()}${(nom[0] || '').toUpperCase()}` || 'U'
}

export default function Navbar({ title, subtitle }) {
  // eslint-disable-next-line no-unused-vars
  const { t } = useTranslation()
  const user = getUser()

  const initiales = getInitiales(user?.nom, user?.prenom)
  const displayName = user
    ? `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email
    : '—'
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || ''

  return (
    <div className="navbar">
      <div className="navbar-left">
        <p className="navbar-title">{title}</p>
        {subtitle && <p className="navbar-subtitle">{subtitle}</p>}
      </div>

      <div className="navbar-right">

        {/* Sélecteur de langue */}
        <div className="navbar-lang">
          <LanguageSelector />
        </div>

        {/* Dark mode */}
        <div className="navbar-darkmode">
          <i className="ti ti-moon" aria-hidden="true" />
        </div>

        {/* Notifications */}
        <div className="navbar-notif">
          <i className="ti ti-bell" aria-hidden="true" />
          <span className="navbar-notif-badge">3</span>
        </div>

        {/* Profil */}
        <div className="navbar-profile">
          <div className="navbar-avatar">{initiales}</div>
          <div className="navbar-profile-info">
            <p className="navbar-profile-name">{displayName}</p>
            <p className="navbar-profile-role">{roleLabel}</p>
          </div>
          <i className="ti ti-chevron-down" aria-hidden="true" />
        </div>

      </div>
    </div>
  )
}