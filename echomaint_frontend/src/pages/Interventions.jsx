import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Interventions.css'

// ─── MOCKS ───────────────────────────────────────────────────────────────────
const mockTechniciens = [
  { id: 't1', nom: 'Diallo', prenom: 'Mamadou' },
  { id: 't2', nom: 'Sow', prenom: 'Aminata' },
]

const mockInterventions = [
  {
    id: 'ot1',
    titre: 'Révision climatisation centrale',
    type: 'preventif',
    priorite: 'normale',
    statut: 'planifiee',
    date_planifiee: '2026-06-20T09:00:00',
    date_debut_reelle: null,
    date_fin_reelle: null,
    duree_reelle_minutes: null,
    commentaire_cloture: null,
    rapport_pdf_chemin: null,
    equipement_nom: 'Climatisation centrale',
    equipement_reference: 'CLIM-001',
    batiment_nom: 'Siège DGS Africa',
    technicien_id: null,
    technicien_nom: null,
    commentaires: [],
    reouvertures: [],
  },
  {
    id: 'ot2',
    titre: 'Remplacement filtre groupe électrogène',
    type: 'preventif',
    priorite: 'basse',
    statut: 'assignee',
    date_planifiee: '2026-06-18T08:00:00',
    date_debut_reelle: null,
    date_fin_reelle: null,
    duree_reelle_minutes: null,
    commentaire_cloture: null,
    rapport_pdf_chemin: null,
    equipement_nom: 'Groupe électrogène',
    equipement_reference: 'GE-001',
    batiment_nom: 'Entrepôt Mbao',
    technicien_id: 't1',
    technicien_nom: 'Mamadou Diallo',
    commentaires: [
      { id: 'c1', contenu: 'Pièces commandées', auteur: 'Mamadou Diallo', created_at: '2026-06-17T10:00:00' }
    ],
    reouvertures: [],
  },
  {
    id: 'ot3',
    titre: 'Panne ascenseur bâtiment B',
    type: 'curatif',
    priorite: 'urgente',
    statut: 'en_cours',
    date_planifiee: '2026-06-17T14:00:00',
    date_debut_reelle: '2026-06-17T14:30:00',
    date_fin_reelle: null,
    duree_reelle_minutes: null,
    commentaire_cloture: null,
    rapport_pdf_chemin: null,
    equipement_nom: 'Ascenseur',
    equipement_reference: 'ASC-002',
    batiment_nom: 'Tour Almadies',
    technicien_id: 't2',
    technicien_nom: 'Aminata Sow',
    commentaires: [
      { id: 'c2', contenu: 'Câble de traction défectueux', auteur: 'Aminata Sow', created_at: '2026-06-17T15:00:00' }
    ],
    reouvertures: [],
  },
  {
    id: 'ot4',
    titre: 'Maintenance pompe à eau',
    type: 'preventif',
    priorite: 'normale',
    statut: 'terminee',
    date_planifiee: '2026-06-10T09:00:00',
    date_debut_reelle: '2026-06-10T09:15:00',
    date_fin_reelle: '2026-06-10T11:30:00',
    duree_reelle_minutes: 135,
    commentaire_cloture: 'Maintenance effectuée, pompe opérationnelle.',
    rapport_pdf_chemin: '/storage/rapports/rapport_ot4.pdf',
    equipement_nom: 'Pompe à eau',
    equipement_reference: 'POMPE-001',
    batiment_nom: 'Siège DGS Africa',
    technicien_id: 't1',
    technicien_nom: 'Mamadou Diallo',
    commentaires: [],
    reouvertures: [
      {
        id: 'r1',
        motif: 'Fuite détectée après clôture, intervention incomplète.',
        auteur: 'Super Admin',
        statut_precedent: 'terminee',
        created_at: '2026-06-11T08:00:00'
      }
    ],
  },
  {
    id: 'ot5',
    titre: 'Remplacement batterie onduleur',
    type: 'curatif',
    priorite: 'haute',
    statut: 'annulee',
    date_planifiee: '2026-06-15T10:00:00',
    date_debut_reelle: null,
    date_fin_reelle: null,
    duree_reelle_minutes: null,
    commentaire_cloture: null,
    rapport_pdf_chemin: null,
    equipement_nom: 'Onduleur salle serveur',
    equipement_reference: 'UPS-001',
    batiment_nom: 'Siège DGS Africa',
    technicien_id: null,
    technicien_nom: null,
    commentaires: [],
    reouvertures: [],
  },
]

