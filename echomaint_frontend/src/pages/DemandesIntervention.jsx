import { useState, useEffect } from 'react'
import './DemandesIntervention.css'
import { getDemandes, convertirDemande, creerDemande, rejeterDemande } from '../api/demandes.api'
import { getEquipements } from '../api/equipements.api'

const PRIORITES = {
  basse:   { label: 'Basse',   className: 'prio-basse' },
  normale: { label: 'Normale', className: 'prio-normale' },
  haute:   { label: 'Haute',   className: 'prio-haute' },
  urgente: { label: 'Urgente', className: 'prio-urgente' },
}

const STATUTS = {
  ouverte: { label: 'Ouverte',  className: 'statut-ouverte' },
  traitee: { label: 'Traitée',  className: 'statut-traitee' },
  rejetee: { label: 'Rejetée',  className: 'statut-rejetee' },
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function getUserConnecte() {
  try {
    const raw = localStorage.getItem('echomaint_user')  // ✅ était 'user'
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const emptyForm = { equipement_id: '', titre: '', description: '', priorite: 'normale' }

export default function DemandesIntervention() {
  const userConnecte = getUserConnecte()
  const role = userConnecte?.role || 'client'

  const [demandes, setDemandes]         = useState([])
  const [equipements, setEquipements]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [erreur, setErreur]             = useState('')
  const [search, setSearch]             = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  // Modal création (client)
  const [modalCreer, setModalCreer]     = useState(false)
  const [form, setForm]                 = useState(emptyForm)
  const [formErreurs, setFormErreurs]   = useState([])
  const [submitting, setSubmitting]     = useState(false)

  // Modal rejet (admin)
  const [modalRejet, setModalRejet]     = useState(null)
  const [motifRejet, setMotifRejet]     = useState('')
  const [rejetErreur, setRejetErreur]   = useState('')

  

  const chargerDemandes = async () => {
    setLoading(true)
    setErreur('')
    try {
      const res = await getDemandes()
      setDemandes(res.data || [])
    } catch {
      setErreur('Impossible de charger les demandes d\'intervention.')
    } finally {
      setLoading(false)
    }
  }

  const chargerEquipements = async () => {
    try {
      const res = await getEquipements()
      setEquipements(res.data || [])
    } catch {
      console.error('Impossible de charger les équipements.')
    }
  }

  useEffect(() => {
    chargerDemandes()
    if (role === 'client') chargerEquipements()
  }, [])

  const filtered = demandes.filter(d => {
    const matchSearch =
      d.titre.toLowerCase().includes(search.toLowerCase()) ||
      (d.equipement_nom || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.client_nom || '').toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut ? d.statut === filterStatut : true
    return matchSearch && matchStatut
  })

  // ── Actions CLIENT ────────────────────────────────────────────────────────

  const handleSoumettre = async () => {
    const errs = []
    if (!form.equipement_id)      errs.push('Veuillez sélectionner un équipement.')
    if (!form.titre.trim())       errs.push('Le titre est obligatoire.')
    if (!form.description.trim()) errs.push('La description est obligatoire.')
    if (errs.length) { setFormErreurs(errs); return }

    setSubmitting(true)
    setFormErreurs([])
    try {
      const res = await creerDemande(form)
      setDemandes(prev => [res.data, ...prev])
      setModalCreer(false)
      setForm(emptyForm)
    } catch (error) {
      setFormErreurs([error.response?.data?.message || 'Erreur lors de la soumission.'])
    } finally {
      setSubmitting(false)
    }
  }

  // ── Actions ADMIN ─────────────────────────────────────────────────────────

  const handleConvertir = async (id) => {
    if (!window.confirm('Convertir cette demande en intervention curative ?')) return
    try {
      await convertirDemande(id)
      setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut: 'traitee' } : d))
    } catch (error) {
      window.alert(error.response?.data?.message || 'Erreur lors de la conversion.')
    }
  }

  const ouvrirModalRejet = (id) => {
    setModalRejet(id)
    setMotifRejet('')
    setRejetErreur('')
  }

  const handleRejeter = async () => {
    if (motifRejet.trim().length < 10) {
      setRejetErreur('Le motif doit faire au moins 10 caractères.')
      return
    }
    try {
      await rejeterDemande(modalRejet, motifRejet.trim())
      setDemandes(prev => prev.map(d => d.id === modalRejet ? { ...d, statut: 'rejetee' } : d))
      setModalRejet(null)
    } catch (error) {
      setRejetErreur(error.response?.data?.message || 'Erreur lors du rejet.')
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="demandes">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Chargement…</p>
    </div>
  )

  if (erreur) return (
    <div className="demandes">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{erreur}</p>
    </div>
  )

  return (
    <div className="demandes">

      {/* Header */}
      <div className="demandes-header">
        <div className="demandes-filters">
          <div className="search-box">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="Rechercher (titre, équipement, client)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="ouverte">Ouvertes</option>
            <option value="traitee">Traitées</option>
            <option value="rejetee">Rejetées</option>
          </select>
        </div>

        {role === 'client' && (
          <button className="btn-primary" onClick={() => setModalCreer(true)}>
            <i className="ti ti-plus" /> Nouvelle demande
          </button>
        )}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="demandes-empty">
          <i className="ti ti-clipboard-off" />
          <p>Aucune demande trouvée</p>
        </div>
      ) : (
        <div className="demandes-list">
          {filtered.map(d => {
            const prioInfo   = PRIORITES[d.priorite] || PRIORITES.normale
            const statutInfo = STATUTS[d.statut]     || STATUTS.ouverte
            return (
              <div key={d.id} className="demande-card">
                <div className="demande-card-top">
                  <div className="demande-card-titles">
                    <p className="demande-titre">{d.titre}</p>
                    <p className="demande-meta">
                      <i className="ti ti-settings" /> {d.equipement_nom}
                      {role === 'admin' && (
                        <> · <i className="ti ti-building" /> {d.client_nom}</>
                      )}
                    </p>
                  </div>
                  <div className="demande-badges">
                    <span className={`prio-badge ${prioInfo.className}`}>{prioInfo.label}</span>
                    <span className={`statut-badge-di ${statutInfo.className}`}>{statutInfo.label}</span>
                  </div>
                </div>

                <p className="demande-description">{d.description}</p>

                <div className="demande-footer">
                  <span className="demande-date">{formatDateTime(d.created_at)}</span>

                  {role === 'admin' && d.statut === 'ouverte' && (
                    <div className="demande-actions">
                      <button className="btn-cancel" onClick={() => ouvrirModalRejet(d.id)}>
                        <i className="ti ti-x" /> Rejeter
                      </button>
                      <button className="btn-primary" onClick={() => handleConvertir(d.id)}>
                        <i className="ti ti-transform" /> Convertir en intervention
                      </button>
                    </div>
                  )}

                  {role === 'client' && d.statut === 'traitee' && (
                    <span className="demande-ot-link">
                      <i className="ti ti-check" /> Prise en charge
                    </span>
                  )}
                  {role === 'client' && d.statut === 'rejetee' && (
                    <span className="demande-ot-link" style={{ color: '#ef4444' }}>
                      <i className="ti ti-x" /> Demande rejetée
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal création DI — CLIENT */}
      {modalCreer && (
        <div className="modal-overlay" onClick={() => setModalCreer(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle demande d'intervention</h2>
              <button onClick={() => setModalCreer(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Équipement concerné <span className="required">*</span></label>
                <select
                  value={form.equipement_id}
                  onChange={e => setForm(f => ({ ...f, equipement_id: e.target.value }))}
                >
                  <option value="">— Sélectionner —</option>
                  {equipements.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nom} — {eq.batiment_nom}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Titre <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Ex: Climatiseur en panne salle A"
                  value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Description <span className="required">*</span></label>
                <textarea
                  placeholder="Décrivez le problème constaté..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Priorité</label>
                <select
                  value={form.priorite}
                  onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))}
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              {formErreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModalCreer(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleSoumettre} disabled={submitting}>
                {submitting ? 'Envoi…' : 'Soumettre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rejet — ADMIN */}
      {modalRejet && (
        <div className="modal-overlay" onClick={() => setModalRejet(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rejeter la demande</h2>
              <button onClick={() => setModalRejet(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Motif du rejet <span className="required">*</span></label>
                <textarea
                  placeholder="Expliquez pourquoi cette demande est rejetée (min. 10 caractères)..."
                  value={motifRejet}
                  onChange={e => setMotifRejet(e.target.value)}
                  rows={4}
                />
              </div>
              {rejetErreur && <p className="erreur">{rejetErreur}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModalRejet(null)}>Annuler</button>
              <button className="btn-primary" onClick={handleRejeter}>Confirmer le rejet</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}