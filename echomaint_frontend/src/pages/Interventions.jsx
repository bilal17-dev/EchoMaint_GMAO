import { useState, useEffect } from 'react'
import './Interventions.css'

import {
  getInterventions, createIntervention, assigner, demarrer,
  cloturer, rouvrir, annuler, getRapportUrl
} from '../api/interventions.api'
import { getTechniciens } from '../api/utilisateurs.api'
import { getBatiments } from '../api/batiments.api'
import { getEquipements } from '../api/equipements.api'
import { useNavigate } from 'react-router-dom'  // ← ajouter
import './Interventions.css'
// ...


const STATUT_COLORS = {
  planifiee: { bg: '#F1F5F9', color: '#64748B', label: 'Planifiée' },
  assignee:  { bg: '#FFF7ED', color: '#F59E0B', label: 'Assignée' },
  en_cours:  { bg: '#EFF6FF', color: '#2563EB', label: 'En cours' },
  terminee:  { bg: '#F0FDF4', color: '#22C55E', label: 'Terminée' },
  annulee:   { bg: '#FEF2F2', color: '#EF4444', label: 'Annulée' },
}

const PRIORITE_COLORS = {
  basse:   { bg: '#F0FDF4', color: '#22C55E' },
  normale: { bg: '#EFF6FF', color: '#2563EB' },
  haute:   { bg: '#FFF7ED', color: '#F59E0B' },
  urgente: { bg: '#FEF2F2', color: '#EF4444' },
}