// ─── COULEURS ─────────────────────────────────────────────────────────────────
const STATUT_COLORS = {
  planifiee: { bg: '#F1F5F9', color: '#64748B', label: 'Planifiée' },
  assignee:  { bg: '#FFF7ED', color: '#F59E0B', label: 'Assignée' },
  en_cours:  { bg: '#EFF6FF', color: '#2563EB', label: 'En cours' },
  terminee:  { bg: '#F0FDF4', color: '#22C55E', label: 'Terminée' },
  annulee:   { bg: '#FEF2F2', color: '#EF4444', label: 'Annulée' },
}

const PRIORITE_COLORS = {
  basse:    { bg: '#F0FDF4', color: '#22C55E' },
  normale:  { bg: '#EFF6FF', color: '#2563EB' },
  haute:    { bg: '#FFF7ED', color: '#F59E0B' },
  urgente:  { bg: '#FEF2F2', color: '#EF4444' },
}

// Mock user — à remplacer par useAuth() plus tard
const mockUser = { role: 'admin', id: 'admin1' }

export default function Interventions() {
  const navigate = useNavigate()
  const [interventions, setInterventions] = useState(mockInterventions)
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null) // 'assigner' | 'cloturer' | 'rouvrir' | 'annuler' | 'creer'
  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterPriorite, setFilterPriorite] = useState('')
  const [filterBatiment, setFilterBatiment] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  // Formulaires modales
  const [formAssigner, setFormAssigner] = useState({ technicien_id: '' })
  const [formCloturer, setFormCloturer] = useState({ commentaire_cloture: '', duree_reelle_minutes: '' })
  const [formRouvrir, setFormRouvrir] = useState({ motif: '' })
  const [formCreer, setFormCreer] = useState({
    titre: '', type: 'preventif', priorite: 'normale',
    description: '', date_planifiee: '', technicien_id: ''
  })
  const [erreurs, setErreurs] = useState([])

  // ─── FILTRES ───────────────────────────────────────────────────────────────
  const batiments = [...new Set(mockInterventions.map(i => i.batiment_nom))]

  const filtered = interventions.filter(i => {
    if (filterStatut && i.statut !== filterStatut) return false
    if (filterType && i.type !== filterType) return false
    if (filterPriorite && i.priorite !== filterPriorite) return false
    if (filterBatiment && i.batiment_nom !== filterBatiment) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // ─── ACTIONS ───────────────────────────────────────────────────────────────
  const updateIntervention = (id, data) => {
    setInterventions(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
    if (selected?.id === id) setSelected(prev => ({ ...prev, ...data }))
  }

  const handleAssigner = () => {
    if (!formAssigner.technicien_id) { setErreurs(['Sélectionnez un technicien.']); return }
    const tech = mockTechniciens.find(t => t.id === formAssigner.technicien_id)
    updateIntervention(selected.id, {
      statut: 'assignee',
      technicien_id: tech.id,
      technicien_nom: `${tech.prenom} ${tech.nom}`
    })
    setModal(null); setErreurs([])
  }

  const handleDemarrer = (id) => {
    updateIntervention(id, { statut: 'en_cours', date_debut_reelle: new Date().toISOString() })
  }

  const handleCloturer = () => {
    const errs = []
    if (!formCloturer.commentaire_cloture || formCloturer.commentaire_cloture.length < 10)
      errs.push('Le commentaire doit contenir au moins 10 caractères.')
    if (!formCloturer.duree_reelle_minutes || Number(formCloturer.duree_reelle_minutes) <= 0)
      errs.push('La durée doit être un entier positif.')
    if (errs.length) { setErreurs(errs); return }

    updateIntervention(selected.id, {
      statut: 'terminee',
      date_fin_reelle: new Date().toISOString(),
      commentaire_cloture: formCloturer.commentaire_cloture,
      duree_reelle_minutes: parseInt(formCloturer.duree_reelle_minutes),
      rapport_pdf_chemin: `/storage/rapports/rapport_${selected.id}.pdf`
    })
    setModal(null); setFormCloturer({ commentaire_cloture: '', duree_reelle_minutes: '' }); setErreurs([])
  }

  const handleRouvrir = () => {
    const errs = []
    if (!formRouvrir.motif || formRouvrir.motif.length < 20)
      errs.push('Le motif doit contenir au moins 20 caractères.')
    if (errs.length) { setErreurs(errs); return }

    const reouverture = {
      id: `r${Date.now()}`,
      motif: formRouvrir.motif,
      auteur: 'Super Admin',
      statut_precedent: 'terminee',
      created_at: new Date().toISOString()
    }
    updateIntervention(selected.id, {
      statut: 'en_cours',
      rapport_pdf_chemin: null,
      date_fin_reelle: null,
      commentaire_cloture: null,
      duree_reelle_minutes: null,
      reouvertures: [...(selected.reouvertures || []), reouverture]
    })
    setModal(null); setFormRouvrir({ motif: '' }); setErreurs([])
  }

  const handleAnnuler = () => {
    updateIntervention(selected.id, { statut: 'annulee' })
    setModal(null)
  }

  const handleCreer = () => {
    const errs = []
    if (!formCreer.titre) errs.push('Le titre est obligatoire.')
    if (!formCreer.date_planifiee) errs.push('La date planifiée est obligatoire.')
    if (errs.length) { setErreurs(errs); return }

    const nouvel = {
      id: `ot${Date.now()}`,
      ...formCreer,
      statut: 'planifiee',
      date_debut_reelle: null, date_fin_reelle: null,
      duree_reelle_minutes: null, commentaire_cloture: null,
      rapport_pdf_chemin: null,
      equipement_nom: 'Équipement mock', equipement_reference: 'EQ-XXX',
      batiment_nom: 'Bâtiment mock',
      technicien_nom: formCreer.technicien_id
        ? mockTechniciens.find(t => t.id === formCreer.technicien_id)?.prenom + ' ' +
          mockTechniciens.find(t => t.id === formCreer.technicien_id)?.nom
        : null,
      commentaires: [], reouvertures: []
    }
    setInterventions(prev => [nouvel, ...prev])
    setModal(null)
    setFormCreer({ titre: '', type: 'preventif', priorite: 'normale', description: '', date_planifiee: '', technicien_id: '' })
    setErreurs([])
  }

  // ─── BOUTONS CONTEXTUELS ──────────────────────────────────────────────────
  const renderActions = (ot) => {
    const isAssignedTech = mockUser.id === ot.technicien_id
    const isAdmin = mockUser.role === 'admin'
    const isTech = mockUser.role === 'technicien'

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
        <button className="btn-action btn-ghost" onClick={() => setSelected(ot)}>
          <i className="ti ti-eye" /> Détail
        </button>
      </div>
    )
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="interventions">

      {/* Header */}
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
            {batiments.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {mockUser.role === 'admin' && (
          <button className="btn-primary" onClick={() => setModal('creer')}>
            <i className="ti ti-plus" /> Nouvel OT
          </button>
        )}
      </div>

      {/* Vue liste + détail côte à côte */}
      <div className="interventions-layout">

        {/* Liste */}
        <div className="interventions-list">
          {paginated.length === 0 ? (
            <div className="empty"><i className="ti ti-clipboard-off" /><p>Aucune intervention trouvée</p></div>
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
                {ot.technicien_nom && (
                  <span className="ot-tech"><i className="ti ti-user" /> {ot.technicien_nom}</span>
                )}
              </div>
              {renderActions(ot)}
            </div>
          ))}

          {/* Pagination */}
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

        {/* Fiche détail */}
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
                <div><span>Priorité</span>
                  <p><span className="badge" style={{ background: PRIORITE_COLORS[selected.priorite]?.bg, color: PRIORITE_COLORS[selected.priorite]?.color }}>{selected.priorite}</span></p>
                </div>
                <div><span>Statut</span>
                  <p><span className="badge" style={{ background: STATUT_COLORS[selected.statut]?.bg, color: STATUT_COLORS[selected.statut]?.color }}>{STATUT_COLORS[selected.statut]?.label}</span></p>
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

            {selected.commentaire_cloture && (
              <div className="detail-section">
                <h3><i className="ti ti-message" /> Commentaire de clôture</h3>
                <p>{selected.commentaire_cloture}</p>
              </div>
            )}

            {selected.commentaires?.length > 0 && (
              <div className="detail-section">
                <h3><i className="ti ti-messages" /> Commentaires ({selected.commentaires.length})</h3>
                {selected.commentaires.map(c => (
                  <div key={c.id} className="commentaire">
                    <div className="commentaire-header">
                      <strong>{c.auteur}</strong>
                      <span>{new Date(c.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <p>{c.contenu}</p>
                  </div>
                ))}
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
                        <td>{r.auteur}</td>
                        <td><span className="badge" style={{ background: STATUT_COLORS[r.statut_precedent]?.bg, color: STATUT_COLORS[r.statut_precedent]?.color }}>{r.statut_precedent}</span></td>
                        <td>{r.motif}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selected.statut === 'terminee' && selected.rapport_pdf_chemin && (
              <div className="detail-section">
                <a href={selected.rapport_pdf_chemin} target="_blank" rel="noreferrer" className="btn-rapport">
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

      {/* ─── MODALES ──────────────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={() => { setModal(null); setErreurs([]) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            {/* ASSIGNER */}
            {modal === 'assigner' && (
              <>
                <div className="modal-header">
                  <h2>Assigner un technicien</h2>
                  <button onClick={() => setModal(null)}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Technicien</label>
                    <select value={formAssigner.technicien_id} onChange={e => setFormAssigner({ technicien_id: e.target.value })}>
                      <option value="">Sélectionner un technicien</option>
                      {mockTechniciens.map(t => (
                        <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
                      ))}
                    </select>
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={() => setModal(null)}>Annuler</button>
                  <button className="btn-primary" onClick={handleAssigner}>Assigner</button>
                </div>
              </>
            )}

            {/* CLOTURER */}
            {modal === 'cloturer' && (
              <>
                <div className="modal-header">
                  <h2>Clôturer l'intervention</h2>
                  <button onClick={() => setModal(null)}><i className="ti ti-x" /></button>
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
                      type="number"
                      min="1"
                      placeholder="Ex: 90"
                      value={formCloturer.duree_reelle_minutes}
                      onChange={e => setFormCloturer(f => ({ ...f, duree_reelle_minutes: e.target.value }))}
                    />
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={() => setModal(null)}>Annuler</button>
                  <button className="btn-primary" onClick={handleCloturer}>Clôturer</button>
                </div>
              </>
            )}

            {/* ROUVRIR */}
            {modal === 'rouvrir' && (
              <>
                <div className="modal-header">
                  <h2>Rouvrir l'intervention</h2>
                  <button onClick={() => setModal(null)}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="warning-box">
                    <i className="ti ti-alert-triangle" />
                    <p>Attention — La réouverture invalidera le rapport PDF existant et repassera l'intervention en statut "en cours".</p>
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
                  <button className="btn-cancel" onClick={() => setModal(null)}>Annuler</button>
                  <button className="btn-primary btn-danger-confirm" onClick={handleRouvrir}>Rouvrir</button>
                </div>
              </>
            )}

            {/* ANNULER */}
            {modal === 'annuler' && (
              <>
                <div className="modal-header">
                  <h2>Annuler l'intervention</h2>
                  <button onClick={() => setModal(null)}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <p>Êtes-vous sûr de vouloir annuler <strong>"{selected?.titre}"</strong> ? Cette action est irréversible.</p>
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={() => setModal(null)}>Non, garder</button>
                  <button className="btn-primary btn-danger-confirm" onClick={handleAnnuler}>Oui, annuler</button>
                </div>
              </>
            )}

            {/* CRÉER */}
            {modal === 'creer' && (
              <>
                <div className="modal-header">
                  <h2>Nouvel ordre de travail</h2>
                  <button onClick={() => setModal(null)}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Titre <span className="required">*</span></label>
                    <input type="text" placeholder="Ex: Révision climatisation" value={formCreer.titre} onChange={e => setFormCreer(f => ({ ...f, titre: e.target.value }))} />
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
                    <textarea placeholder="Description de l'intervention..." value={formCreer.description} onChange={e => setFormCreer(f => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date planifiée <span className="required">*</span></label>
                      <input type="datetime-local" value={formCreer.date_planifiee} onChange={e => setFormCreer(f => ({ ...f, date_planifiee: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Technicien (optionnel)</label>
                      <select value={formCreer.technicien_id} onChange={e => setFormCreer(f => ({ ...f, technicien_id: e.target.value }))}>
                        <option value="">Non assigné</option>
                        {mockTechniciens.map(t => (
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
                  <button className="btn-cancel" onClick={() => setModal(null)}>Annuler</button>
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