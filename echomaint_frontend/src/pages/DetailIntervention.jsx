import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getUser } from '../store/auth.store'
import PhotoUploader from '../components/PhotoUploader'
import './DetailIntervention.css'

// Mocks
const mockTechniciens = [
  { id: 't1', nom: 'Modou Diop' },
  { id: 't2', nom: 'Awa Ndiaye' },
]

const mockOTs = {
  ot1: {
    id: 'ot1', titre: 'Révision filtre climatiseur', description: 'Révision complète du filtre et vérification du niveau de gaz.',
    type: 'preventif', priorite: 'basse', statut: 'terminee',
    date_planifiee: '2026-05-28', date_debut_reelle: '2026-05-28T09:00:00', date_fin_reelle: '2026-05-28T09:45:00',
    commentaire_cloture: 'Filtre remplacé, niveau gaz vérifié. Pas d\'anomalie.',
    duree_reelle_minutes: 45, technicien_id: 't1',
    equipement: { id: 'e1', nom: 'Climatiseur Hall A', reference: 'CLIM-001', statut: 'actif' },
    batiment: { id: '1', nom: 'Siège Social DGS Africa' },
    rapport_url: '/api/interventions/ot1/rapport',
    photos: [
      { id: 'p1', type_photo: 'avant', url: 'https://placehold.co/300x200?text=Avant', created_at: '2026-05-28T09:05:00' },
      { id: 'p2', type_photo: 'apres', url: 'https://placehold.co/300x200?text=Après', created_at: '2026-05-28T09:40:00' },
    ],
    commentaires: [
      { id: 'c1', user: { nom: 'Admin DGS' }, contenu: 'Intervention validée.', created_at: '2026-05-28T10:00:00' }
    ],
    reouvertures: []
  },
  ot2: {
    id: 'ot2', titre: 'Panne démarrage groupe', description: 'Le groupe électrogène ne démarre plus depuis ce matin.',
    type: 'curatif', priorite: 'haute', statut: 'en_cours',
    date_planifiee: '2026-06-15', date_debut_reelle: '2026-06-15T08:00:00', date_fin_reelle: null,
    commentaire_cloture: null, duree_reelle_minutes: null, technicien_id: 't2',
    equipement: { id: 'e2', nom: 'Groupe Électrogène', reference: 'GE-002', statut: 'en_panne' },
    batiment: { id: '1', nom: 'Siège Social DGS Africa' },
    rapport_url: null,
    photos: [
      { id: 'p3', type_photo: 'avant', url: 'https://placehold.co/300x200?text=Avant', created_at: '2026-06-15T08:10:00' },
    ],
    commentaires: [],
    reouvertures: []
  },
  ot3: {
    id: 'ot3', titre: 'Contrôle ascenseur', description: '',
    type: 'preventif', priorite: 'moyenne', statut: 'assignee',
    date_planifiee: '2026-06-20', date_debut_reelle: null, date_fin_reelle: null,
    commentaire_cloture: null, duree_reelle_minutes: null, technicien_id: 't1',
    equipement: { id: 'e3', nom: 'Ascenseur Tour A', reference: 'ASC-003', statut: 'actif' },
    batiment: { id: '2', nom: 'Tour Almadies' },
    rapport_url: null, photos: [], commentaires: [], reouvertures: []
  },
  ot4: {
    id: 'ot4', titre: 'Fuite pompe à eau', description: 'Fuite visible au niveau du raccord principal.',
    type: 'curatif', priorite: 'haute', statut: 'a_planifier',
    date_planifiee: '2026-06-22', date_debut_reelle: null, date_fin_reelle: null,
    commentaire_cloture: null, duree_reelle_minutes: null, technicien_id: null,
    equipement: { id: 'e4', nom: 'Pompe à Eau', reference: 'POM-004', statut: 'en_panne' },
    batiment: { id: '3', nom: 'Entrepôt Mbao' },
    rapport_url: null, photos: [], commentaires: [], reouvertures: []
  },
}

// Machine à états : transitions autorisées par statut
/*const TRANSITIONS = {
  a_planifier: ['assignee', 'annulee'],
  planifiee: ['assignee', 'annulee'],
  assignee: ['en_cours', 'annulee'],
  en_cours: ['terminee'],
  terminee: ['en_cours'], // réouverture
  annulee: [],
}*/