export default function Interventions() {
  const navigate = useNavigate()
  // ── Récupération de l'utilisateur connecté depuis le bon localStorage ──
  const user = JSON.parse(localStorage.getItem('echomaint_user') || '{}')
  const isAdmin = user.role === 'admin'
  const isTech  = user.role === 'technicien'

  // ── États principaux ───────────────────────────────────────────────────
  const [interventions, setInterventions] = useState([])
  const [techniciens,   setTechniciens]   = useState([])
  const [batiments,     setBatiments]     = useState([])
  const [equipements,   setEquipements]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [erreurChargement, setErreurChargement] = useState('')

  // ── Sélection & modals ─────────────────────────────────────────────────
  const [selected, setSelected] = useState(null)
  const [modal,    setModal]    = useState(null)
  const [erreurs,  setErreurs]  = useState([])

  // ── Filtres ────────────────────────────────────────────────────────────
  const [filterStatut,   setFilterStatut]   = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterPriorite, setFilterPriorite] = useState('')
  const [filterBatiment, setFilterBatiment] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  // ── Formulaires modals ─────────────────────────────────────────────────
  const [formAssigner,  setFormAssigner]  = useState({ technicien_id: '' })
  const [formCloturer,  setFormCloturer]  = useState({ commentaire_cloture: '', duree_reelle_minutes: '' })
  const [formRouvrir,   setFormRouvrir]   = useState({ motif: '' })
  const [formCreer,     setFormCreer]     = useState({
    titre: '', type: 'preventif', priorite: 'normale',
    description: '', date_planifiee: '', technicien_id: '', equipement_id: ''
  })

  // ── Chargement initial ─────────────────────────────────────────────────
  const chargerDonnees = async () => {
    setLoading(true)
    setErreurChargement('')
    try {
      const promises = [getInterventions(), getBatiments(), getEquipements()]
      // Seul l'admin a besoin de la liste des techniciens
      if (isAdmin) promises.push(getTechniciens())

      const results = await Promise.all(promises)
      const [resInterventions, resBatiments, resEquipements, resTechniciens] = results

      const normalize = (res) => Array.isArray(res) ? res : (res?.data ?? [])

      setInterventions(normalize(resInterventions))
      setBatiments(normalize(resBatiments))
      setEquipements(normalize(resEquipements))
      if (isAdmin && resTechniciens) setTechniciens(normalize(resTechniciens))
    } catch (error) {
      console.error('Erreur chargement interventions:', error)
      setErreurChargement('Impossible de charger les interventions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { chargerDonnees() }, [])

  // ── Filtrage & pagination ──────────────────────────────────────────────
  const filtered = interventions.filter(i => {
    if (filterStatut   && i.statut      !== filterStatut)   return false
    if (filterType     && i.type        !== filterType)     return false
    if (filterPriorite && i.priorite    !== filterPriorite) return false
    if (filterBatiment && i.batiment_nom !== filterBatiment) return false
    return true
  })

  const totalPages   = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated    = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const batimentsNoms = [...new Set(interventions.map(i => i.batiment_nom).filter(Boolean))]

  // ── Mise à jour locale après action ───────────────────────────────────
  const mettreAJourLocalement = (id, data) => {
    setInterventions(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
    if (selected?.id === id) setSelected(prev => ({ ...prev, ...data }))
  }

  const fermerModal = () => { setModal(null); setErreurs([]) }

  // ── Actions machine à états ────────────────────────────────────────────
  const handleAssigner = async () => {
    if (!formAssigner.technicien_id) { setErreurs(['Sélectionnez un technicien.']); return }
    try {
      const res = await assigner(selected.id, formAssigner.technicien_id)
      const data = res?.data ?? res
      mettreAJourLocalement(selected.id, data)
      // Mettre à jour le nom du technicien localement pour l'affichage
      const tech = techniciens.find(t => t.id === formAssigner.technicien_id)
      if (tech) mettreAJourLocalement(selected.id, {
        ...data,
        technicien_nom: `${tech.prenom} ${tech.nom}`,
        technicien_id: tech.id
      })
      fermerModal()
      setFormAssigner({ technicien_id: '' })
    } catch (error) {
      setErreurs([error.response?.data?.message || 'Erreur lors de l\'assignation.'])
    }
  }

  const handleDemarrer = async (id) => {
    try {
      const res = await demarrer(id)
      mettreAJourLocalement(id, res?.data ?? res)
    } catch (error) {
      window.alert(error.response?.data?.message || 'Erreur lors du démarrage.')
    }
  }

  const handleCloturer = async () => {
    const errs = []
    if (!formCloturer.commentaire_cloture || formCloturer.commentaire_cloture.length < 10)
      errs.push('Le commentaire doit contenir au moins 10 caractères.')
    if (!formCloturer.duree_reelle_minutes || Number(formCloturer.duree_reelle_minutes) <= 0)
      errs.push('La durée doit être un entier positif.')
    if (errs.length) { setErreurs(errs); return }

    try {
      const res = await cloturer(selected.id, {
        commentaire_cloture: formCloturer.commentaire_cloture,
        duree_reelle_minutes: parseInt(formCloturer.duree_reelle_minutes),
        resolu: true
      })
      mettreAJourLocalement(selected.id, res?.data ?? res)
      fermerModal()
      setFormCloturer({ commentaire_cloture: '', duree_reelle_minutes: '' })
    } catch (error) {
      setErreurs([error.response?.data?.message || 'Erreur lors de la clôture.'])
    }
  }

  const handleRouvrir = async () => {
    if (!formRouvrir.motif || formRouvrir.motif.length < 20) {
      setErreurs(['Le motif doit contenir au moins 20 caractères.']); return
    }
    try {
      const res = await rouvrir(selected.id, formRouvrir.motif)
      mettreAJourLocalement(selected.id, res?.data ?? res)
      fermerModal()
      setFormRouvrir({ motif: '' })
    } catch (error) {
      setErreurs([error.response?.data?.message || 'Erreur lors de la réouverture.'])
    }
  }

  const handleAnnuler = async () => {
    try {
      const res = await annuler(selected.id)
      mettreAJourLocalement(selected.id, res?.data ?? res)
      fermerModal()
    } catch (error) {
      window.alert(error.response?.data?.message || 'Erreur lors de l\'annulation.')
    }
  }

  const handleCreer = async () => {
    const errs = []
    if (!formCreer.titre)         errs.push('Le titre est obligatoire.')
    if (!formCreer.date_planifiee) errs.push('La date planifiée est obligatoire.')
    if (!formCreer.equipement_id) errs.push('L\'équipement est obligatoire.')
    if (errs.length) { setErreurs(errs); return }

    try {
      const res = await createIntervention(formCreer)
      const nouvelle = res?.data ?? res
      setInterventions(prev => [nouvelle, ...prev])
      fermerModal()
      setFormCreer({ titre: '', type: 'preventif', priorite: 'normale', description: '', date_planifiee: '', technicien_id: '', equipement_id: '' })
    } catch (error) {
      setErreurs([error.response?.data?.message || 'Erreur lors de la création.'])
    }
  }

  // ── Boutons d'action selon rôle + statut ──────────────────────────────
  const renderActions = (ot) => {
    const isAssignedTech = user.id === ot.technicien_id

    return (
      <div className="ot-actions">
        {ot.statut === 'planifiee' && isAdmin && (
          <button className="btn-action btn-blue" onClick={() => { setSelected(ot); setModal('assigner') }}>
            <i className="ti ti-user-plus" /> Assigner
          </button>
        )}
        {ot.statut === 'assignee' && (isAdmin || (isTech && isAssignedTech)) && (
          <button className="btn-action btn-orange" onClick={() => handleDemarrer(ot.id)}>
            <i className="ti ti-player-play" /> Démarrer
          </button>
        )}
        {ot.statut === 'en_cours' && (isAdmin || (isTech && isAssignedTech)) && (
          <button className="btn-action btn-green" onClick={() => { setSelected(ot); setModal('cloturer') }}>
            <i className="ti ti-check" /> Clôturer
          </button>
        )}
        {ot.statut === 'terminee' && isAdmin && (
          <button className="btn-action btn-purple" onClick={() => { setSelected(ot); setModal('rouvrir') }}>
            <i className="ti ti-refresh" /> Rouvrir
          </button>
        )}
        {['planifiee', 'assignee'].includes(ot.statut) && isAdmin && (
          <button className="btn-action btn-red" onClick={() => { setSelected(ot); setModal('annuler') }}>
            <i className="ti ti-x" /> Annuler
          </button>
        )}
        <button className="btn-action btn-ghost" onClick={() => navigate(`/interventions/${ot.id}`)}>
          <i className="ti ti-eye" /> Détail
        </button>
        
        
      </div>
    )
  }

  // ── Rendu ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="interventions">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Chargement...</p>
    </div>
  )

  if (erreurChargement) return (
    <div className="interventions">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{erreurChargement}</p>
    </div>
  )

  return (
    <div className="interventions">

      {/* ── Barre de filtres + bouton créer ── */}
      <div className="interventions-header">
        <div className="interventions-filters">
          <select value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1) }}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_COLORS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">Tous les types</option>
            <option value="preventif">Préventif</option>
            <option value="curatif">Curatif</option>
          </select>
          <select value={filterPriorite} onChange={e => { setFilterPriorite(e.target.value); setPage(1) }}>
            <option value="">Toutes priorités</option>
            <option value="basse">Basse</option>
            <option value="normale">Normale</option>
            <option value="haute">Haute</option>
            <option value="urgente">Urgente</option>
          </select>
          <select value={filterBatiment} onChange={e => { setFilterBatiment(e.target.value); setPage(1) }}>
            <option value="">Tous les bâtiments</option>
            {batimentsNoms.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => { setModal('creer'); setErreurs([]) }}>
            <i className="ti ti-plus" /> Nouvel OT
          </button>
        )}
      </div>

      {/* ── Layout liste + détail ── */}
      <div className="interventions-layout">

        {/* Liste */}
        <div className="interventions-list">
          {paginated.length === 0 ? (
            <div className="empty">
              <i className="ti ti-clipboard-off" />
              <p>Aucune intervention trouvée</p>
            </div>
          ) : paginated.map(ot => (
            <div
              key={ot.id}
              className={`ot-card ${selected?.id === ot.id ? 'ot-card-active' : ''}`}
              onClick={() => setSelected(ot)}
            >
              <div className="ot-card-top">
                <span className="ot-type">{ot.type === 'preventif' ? '🔧 Préventif' : '🚨 Curatif'}</span>
                <span className="badge" style={{ background: STATUT_COLORS[ot.statut]?.bg, color: STATUT_COLORS[ot.statut]?.color }}>
                  {STATUT_COLORS[ot.statut]?.label}
                </span>
              </div>
              <p className="ot-titre">{ot.titre}</p>
              <p className="ot-meta">
                <i className="ti ti-building" /> {ot.batiment_nom} &nbsp;·&nbsp;
                <i className="ti ti-cpu" /> {ot.equipement_reference}
              </p>
              <div className="ot-card-bottom">
                <span className="badge-priorite" style={{ background: PRIORITE_COLORS[ot.priorite]?.bg, color: PRIORITE_COLORS[ot.priorite]?.color }}>
                  {ot.priorite}
                </span>
                {ot.technicien_nom ? (
                  <span className="ot-tech"><i className="ti ti-user" /> {ot.technicien_nom}</span>
                ) : (
                  <span className="ot-tech-empty">Non assigné</span>
                )}
              </div>
              {renderActions(ot)}
            </div>
          ))}

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="ti ti-chevron-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <i className="ti ti-chevron-right" />
              </button>
            </div>
          )}
        </div>

        {/* Détail */}
        {selected && (
          <div className="ot-detail">
            <div className="ot-detail-header">
              <h2>{selected.titre}</h2>
              <button className="btn-close" onClick={() => setSelected(null)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="detail-section">
              <h3><i className="ti ti-info-circle" /> Informations</h3>
              <div className="detail-grid">
                <div><span>Type</span><p>{selected.type}</p></div>
                <div>
                  <span>Priorité</span>
                  <p>
                    <span className="badge" style={{ background: PRIORITE_COLORS[selected.priorite]?.bg, color: PRIORITE_COLORS[selected.priorite]?.color }}>
                      {selected.priorite}
                    </span>
                  </p>
                </div>
                <div>
                  <span>Statut</span>
                  <p>
                    <span className="badge" style={{ background: STATUT_COLORS[selected.statut]?.bg, color: STATUT_COLORS[selected.statut]?.color }}>
                      {STATUT_COLORS[selected.statut]?.label}
                    </span>
                  </p>
                </div>
                <div><span>Date planifiée</span><p>{selected.date_planifiee ? new Date(selected.date_planifiee).toLocaleDateString('fr-FR') : '—'}</p></div>
                <div><span>Début réel</span><p>{selected.date_debut_reelle ? new Date(selected.date_debut_reelle).toLocaleString('fr-FR') : '—'}</p></div>
                <div><span>Fin réelle</span><p>{selected.date_fin_reelle ? new Date(selected.date_fin_reelle).toLocaleString('fr-FR') : '—'}</p></div>
                {selected.duree_reelle_minutes && (
                  <div><span>Durée réelle</span><p>{selected.duree_reelle_minutes} min</p></div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h3><i className="ti ti-building" /> Équipement & Bâtiment</h3>
              <div className="detail-grid">
                <div><span>Équipement</span><p>{selected.equipement_nom}</p></div>
                <div><span>Référence</span><p>{selected.equipement_reference}</p></div>
                <div><span>Bâtiment</span><p>{selected.batiment_nom}</p></div>
              </div>
            </div>

            <div className="detail-section">
              <h3><i className="ti ti-user" /> Technicien</h3>
              <p>{selected.technicien_nom || <span style={{ color: '#94a3b8' }}>Non assigné</span>}</p>
            </div>

            {selected.description && (
              <div className="detail-section">
                <h3><i className="ti ti-file-text" /> Description</h3>
                <p>{selected.description}</p>
              </div>
            )}

            {selected.commentaire_cloture && (
              <div className="detail-section">
                <h3><i className="ti ti-message" /> Commentaire de clôture</h3>
                <p>{selected.commentaire_cloture}</p>
              </div>
            )}

            {selected.reouvertures?.length > 0 && (
              <div className="detail-section">
                <h3><i className="ti ti-history" /> Réouvertures ({selected.reouvertures.length})</h3>
                <table className="mini-table">
                  <thead>
                    <tr><th>Date</th><th>Auteur</th><th>Statut précédent</th><th>Motif</th></tr>
                  </thead>
                  <tbody>
                    {selected.reouvertures.map(r => (
                      <tr key={r.id}>
                        <td>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                        <td>{r.auteur || r.user?.nom}</td>
                        <td>
                          <span className="badge" style={{ background: STATUT_COLORS[r.statut_precedent]?.bg, color: STATUT_COLORS[r.statut_precedent]?.color }}>
                            {r.statut_precedent}
                          </span>
                        </td>
                        <td>{r.motif}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selected.statut === 'terminee' && selected.rapport_pdf_chemin && (
              <div className="detail-section">
                <a href={getRapportUrl(selected.id)} target="_blank" rel="noreferrer" className="btn-rapport">
                  <i className="ti ti-file-type-pdf" /> Télécharger le rapport PDF
                </a>
              </div>
            )}

            <div className="detail-actions">
              {renderActions(selected)}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal && (
        <div className="modal-overlay" onClick={fermerModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            {/* Modal : Assigner */}
            {modal === 'assigner' && (
              <>
                <div className="modal-header">
                  <h2>Assigner un technicien</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Technicien</label>
                    <select value={formAssigner.technicien_id} onChange={e => setFormAssigner({ technicien_id: e.target.value })}>
                      <option value="">Sélectionner un technicien</option>
                      {techniciens.map(t => (
                        <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
                      ))}
                    </select>
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>Annuler</button>
                  <button className="btn-primary" onClick={handleAssigner}>Assigner</button>
                </div>
              </>
            )}

            {/* Modal : Clôturer */}
            {modal === 'cloturer' && (
              <>
                <div className="modal-header">
                  <h2>Clôturer l'intervention</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Commentaire de clôture <span className="required">*</span></label>
                    <textarea
                      placeholder="Minimum 10 caractères..."
                      value={formCloturer.commentaire_cloture}
                      onChange={e => setFormCloturer(f => ({ ...f, commentaire_cloture: e.target.value }))}
                      rows={3}
                    />
                    <span className="char-count">{formCloturer.commentaire_cloture.length} / 10 min</span>
                  </div>
                  <div className="form-group">
                    <label>Durée réelle (minutes) <span className="required">*</span></label>
                    <input
                      type="number" min="1" placeholder="Ex: 90"
                      value={formCloturer.duree_reelle_minutes}
                      onChange={e => setFormCloturer(f => ({ ...f, duree_reelle_minutes: e.target.value }))}
                    />
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>Annuler</button>
                  <button className="btn-primary" onClick={handleCloturer}>Clôturer</button>
                </div>
              </>
            )}

            {/* Modal : Rouvrir */}
            {modal === 'rouvrir' && (
              <>
                <div className="modal-header">
                  <h2>Rouvrir l'intervention</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="warning-box">
                    <i className="ti ti-alert-triangle" />
                    <p>La réouverture invalidera le rapport PDF existant et repassera l'intervention en statut "En cours".</p>
                  </div>
                  <div className="form-group">
                    <label>Motif de réouverture <span className="required">*</span></label>
                    <textarea
                      placeholder="Minimum 20 caractères..."
                      value={formRouvrir.motif}
                      onChange={e => setFormRouvrir({ motif: e.target.value })}
                      rows={3}
                    />
                    <span className="char-count">{formRouvrir.motif.length} / 20 min</span>
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>Annuler</button>
                  <button className="btn-primary btn-danger-confirm" onClick={handleRouvrir}>Rouvrir</button>
                </div>
              </>
            )}

            {/* Modal : Annuler */}
            {modal === 'annuler' && (
              <>
                <div className="modal-header">
                  <h2>Annuler l'intervention</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <p>Êtes-vous sûr de vouloir annuler <strong>"{selected?.titre}"</strong> ? Cette action est irréversible.</p>
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>Non, garder</button>
                  <button className="btn-primary btn-danger-confirm" onClick={handleAnnuler}>Oui, annuler</button>
                </div>
              </>
            )}

            {/* Modal : Créer OT */}
            {modal === 'creer' && (
              <>
                <div className="modal-header">
                  <h2>Nouvel ordre de travail</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Titre <span className="required">*</span></label>
                    <input
                      type="text" placeholder="Ex: Révision climatisation"
                      value={formCreer.titre}
                      onChange={e => setFormCreer(f => ({ ...f, titre: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Équipement <span className="required">*</span></label>
                    <select value={formCreer.equipement_id} onChange={e => setFormCreer(f => ({ ...f, equipement_id: e.target.value }))}>
                      <option value="">Sélectionner un équipement</option>
                      {equipements.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.nom} ({eq.reference}) — {eq.batiment_nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Type</label>
                      <select value={formCreer.type} onChange={e => setFormCreer(f => ({ ...f, type: e.target.value }))}>
                        <option value="preventif">Préventif</option>
                        <option value="curatif">Curatif</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Priorité</label>
                      <select value={formCreer.priorite} onChange={e => setFormCreer(f => ({ ...f, priorite: e.target.value }))}>
                        <option value="basse">Basse</option>
                        <option value="normale">Normale</option>
                        <option value="haute">Haute</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      placeholder="Description de l'intervention..."
                      value={formCreer.description}
                      onChange={e => setFormCreer(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date planifiée <span className="required">*</span></label>
                      <input
                        type="datetime-local"
                        value={formCreer.date_planifiee}
                        onChange={e => setFormCreer(f => ({ ...f, date_planifiee: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Technicien (optionnel)</label>
                      <select value={formCreer.technicien_id} onChange={e => setFormCreer(f => ({ ...f, technicien_id: e.target.value }))}>
                        <option value="">Non assigné</option>
                        {techniciens.map(t => (
                          <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {formCreer.type === 'curatif' && (
                    <div className="info-box">
                      <i className="ti ti-info-circle" />
                      <p>En mode curatif, l'équipement passera automatiquement au statut "en panne".</p>
                    </div>
                  )}
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>Annuler</button>
                  <button className="btn-primary" onClick={handleCreer}>Créer l'OT</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  )
}