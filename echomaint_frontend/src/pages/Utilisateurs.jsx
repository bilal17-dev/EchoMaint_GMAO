import { useState } from 'react'
import './Utilisateurs.css'

const mockUtilisateurs = [
  { id: 'u1', nom: 'Admin', prenom: 'Super', email: 'admin@echomaint.com', role: 'admin', actif: true },
  { id: 'u2', nom: 'Diallo', prenom: 'Mamadou', email: 'tech1@echomaint.com', role: 'technicien', actif: true },
  { id: 'u3', nom: 'Sow', prenom: 'Aminata', email: 'tech2@echomaint.com', role: 'technicien', actif: true },
  { id: 'u4', nom: 'Fall', prenom: 'Fatou', email: 'client1@echomaint.com', role: 'client', actif: true },
  { id: 'u5', nom: 'Ndiaye', prenom: 'Cheikh', email: 'client2@echomaint.com', role: 'client', actif: false },
]

const ROLE_COLORS = {
  admin:      { bg: '#F5F3FF', color: '#8B5CF6' },
  technicien: { bg: '#EFF6FF', color: '#2563EB' },
  client:     { bg: '#F0FDF4', color: '#22C55E' },
}

export default function Utilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState(mockUtilisateurs)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', role: 'technicien', password: '' })
  const [erreurs, setErreurs] = useState([])

  const filtered = utilisateurs.filter(u => {
    const matchSearch = `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole ? u.role === filterRole : true
    return matchSearch && matchRole
  })

  const handleToggleActif = (id) => {
    setUtilisateurs(prev => prev.map(u => u.id === id ? { ...u, actif: !u.actif } : u))
  }

  const handleCreer = () => {
    const errs = []
    if (!form.nom) errs.push('Le nom est obligatoire.')
    if (!form.prenom) errs.push('Le prénom est obligatoire.')
    if (!form.email) errs.push('L\'email est obligatoire.')
    if (!form.password || form.password.length < 6) errs.push('Le mot de passe doit faire au moins 6 caractères.')
    if (utilisateurs.find(u => u.email === form.email)) errs.push('Cet email est déjà utilisé.')
    if (errs.length) { setErreurs(errs); return }

    const nouvel = {
      id: `u${Date.now()}`,
      nom: form.nom,
      prenom: form.prenom,
      email: form.email,
      role: form.role,
      actif: true,
    }
    setUtilisateurs(prev => [nouvel, ...prev])
    setModal(null)
    setForm({ nom: '', prenom: '', email: '', role: 'technicien', password: '' })
    setErreurs([])
  }

  return (
    <div className="utilisateurs">

      {/* Header */}
      <div className="utilisateurs-header">
        <div className="utilisateurs-filters">
          <div className="search-box">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="technicien">Technicien</option>
            <option value="client">Client</option>
          </select>
        </div>
        <button className="btn-primary" onClick={() => setModal('creer')}>
          <i className="ti ti-plus" aria-hidden="true" />
          Nouvel utilisateur
        </button>
      </div>

      {/* Stats rapides */}
      <div className="utilisateurs-stats">
        {['admin', 'technicien', 'client'].map(role => (
          <div key={role} className="stat-card">
            <div className="stat-icon" style={{ background: ROLE_COLORS[role].bg }}>
              <i className={`ti ${role === 'admin' ? 'ti-shield' : role === 'technicien' ? 'ti-tool' : 'ti-user'}`}
                style={{ color: ROLE_COLORS[role].color }} aria-hidden="true" />
            </div>
            <div>
              <p className="stat-label">{role.charAt(0).toUpperCase() + role.slice(1)}s</p>
              <p className="stat-value">{utilisateurs.filter(u => u.role === role).length}</p>
            </div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF2F2' }}>
            <i className="ti ti-user-off" style={{ color: '#EF4444' }} aria-hidden="true" />
          </div>
          <div>
            <p className="stat-label">Désactivés</p>
            <p className="stat-value">{utilisateurs.filter(u => !u.actif).length}</p>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="utilisateurs-table-wrap">
        <table className="utilisateurs-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty">Aucun utilisateur trouvé</td>
              </tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar" style={{ background: ROLE_COLORS[u.role].bg, color: ROLE_COLORS[u.role].color }}>
                      {u.prenom[0]}{u.nom[0]}
                    </div>
                    <div>
                      <p className="user-nom">{u.prenom} {u.nom}</p>
                    </div>
                  </div>
                </td>
                <td className="user-email">{u.email}</td>
                <td>
                  <span className="badge" style={{ background: ROLE_COLORS[u.role].bg, color: ROLE_COLORS[u.role].color }}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className={`statut-badge ${u.actif ? 'actif' : 'inactif'}`}>
                    {u.actif ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className={`btn-toggle ${u.actif ? 'btn-desactiver' : 'btn-activer'}`}
                      onClick={() => handleToggleActif(u.id)}
                      title={u.actif ? 'Désactiver' : 'Activer'}
                    >
                      <i className={`ti ${u.actif ? 'ti-user-off' : 'ti-user-check'}`} aria-hidden="true" />
                      {u.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal créer */}
      {modal === 'creer' && (
        <div className="modal-overlay" onClick={() => { setModal(null); setErreurs([]) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvel utilisateur</h2>
              <button onClick={() => { setModal(null); setErreurs([]) }}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="Ex: Mamadou"
                    value={form.prenom}
                    onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Nom <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="Ex: Diallo"
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email"
                  placeholder="Ex: mamadou@echomaint.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rôle</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="admin">Admin</option>
                    <option value="technicien">Technicien</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Mot de passe <span className="required">*</span></label>
                  <input
                    type="password"
                    placeholder="Min. 6 caractères"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>
              {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => { setModal(null); setErreurs([]) }}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleCreer}>
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}