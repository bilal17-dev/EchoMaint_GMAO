import { useState, useEffect } from 'react'
import './Utilisateurs.css'
import { getUtilisateurs, createUtilisateur, updateUtilisateur } from '../api/utilisateurs.api'
import { createClient } from '../api/clients.api'

const ROLE_COLORS = {
  admin:      { bg: '#F5F3FF', color: '#8B5CF6' },
  technicien: { bg: '#EFF6FF', color: '#2563EB' },
  client:     { bg: '#F0FDF4', color: '#22C55E' },
}

const emptyForm = {
  nom: '', prenom: '', email: '', role: 'technicien', password: '',
  entreprise_nom: '', entreprise_adresse: '', entreprise_telephone: '', entreprise_email_contact: '',
}

export default function Utilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreurChargement, setErreurChargement] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [erreurs, setErreurs] = useState([])
  const [submitting, setSubmitting] = useState(false)

  

  const chargerUtilisateurs = async () => {
    setLoading(true)
    setErreurChargement('')
    try {
      const res = await getUtilisateurs()
      const liste = Array.isArray(res) ? res : (res?.data ?? [])
      setUtilisateurs(liste)
    } catch (error) {
      console.error('Erreur utilisateurs:', error)
      setErreurChargement('Impossible de charger les utilisateurs.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { chargerUtilisateurs() }, [])

  const filtered = utilisateurs.filter(u => {
    const matchSearch = `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole ? u.role === filterRole : true
    return matchSearch && matchRole
  })

  const handleToggleActif = async (id, actifActuel) => {
    try {
      const res = await updateUtilisateur(id, { actif: !actifActuel })
      const updated = res?.data ?? res
      setUtilisateurs(prev => prev.map(u => u.id === id ? updated : u))
    } catch (error) {
      window.alert(error.response?.data?.message || 'Erreur lors de la mise à jour.')
    }
  }

  const handleCreer = async () => {
    const errs = []
    if (!form.prenom)                              errs.push('Le prénom est obligatoire.')
    if (!form.nom)                                 errs.push('Le nom est obligatoire.')
    if (!form.email)                               errs.push('L\'email est obligatoire.')
    if (!form.password || form.password.length < 6) errs.push('Le mot de passe doit faire au moins 6 caractères.')
    if (form.role === 'client' && !form.entreprise_nom) errs.push('Le nom de l\'entreprise est obligatoire.')
    if (errs.length) { setErreurs(errs); return }

    setSubmitting(true)
    setErreurs([])

    try {
      let id_client = null

      // 1. Si rôle client → créer d'abord l'entrée dans la table clients
      if (form.role === 'client') {
        const resClient = await createClient({
          nom:       form.entreprise_nom,
          email_contact: form.entreprise_email_contact || null,
          adresse:   form.entreprise_adresse || null,
          telephone: form.entreprise_telephone || null,
        })
        const clientCree = resClient?.data ?? resClient
        id_client = clientCree?.id ?? null
      }

      // 2. Créer l'utilisateur avec le lien id_client si applicable
      const payload = {
        nom:      form.nom,
        prenom:   form.prenom,
        email:    form.email,
        password: form.password,
        role:     form.role,
        id_client,
      }

      const resUser = await createUtilisateur(payload)
      const nouvelUser = resUser?.data ?? resUser
      setUtilisateurs(prev => [nouvelUser, ...prev])
      setModal(null)
      setForm(emptyForm)
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la création.'
      setErreurs([message])
    } finally {
      setSubmitting(false)
    }
  }

  const ouvrirModal = () => {
    setForm(emptyForm)
    setErreurs([])
    setModal('creer')
  }

  if (loading) return (
    <div className="utilisateurs">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Chargement…</p>
    </div>
  )

  if (erreurChargement) return (
    <div className="utilisateurs">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{erreurChargement}</p>
    </div>
  )

  return (
    <div className="utilisateurs">

      {/* Header */}
      <div className="utilisateurs-header">
        <div className="utilisateurs-filters">
          <div className="search-box">
            <i className="ti ti-search" />
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
        <button className="btn-primary" onClick={ouvrirModal}>
          <i className="ti ti-plus" /> Nouvel utilisateur
        </button>
      </div>

      {/* Stats */}
      <div className="utilisateurs-stats">
        {['admin', 'technicien', 'client'].map(role => (
          <div key={role} className="stat-card">
            <div className="stat-icon" style={{ background: ROLE_COLORS[role].bg }}>
              <i className={`ti ${role === 'admin' ? 'ti-shield' : role === 'technicien' ? 'ti-tool' : 'ti-user'}`}
                style={{ color: ROLE_COLORS[role].color }} />
            </div>
            <div>
              <p className="stat-label">{role.charAt(0).toUpperCase() + role.slice(1)}s</p>
              <p className="stat-value">{utilisateurs.filter(u => u.role === role).length}</p>
            </div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF2F2' }}>
            <i className="ti ti-user-off" style={{ color: '#EF4444' }} />
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
              <tr><td colSpan={5} className="table-empty">Aucun utilisateur trouvé</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar" style={{ background: ROLE_COLORS[u.role]?.bg, color: ROLE_COLORS[u.role]?.color }}>
                      {u.prenom?.[0]}{u.nom?.[0]}
                    </div>
                    <p className="user-nom">{u.prenom} {u.nom}</p>
                  </div>
                </td>
                <td className="user-email">{u.email}</td>
                <td>
                  <span className="badge" style={{ background: ROLE_COLORS[u.role]?.bg, color: ROLE_COLORS[u.role]?.color }}>
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
                      onClick={() => handleToggleActif(u.id, u.actif)}
                    >
                      <i className={`ti ${u.actif ? 'ti-user-off' : 'ti-user-check'}`} />
                      {u.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal création */}
      {modal === 'creer' && (
        <div className="modal-overlay" onClick={() => { setModal(null); setErreurs([]) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvel utilisateur</h2>
              <button onClick={() => { setModal(null); setErreurs([]) }}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="modal-body">

              {/* ── Informations de connexion ─────────────────── */}
              <p className="modal-section-label">Informations de connexion</p>

              <div className="form-row">
                <div className="form-group">
                  <label>Prénom <span className="required">*</span></label>
                  <input
                    type="text" placeholder="Ex: Mamadou"
                    value={form.prenom}
                    onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Nom <span className="required">*</span></label>
                  <input
                    type="text" placeholder="Ex: Diallo"
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email" placeholder="Ex: mamadou@echomaint.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Rôle</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  >
                    <option value="admin">Admin</option>
                    <option value="technicien">Technicien</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Mot de passe <span className="required">*</span></label>
                  <input
                    type="password" placeholder="Min. 6 caractères"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>

              {/* ── Informations entreprise (si rôle = client) ── */}
              {form.role === 'client' && (
                <div className="modal-section-entreprise">
                  <p className="modal-section-label">
                    <i className="ti ti-building" /> Entreprise du client
                  </p>

                  <div className="form-group">
                    <label>Nom de l'entreprise <span className="required">*</span></label>
                    <input
                      type="text" placeholder="Ex: DGS Africa"
                      value={form.entreprise_nom}
                      onChange={e => setForm(f => ({ ...f, entreprise_nom: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email de contact</label>
                    <input
                      type="email" placeholder="Ex: contact@dgsafrica.com"
                      value={form.entreprise_email_contact}
                      onChange={e => setForm(f => ({ ...f, entreprise_email_contact: e.target.value }))}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Téléphone</label>
                      <input
                        type="text" placeholder="Ex: 338001234"
                        value={form.entreprise_telephone}
                        onChange={e => setForm(f => ({ ...f, entreprise_telephone: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Adresse</label>
                      <input
                        type="text" placeholder="Ex: Route de Ngor, Dakar"
                        value={form.entreprise_adresse}
                        onChange={e => setForm(f => ({ ...f, entreprise_adresse: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => { setModal(null); setErreurs([]) }}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleCreer} disabled={submitting}>
                {submitting ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}