const STATUT_STYLES = {
  a_planifier: { label: 'À planifier', className: 'ot-badge-a-planifier' },
  planifiee: { label: 'Planifiée', className: 'ot-badge-planifiee' },
  assignee: { label: 'Assignée', className: 'ot-badge-assignee' },
  en_cours: { label: 'En cours', className: 'ot-badge-en-cours' },
  terminee: { label: 'Terminée', className: 'ot-badge-terminee' },
  annulee: { label: 'Annulée', className: 'ot-badge-annulee' },
}

const TYPE_STYLES = {
  preventif: { label: 'Préventif', className: 'type-badge-preventif' },
  curatif: { label: 'Curatif', className: 'type-badge-curatif' },
}

const PRIO_STYLES = {
  basse: { label: 'Basse', className: 'prio-basse' },
  normale: { label: 'Normale', className: 'prio-normale' },
  moyenne: { label: 'Moyenne', className: 'prio-moyenne' },
  haute: { label: 'Haute', className: 'prio-haute' },
  urgente: { label: 'Urgente', className: 'prio-urgente' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DetailIntervention() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = getUser()

  const [ot, setOt] = useState(mockOTs[id])
  const [commentaire, setCommentaire] = useState('')

  // Modales
  const [modal, setModal] = useState(null) // 'assigner' | 'cloturer' | 'rouvrir' | 'annuler'
  const [assignForm, setAssignForm] = useState({ technicien_id: '' })
  const [cloturerForm, setCloturerForm] = useState({ commentaire_cloture: '', duree_reelle_minutes: '', resolu: false })
  const [rouvrirForm, setRouvrirForm] = useState({ motif: '' })

  if (!ot) {
    return (
      <div className="detail-intervention">
        <div className="detail-empty">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          <p>Intervention introuvable.</p>
          <button className="btn-outline" onClick={() => navigate('/interventions')}>
            {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  const statutInfo = STATUT_STYLES[ot.statut] || STATUT_STYLES.a_planifier
  const typeInfo = TYPE_STYLES[ot.type] || TYPE_STYLES.preventif
  const prioInfo = PRIO_STYLES[ot.priorite] || PRIO_STYLES.normale
  const technicienNom = mockTechniciens.find(t => t.id === ot.technicien_id)?.nom || t('detail.unassigned')
  const canUploadPhotos = ot.statut === 'assignee' || ot.statut === 'en_cours'

  const photosAvant = ot.photos.filter(p => p.type_photo === 'avant')
  const photosApres = ot.photos.filter(p => p.type_photo === 'apres')

  // --- Handlers machine à états (mocks — à remplacer par les vrais endpoints) ---

  const handleAssigner = (e) => {
    e.preventDefault()
    if (!assignForm.technicien_id) return
    setOt(prev => ({ ...prev, statut: 'assignee', technicien_id: assignForm.technicien_id }))
    setModal(null)
  }

  const handleDemarrer = () => {
    setOt(prev => ({ ...prev, statut: 'en_cours', date_debut_reelle: new Date().toISOString() }))
  }

  const handleCloturer = (e) => {
    e.preventDefault()
    if (cloturerForm.commentaire_cloture.trim().length < 10) {
      window.alert('Le commentaire de clôture doit faire au moins 10 caractères.')
      return
    }
    if (!cloturerForm.duree_reelle_minutes || parseInt(cloturerForm.duree_reelle_minutes) <= 0) {
      window.alert('La durée réelle doit être un entier supérieur à 0.')
      return
    }
    setOt(prev => ({
      ...prev,
      statut: 'terminee',
      date_fin_reelle: new Date().toISOString(),
      commentaire_cloture: cloturerForm.commentaire_cloture,
      duree_reelle_minutes: parseInt(cloturerForm.duree_reelle_minutes),
      rapport_url: `/api/interventions/${ot.id}/rapport`, // simulé
    }))
    setModal(null)
  }

  const handleRouvrir = (e) => {
    e.preventDefault()
    if (rouvrirForm.motif.trim().length < 20) {
      window.alert('Le motif doit faire au moins 20 caractères.')
      return
    }
    const reouverture = {
      id: `ro${Date.now()}`,
      user: { nom: user?.nom || 'Admin' },
      motif: rouvrirForm.motif,
      statut_precedent: 'terminee',
      created_at: new Date().toISOString()
    }
    setOt(prev => ({
      ...prev,
      statut: 'en_cours',
      rapport_url: null, // RG-OT-07 : rapport invalidé
      date_fin_reelle: null,
      commentaire_cloture: null,
      reouvertures: [reouverture, ...prev.reouvertures]
    }))
    setRouvrirForm({ motif: '' })
    setModal(null)
  }

  const handleAnnuler = () => {
    setOt(prev => ({ ...prev, statut: 'annulee' }))
    setModal(null)
  }

  const handleAddCommentaire = (e) => {
    e.preventDefault()
    if (!commentaire.trim()) return
    const newComment = {
      id: `c${Date.now()}`,
      user: { nom: user?.nom || 'Utilisateur' },
      contenu: commentaire,
      created_at: new Date().toISOString()
    }
    setOt(prev => ({ ...prev, commentaires: [...prev.commentaires, newComment] }))
    setCommentaire('')
  }

  const handlePhotoUploaded = (photo) => {
    setOt(prev => ({ ...prev, photos: [...prev.photos, { id: `p${Date.now()}`, ...photo, created_at: new Date().toISOString() }] }))
  }

  const handleDeletePhoto = (photoId) => {
    if (!window.confirm(t('photos.deleteConfirm'))) return
    setOt(prev => ({ ...prev, photos: prev.photos.filter(p => p.id !== photoId) }))
  }

  const isAdmin = user?.role === 'admin'
  const isTechnicienAssigne = user?.role === 'technicien' && ot.technicien_id === user?.id
  const isAdminOrTechAssigne = isAdmin || isTechnicienAssigne

  return (
    <div className="detail-intervention">

      {/* Header */}
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          {t('common.back')}
        </button>

        <div className="detail-header-title">
          <h1>{ot.titre}</h1>
          <div className="detail-header-badges">
            <span className={`type-badge ${typeInfo.className}`}>{typeInfo.label}</span>
            <span className={`ot-status-badge ${statutInfo.className}`}>{statutInfo.label}</span>
            <span className={`prio-badge ${prioInfo.className}`}>{prioInfo.label}</span>
          </div>
        </div>
      </div>

      {/* Actions machine à états */}
      {ot.statut !== 'annulee' && (
        <div className="detail-actions">
          {/* Assigner — admin, OT à planifier ou planifié */}
          {isAdmin && (ot.statut === 'a_planifier' || ot.statut === 'planifiee') && (
            <button className="btn-primary" onClick={() => setModal('assigner')}>
              <i className="ti ti-user-plus" aria-hidden="true" />
              {t('detail.actions.assigner')}
            </button>
          )}

          {/* Démarrer — admin ou technicien assigné, OT assigné */}
          {isAdminOrTechAssigne && ot.statut === 'assignee' && (
            <button className="btn-action-start" onClick={handleDemarrer}>
              <i className="ti ti-player-play" aria-hidden="true" />
              {t('detail.actions.demarrer')}
            </button>
          )}

          {/* Clôturer — admin ou technicien assigné, OT en cours */}
          {isAdminOrTechAssigne && ot.statut === 'en_cours' && (
            <button className="btn-action-close" onClick={() => setModal('cloturer')}>
              <i className="ti ti-circle-check" aria-hidden="true" />
              {t('detail.actions.cloturer')}
            </button>
          )}

          {/* Rouvrir — admin uniquement, OT terminé (RG-OT-04) */}
          {isAdmin && ot.statut === 'terminee' && (
            <button className="btn-action-reopen" onClick={() => setModal('rouvrir')}>
              <i className="ti ti-rotate" aria-hidden="true" />
              {t('detail.actions.rouvrir')}
            </button>
          )}

          {/* Annuler — admin uniquement, OT à planifier ou assigné */}
          {isAdmin && (ot.statut === 'a_planifier' || ot.statut === 'planifiee' || ot.statut === 'assignee') && (
            <button className="btn-action-cancel" onClick={() => setModal('annuler')}>
              <i className="ti ti-ban" aria-hidden="true" />
              {t('detail.actions.annuler')}
            </button>
          )}
        </div>
      )}

      {/* Infos + Équipement */}
      <div className="detail-grid">
        <div className="detail-card">
          <h2>{t('detail.otDetails')}</h2>
          <div className="detail-rows">
            <div className="detail-row"><span>{t('detail.type')}</span><strong>{typeInfo.label}</strong></div>
            <div className="detail-row"><span>{t('detail.priorite')}</span><strong>{prioInfo.label}</strong></div>
            <div className="detail-row"><span>{t('detail.datePlanifiee')}</span><strong>{formatDate(ot.date_planifiee)}</strong></div>
            <div className="detail-row"><span>{t('detail.dateDebut')}</span><strong>{formatDateTime(ot.date_debut_reelle)}</strong></div>
            <div className="detail-row"><span>{t('detail.dateFin')}</span><strong>{formatDateTime(ot.date_fin_reelle)}</strong></div>
            {ot.duree_reelle_minutes && (
              <div className="detail-row"><span>{t('detail.duree')}</span><strong>{ot.duree_reelle_minutes} {t('detail.min')}</strong></div>
            )}
            <div className="detail-row"><span>{t('detail.technicien')}</span><strong>{technicienNom}</strong></div>
          </div>
          {ot.commentaire_cloture && (
            <div className="detail-cloture-comment">
              <p className="detail-cloture-label">Commentaire de clôture</p>
              <p>{ot.commentaire_cloture}</p>
            </div>
          )}
          {ot.description && (
            <div className="detail-description">
              <p className="detail-description-label">{t('detail.description')}</p>
              <p>{ot.description}</p>
            </div>
          )}
        </div>

        <div className="detail-card">
          <h2>{t('detail.equipment')}</h2>
          <div className="detail-rows">
            <div className="detail-row"><span>{t('detail.equipment')}</span><strong>{ot.equipement.nom}</strong></div>
            <div className="detail-row"><span>Réf.</span><strong>{ot.equipement.reference}</strong></div>
            <div className="detail-row"><span>{t('detail.building')}</span><strong>{ot.batiment.nom}</strong></div>
          </div>
        </div>
      </div>

      {/* Rapport PDF — RG-RAPPORT-01 */}
      <div className="detail-card">
        <h2>{t('detail.rapport')}</h2>
        {ot.rapport_url && ot.statut === 'terminee' ? (
          <a
            href={ot.rapport_url}
            target="_blank"
            rel="noreferrer"
            className="btn-primary rapport-btn"
          >
            <i className="ti ti-file-type-pdf" aria-hidden="true" />
            {t('detail.downloadRapport')}
          </a>
        ) : (
          <p className="rapport-unavailable">{t('detail.rapportUnavailable')}</p>
        )}
      </div>

      {/* Photos */}
      <div className="detail-card">
        <h2>{t('detail.photos')}</h2>

        <div className="photos-grid-section">
          <div>
            <p className="photos-section-label">{t('detail.photosAvant')}</p>
            <div className="photos-grid">
              {photosAvant.length === 0 && <p className="photos-empty">{t('detail.noPhotos')}</p>}
              {photosAvant.map(p => (
                <div key={p.id} className="photo-thumb">
                  <img src={p.url} alt="avant" />
                  {(isAdmin || isTechnicienAssigne) && ot.statut !== 'terminee' && (
                    <button className="photo-delete-btn" onClick={() => handleDeletePhoto(p.id)}>
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {(isAdmin || isTechnicienAssigne) && (
              <PhotoUploader
                typePhoto="avant"
                canUpload={canUploadPhotos}
                onUpload={handlePhotoUploaded}
              />
            )}
          </div>

          <div>
            <p className="photos-section-label">{t('detail.photosApres')}</p>
            <div className="photos-grid">
              {photosApres.length === 0 && <p className="photos-empty">{t('detail.noPhotos')}</p>}
              {photosApres.map(p => (
                <div key={p.id} className="photo-thumb">
                  <img src={p.url} alt="après" />
                  {(isAdmin || isTechnicienAssigne) && ot.statut !== 'terminee' && (
                    <button className="photo-delete-btn" onClick={() => handleDeletePhoto(p.id)}>
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {(isAdmin || isTechnicienAssigne) && (
              <PhotoUploader
                typePhoto="apres"
                canUpload={canUploadPhotos}
                onUpload={handlePhotoUploaded}
              />
            )}
          </div>
        </div>
      </div>

      {/* Commentaires */}
      <div className="detail-card">
        <h2>{t('detail.comments')}</h2>
        {ot.commentaires.length === 0 && <p className="detail-empty-text">{t('detail.noComments')}</p>}
        <div className="comments-list">
          {ot.commentaires.map(c => (
            <div key={c.id} className="comment-item">
              <div className="comment-header">
                <strong>{c.user.nom}</strong>
                <span>{formatDateTime(c.created_at)}</span>
              </div>
              <p>{c.contenu}</p>
            </div>
          ))}
        </div>
        {ot.statut !== 'annulee' && (
          <form onSubmit={handleAddCommentaire} className="comment-form">
            <textarea
              placeholder={t('detail.commentPlaceholder')}
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              rows={2}
              required
            />
            <button type="submit" className="btn-primary">{t('detail.addComment')}</button>
          </form>
        )}
      </div>

      {/* Réouvertures */}
      {ot.reouvertures.length > 0 && (
        <div className="detail-card">
          <h2>{t('detail.reopenings')}</h2>
          <div className="reouvertures-list">
            {ot.reouvertures.map(r => (
              <div key={r.id} className="reouverture-item">
                <div className="reouverture-header">
                  <strong>{r.user.nom}</strong>
                  <span>{formatDateTime(r.created_at)}</span>
                </div>
                <p className="reouverture-motif">{r.motif}</p>
                <span className="reouverture-statut">Statut précédent : {r.statut_precedent}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== MODALES ===== */}

      {/* Modal : Assigner */}
      {modal === 'assigner' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('detail.modals.assignerTitle')}</h2>
              <button onClick={() => setModal(null)}><i className="ti ti-x" /></button>
            </div>
            <form onSubmit={handleAssigner} className="modal-form">
              <div className="form-group">
                <label>{t('detail.technicien')}</label>
                <select
                  value={assignForm.technicien_id}
                  onChange={e => setAssignForm({ technicien_id: e.target.value })}
                  required
                >
                  <option value="">{t('detail.modals.selectTechnicien')}</option>
                  {mockTechniciens.map(t => (
                    <option key={t.id} value={t.id}>{t.nom}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setModal(null)}>{t('common.cancel')}</button>
                <button type="submit" className="btn-primary">{t('common.confirm')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : Clôturer */}
      {modal === 'cloturer' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('detail.modals.cloturerTitle')}</h2>
              <button onClick={() => setModal(null)}><i className="ti ti-x" /></button>
            </div>
            <form onSubmit={handleCloturer} className="modal-form">
              <div className="form-group">
                <label>{t('detail.modals.commentaireCloture')}</label>
                <textarea
                  placeholder={t('detail.modals.commentairePlaceholder')}
                  value={cloturerForm.commentaire_cloture}
                  onChange={e => setCloturerForm(f => ({ ...f, commentaire_cloture: e.target.value }))}
                  rows={4}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('detail.modals.dureeReelle')}</label>
                <input
                  type="number"
                  min={1}
                  placeholder={t('detail.modals.dureePlaceholder')}
                  value={cloturerForm.duree_reelle_minutes}
                  onChange={e => setCloturerForm(f => ({ ...f, duree_reelle_minutes: e.target.value }))}
                  required
                />
              </div>
              {ot.equipement.statut === 'en_panne' && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cloturerForm.resolu}
                    onChange={e => setCloturerForm(f => ({ ...f, resolu: e.target.checked }))}
                  />
                  {t('detail.modals.resolu')}
                </label>
              )}
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setModal(null)}>{t('common.cancel')}</button>
                <button type="submit" className="btn-action-close">{t('detail.actions.cloturer')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : Rouvrir */}
      {modal === 'rouvrir' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('detail.modals.rouvrirTitle')}</h2>
              <button onClick={() => setModal(null)}><i className="ti ti-x" /></button>
            </div>
            <form onSubmit={handleRouvrir} className="modal-form">
              <div className="reouverture-warning">
                <i className="ti ti-alert-triangle" aria-hidden="true" />
                <p>{t('detail.modals.rouvrirWarning')}</p>
              </div>
              <div className="form-group">
                <label>{t('detail.modals.motif')}</label>
                <textarea
                  placeholder={t('detail.modals.motifPlaceholder')}
                  value={rouvrirForm.motif}
                  onChange={e => setRouvrirForm({ motif: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setModal(null)}>{t('common.cancel')}</button>
                <button type="submit" className="btn-action-reopen">{t('detail.actions.rouvrir')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : Annuler */}
      {modal === 'annuler' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('detail.modals.annulerTitle')}</h2>
              <button onClick={() => setModal(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-form">
              <p className="annuler-warning">{t('detail.modals.annulerConfirm')}</p>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setModal(null)}>{t('common.cancel')}</button>
                <button className="btn-action-cancel" onClick={handleAnnuler}>{t('detail.actions.annuler')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}