import './Navbar.css'

export default function Navbar({ title, subtitle }) {
  return (
    <div className="navbar">
      <div className="navbar-left">
        <p className="navbar-title">{title}</p>
        {subtitle && <p className="navbar-subtitle">{subtitle}</p>}
      </div>

      <div className="navbar-right">
        {/* Bouton dark mode */}
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
          <div className="navbar-avatar">AD</div>
          <div className="navbar-profile-info">
            <p className="navbar-profile-name">Aïshatou Diop</p>
            <p className="navbar-profile-role">Administrateur</p>
          </div>
          <i className="ti ti-chevron-down" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}