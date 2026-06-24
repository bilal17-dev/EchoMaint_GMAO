import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './DetailIntervention.css'

import {
  getIntervention, assigner, demarrer, cloturer,
  rouvrir, annuler, getRapportUrl, uploadPhoto
} from '../api/interventions.api'
import { getTechniciens } from '../api/utilisateurs.api'

const STATUT_STYLES = {
  planifiee: { label: 'Planifiée',  className: 'ot-badge-planifiee' },
  assignee:  { label: 'Assignée',   className: 'ot-badge-assignee' },
  en_cours:  { label: 'En cours',   className: 'ot-badge-en-cours' },
  terminee:  { label: 'Terminée',   className: 'ot-badge-terminee' },
  annulee:   { label: 'Annulée',    className: 'ot-badge-annulee' },
}
const TYPE_STYLES = {
  preventif: { label: 'Préventif', className: 'type-badge-preventif' },
  curatif:   { label: 'Curatif',   className: 'type-badge-curatif' },
}
const PRIO_STYLES = {
  basse:   { label: 'Basse',   className: 'prio-basse' },
  normale: { label: 'Normale', className: 'prio-normale' },
  haute:   { label: 'Haute',   className: 'prio-haute' },
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

// Les photos sont servies par Express via /storage (pas via /api/v1)
const STORAGE_URL = 'http://localhost:5000/storage'

function getPhotoUrl(chemin) {
  if (!chemin) return ''
  // Normalise les backslashes Windows et extrait le chemin relatif depuis storage/
  const normalise = chemin.replace(/\\/g, '/')
  const idx = normalise.indexOf('storage/')
  if (idx !== -1) {
    return `http://localhost:5000/${normalise.slice(idx)}`
  }
  return `${STORAGE_URL}/${normalise}`
}

function CommentaireForm({ interventionId, onAjout }) {
  const [contenu, setContenu] = useState('')
  const [sending, setSending]  = useState(false)

  const handleEnvoyer = async () => {
    if (contenu.trim().length === 0) return
    setSending(true)
    try {
      const { ajouterCommentaire } = await import('../api/interventions.api')
      const res = await ajouterCommentaire(interventionId, contenu.trim())
      onAjout(res?.data ?? [])
      setContenu('')
    } catch (err) {
      window.alert(err.response?.data?.message || 'Erreur lors de l\'envoi.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="comment-form">
      <textarea
        placeholder="Ajouter un commentaire..."
        value={contenu}
        onChange={e => setContenu(e.target.value)}
        rows={3}
      />
      <button className="btn-primary" onClick={handleEnvoyer} disabled={sending || contenu.trim().length === 0}>
        {sending ? 'Envoi...' : <><i className="ti ti-send" /> Envoyer</>}
      </button>
    </div>
  )
}

export default function DetailIntervention() {
  const { id } = useParams()
  const navigate = useNavigate()

  const user              = JSON.parse(localStorage.getItem('echomaint_user') || '{}')
  const isAdmin           = user.role === 'admin'
  const isTech            = user.role === 'technicien'

  const [ot,             setOt]             = useState(null)
  const [techniciens,    setTechniciens]    = useState([])
  const [loading,        setLoading]        = useState(true)
  const [erreur,         setErreur]         = useState('')
  const [modal,          setModal]          = useState(null)
  const [errModal,       setErrModal]       = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(null)
  const [photoZoom,      setPhotoZoom]      = useState(null) // URL photo à zoomer

  const [assignForm,   setAssignForm]   = useState({ technicien_id: '' })
  const [cloturerForm, setCloturerForm] = useState({ commentaire_cloture: '', duree_reelle_minutes: '' })
  const [rouvrirForm,  setRouvrirForm]  = useState({ motif: '' })

  

  const chargerOT = async () => {
    setLoading(true); setErreur('')
    try {
      const res = await getIntervention(id)
      setOt(res?.data ?? res)
    } catch (err) {
      console.error('Erreur chargement OT:', err)
      setErreur('Intervention introuvable ou erreur serveur.')
    } finally {
      setLoading(false)
    }
  }

  const chargerTechniciens = async () => {
    try {
      const res = await getTechniciens()
      setTechniciens(Array.isArray(res) ? res : (res?.data ?? []))
    } catch { /* non bloquant */ }
  }
  useEffect(() => {
      chargerOT()
      if (isAdmin) chargerTechniciens()
  }, [id])
  const fermerModal = () => { setModal(null); setErrModal(''); setSubmitting(false) }

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleAssigner = async () => {
    if (!assignForm.technicien_id) { setErrModal('Sélectionnez un technicien.'); return }
    setSubmitting(true)
    try {
      const res = await assigner(id, assignForm.technicien_id)
      const tech = techniciens.find(t => t.id === assignForm.technicien_id)
      setOt(prev => ({
        ...prev, ...(res?.data ?? res),
        technicien_nom: tech ? `${tech.prenom} ${tech.nom}` : prev.technicien_nom,
        technicien_id: assignForm.technicien_id
      }))
      fermerModal(); setAssignForm({ technicien_id: '' })
    } catch (err) {
      setErrModal(err.response?.data?.message || 'Erreur lors de l\'assignation.')
    } finally { setSubmitting(false) }
  }

  const handleDemarrer = async () => {
    try {
      const res = await demarrer(id)
      setOt(prev => ({ ...prev, ...(res?.data ?? res) }))
    } catch (err) {
      window.alert(err.response?.data?.message || 'Erreur lors du démarrage.')
    }
  }

  const handleCloturer = async () => {
    if (cloturerForm.commentaire_cloture.trim().length < 10) {
      setErrModal('Le commentaire doit faire au moins 10 caractères.'); return
    }
    if (!cloturerForm.duree_reelle_minutes || parseInt(cloturerForm.duree_reelle_minutes) <= 0) {
      setErrModal('La durée doit être un entier supérieur à 0.'); return
    }
    // Avertissement si aucune photo uploadée (non bloquant selon roadmap)
    const photos = ot.photos ?? []
    if (photos.length === 0) {
      const ok = window.confirm('Aucune photo n\'a été uploadée. Voulez-vous quand même clôturer ?')
      if (!ok) return
    }
    setSubmitting(true)
    try {
      const res = await cloturer(id, {
        commentaire_cloture: cloturerForm.commentaire_cloture,
        duree_reelle_minutes: parseInt(cloturerForm.duree_reelle_minutes),
        resolu: true
      })
      setOt(prev => ({ ...prev, ...(res?.data ?? res) }))
      fermerModal(); setCloturerForm({ commentaire_cloture: '', duree_reelle_minutes: '' })
      // Recharger pour avoir rapport_pdf_chemin à jour
      await chargerOT()
    } catch (err) {
      setErrModal(err.response?.data?.message || 'Erreur lors de la clôture.')
    } finally { setSubmitting(false) }
  }

  const handleRouvrir = async () => {
    if (rouvrirForm.motif.trim().length < 20) {
      setErrModal('Le motif doit faire au moins 20 caractères.'); return
    }
    setSubmitting(true)
    try {
      const res = await rouvrir(id, rouvrirForm.motif)
      setOt(prev => ({ ...prev, ...(res?.data ?? res) }))
      fermerModal(); setRouvrirForm({ motif: '' })
    } catch (err) {
      setErrModal(err.response?.data?.message || 'Erreur lors de la réouverture.')
    } finally { setSubmitting(false) }
  }

  const handleAnnuler = async () => {
    setSubmitting(true)
    try {
      const res = await annuler(id)
      setOt(prev => ({ ...prev, ...(res?.data ?? res) }))
      fermerModal()
    } catch (err) {
      window.alert(err.response?.data?.message || 'Erreur lors de l\'annulation.')
    } finally { setSubmitting(false) }
  }

  const handleUploadPhoto = async (e, type_photo) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingPhoto(type_photo)
    try {
      const res = await uploadPhoto(id, file, type_photo)
      const nouvPhotos = res?.data ?? []
      setOt(prev => ({ ...prev, photos: nouvPhotos }))
    } catch (err) {
      window.alert(err.response?.data?.message || 'Erreur lors de l\'upload.')
    } finally {
      setUploadingPhoto(null)
      e.target.value = ''
    }
  }

  const handleSupprimerPhoto = async (photoId) => {
    if (!window.confirm('Supprimer cette photo ?')) return
    try {
      await fetch(`http://localhost:5000/api/v1/interventions/photos/${photoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('echomaint_token')}` }
      })
      setOt(prev => ({ ...prev, photos: (prev.photos ?? []).filter(p => p.id !== photoId) }))
    } catch {
      window.alert('Erreur lors de la suppression.')
    }
  }

  // ── Chargement ────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="detail-intervention">
      <div className="detail-empty"><p>Chargement de l'intervention...</p></div>
    </div>
  )

  if (erreur || !ot) return (
    <div className="detail-intervention">
      <div className="detail-empty">
        <i className="ti ti-alert-circle" />
        <p>{erreur || 'Intervention introuvable.'}</p>
        <button className="btn-outline" onClick={() => navigate('/interventions')}>Retour</button>
      </div>
    </div>
  )

  const statutInfo           = STATUT_STYLES[ot.statut]  || STATUT_STYLES.planifiee
  const typeInfo             = TYPE_STYLES[ot.type]       || TYPE_STYLES.preventif
  const prioInfo             = PRIO_STYLES[ot.priorite]   || PRIO_STYLES.normale
  const isTechAssigne        = isTech && ot.technicien_id === user.id
  const isAdminOrTechAssigne = isAdmin || isTechAssigne
  const peutUploaderPhoto    = isAdminOrTechAssigne && ['assignee', 'en_cours'].includes(ot.statut)
  const peutSupprimerPhoto   = isAdminOrTechAssigne && ot.statut !== 'terminee'
  const photosAvant          = (ot.photos ?? []).filter(p => p.type_photo === 'avant')
  const photosApres          = (ot.photos ?? []).filter(p => p.type_photo === 'apres')

  return (
    <div className="detail-intervention">

      {/* Header */}
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <i className="ti ti-arrow-left" /> Retour
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
          {isAdmin && ot.statut === 'planifiee' && (
            <button className="btn-primary" onClick={() => setModal('assigner')}>
              <i className="ti ti-user-plus" /> Assigner
            </button>
          )}
          {isAdminOrTechAssigne && ot.statut === 'assignee' && (
            <button className="btn-action-start" onClick={handleDemarrer}>
              <i className="ti ti-player-play" /> Démarrer
            </button>
          )}
          {isAdminOrTechAssigne && ot.statut === 'en_cours' && (
            <button className="btn-action-close" onClick={() => setModal('cloturer')}>
              <i className="ti ti-circle-check" /> Clôturer
            </button>
          )}
          {isAdmin && ot.statut === 'terminee' && (
            <button className="btn-action-reopen" onClick={() => setModal('rouvrir')}>
              <i className="ti ti-rotate" /> Rouvrir
            </button>
          )}
          {isAdmin && ['planifiee', 'assignee'].includes(ot.statut) && (
            <button className="btn-action-cancel" onClick={() => setModal('annuler')}>
              <i className="ti ti-ban" /> Annuler
            </button>
          )}
        </div>
      )}

      {/* Grille infos */}
      <div className="detail-grid">
        <div className="detail-card">
          <h2>Détails de l'intervention</h2>
          <div className="detail-rows">
            <div className="detail-row"><span>Type</span><strong>{typeInfo.label}</strong></div>
            <div className="detail-row"><span>Priorité</span><strong>{prioInfo.label}</strong></div>
            <div className="detail-row">
              <span>Statut</span>
              <strong><span className={`ot-status-badge ${statutInfo.className}`}>{statutInfo.label}</span></strong>
            </div>
            <div className="detail-row"><span>Date planifiée</span><strong>{formatDate(ot.date_planifiee)}</strong></div>
            <div className="detail-row"><span>Début réel</span><strong>{formatDateTime(ot.date_debut_reelle)}</strong></div>
            <div className="detail-row"><span>Fin réelle</span><strong>{formatDateTime(ot.date_fin_reelle)}</strong></div>
            {ot.duree_reelle_minutes && (
              <div className="detail-row"><span>Durée réelle</span><strong>{ot.duree_reelle_minutes} min</strong></div>
            )}
            <div className="detail-row">
              <span>Technicien</span>
              <strong>
                {ot.technicien_nom
                  ? `${ot.technicien_prenom ?? ''} ${ot.technicien_nom}`.trim()
                  : <span style={{ color: '#94a3b8' }}>Non assigné</span>
                }
              </strong>
            </div>
          </div>
          {ot.commentaire_cloture && (
            <div className="detail-cloture-comment">
              <p className="detail-cloture-label">Commentaire de clôture</p>
              <p>{ot.commentaire_cloture}</p>
            </div>
          )}
          {ot.description && (
            <div className="detail-description">
              <p className="detail-description-label">Description</p>
              <p>{ot.description}</p>
            </div>
          )}
        </div>

        <div className="detail-card">
          <h2>Équipement & Bâtiment</h2>
          <div className="detail-rows">
            <div className="detail-row"><span>Équipement</span><strong>{ot.equipement_nom ?? '—'}</strong></div>
            <div className="detail-row"><span>Référence</span><strong>{ot.equipement_reference ?? '—'}</strong></div>
            <div className="detail-row"><span>Bâtiment</span><strong>{ot.batiment_nom ?? '—'}</strong></div>
          </div>
        </div>
      </div>

  
      {/* Rapport PDF */}
      <div className="detail-card">
        <h2>Rapport d'intervention</h2>
        {ot.statut === 'terminee' && ot.rapport_pdf_chemin ? (
          <button
            className="btn-primary rapport-btn"
            onClick={async () => {
              try {
                const token = localStorage.getItem('echomaint_token')
                const res = await fetch(
                  `http://localhost:5000/api/v1/interventions/${id}/rapport`,
                  { headers: { Authorization: `Bearer ${token}` } }
                )
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}))
                  window.alert(err.message || 'Rapport non disponible.')
                  return
                }
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `rapport_intervention_${id}.pdf`
                a.click()
                URL.revokeObjectURL(url)
              } catch {
                window.alert('Erreur lors du téléchargement du rapport.')
              }
            }}
          >
            <i className="ti ti-file-type-pdf" /> Télécharger le rapport PDF
          </button>
        ) : (
          <p className="rapport-unavailable">
            {ot.statut === 'terminee'
              ? 'Rapport en cours de génération...'
              : 'Le rapport sera disponible après la clôture de l\'intervention.'
            }
          </p>
        )}
      </div>

      {/* Photos */}
      <div className="detail-card">
        <h2>Photos d'intervention</h2>
        <div className="photos-grid-section">

          {/* Avant */}
          <div>
            <p className="photos-section-label">
              <i className="ti ti-camera" style={{ marginRight: 4 }} />
              Avant ({photosAvant.length})
            </p>
            {photosAvant.length === 0
              ? <p className="photos-empty">Aucune photo avant</p>
              : (
                <div className="photos-grid">
                  {photosAvant.map(p => (
                    <div key={p.id} className="photo-thumb">
                      <img
                        src={getPhotoUrl(p.chemin_fichier)}
                        alt="avant"
                        onClick={() => setPhotoZoom(getPhotoUrl(p.chemin_fichier))}
                        style={{ cursor: 'zoom-in' }}
                        onError={e => { e.target.style.background = '#f1f5f9'; e.target.alt = 'Image non disponible' }}
                      />
                      {peutSupprimerPhoto && (
                        <button
                          className="photo-delete-btn"
                          onClick={() => handleSupprimerPhoto(p.id)}
                          title="Supprimer"
                        >
                          <i className="ti ti-x" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            }
            {peutUploaderPhoto && (
              <label className="btn-upload-photo">
                <i className="ti ti-upload" />
                {uploadingPhoto === 'avant' ? 'Upload en cours...' : 'Ajouter une photo avant'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  style={{ display: 'none' }}
                  onChange={e => handleUploadPhoto(e, 'avant')}
                  disabled={uploadingPhoto !== null}
                />
              </label>
            )}
          </div>

          {/* Après */}
          <div>
            <p className="photos-section-label">
              <i className="ti ti-camera-check" style={{ marginRight: 4 }} />
              Après ({photosApres.length})
            </p>
            {photosApres.length === 0
              ? <p className="photos-empty">Aucune photo après</p>
              : (
                <div className="photos-grid">
                  {photosApres.map(p => (
                    <div key={p.id} className="photo-thumb">
                      <img
                        src={getPhotoUrl(p.chemin_fichier)}
                        alt="après"
                        onClick={() => setPhotoZoom(getPhotoUrl(p.chemin_fichier))}
                        style={{ cursor: 'zoom-in' }}
                        onError={e => { e.target.style.background = '#f1f5f9'; e.target.alt = 'Image non disponible' }}
                      />
                      {peutSupprimerPhoto && (
                        <button
                          className="photo-delete-btn"
                          onClick={() => handleSupprimerPhoto(p.id)}
                          title="Supprimer"
                        >
                          <i className="ti ti-x" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            }
            {peutUploaderPhoto && (
              <label className="btn-upload-photo">
                <i className="ti ti-upload" />
                {uploadingPhoto === 'apres' ? 'Upload en cours...' : 'Ajouter une photo après'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  style={{ display: 'none' }}
                  onChange={e => handleUploadPhoto(e, 'apres')}
                  disabled={uploadingPhoto !== null}
                />
              </label>
            )}
          </div>

        </div>
      </div>

      {/* Commentaires */}
      <div className="detail-card">
        <h2>Commentaires</h2>
        {(ot.commentaires ?? []).length === 0
          ? <p className="detail-empty-text">Aucun commentaire.</p>
          : (
            <div className="comments-list">
              {ot.commentaires.map(c => (
                <div key={c.id} className="comment-item">
                  <div className="comment-header">
                    <strong>{c.prenom ? `${c.prenom} ${c.nom}` : (c.user?.nom ?? '—')}</strong>
                    <span>{formatDateTime(c.created_at)}</span>
                  </div>
                  <p>{c.contenu}</p>
                </div>
              ))}
            </div>
          )
        }

        {/* Formulaire ajout commentaire */}
        {ot.statut !== 'annulee' && (
          <CommentaireForm interventionId={id} onAjout={(nouveauxCommentaires) =>
            setOt(prev => ({ ...prev, commentaires: nouveauxCommentaires }))
          } />
        )}
      </div>

      {/* Réouvertures */}
      {(ot.reouvertures ?? []).length > 0 && (
        <div className="detail-card">
          <h2>Historique des réouvertures</h2>
          <div className="reouvertures-list">
            {ot.reouvertures.map(r => (
              <div key={r.id} className="reouverture-item">
                <div className="reouverture-header">
                  <strong>{r.user?.nom ?? r.auteur ?? '—'}</strong>
                  <span>{formatDateTime(r.created_at)}</span>
                </div>
                <p className="reouverture-motif">{r.motif}</p>
                <span className="reouverture-statut">Statut précédent : {r.statut_precedent}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Zoom photo ────────────────────────────────────────────────────── */}
      {photoZoom && (
        <div
          className="modal-overlay"
          onClick={() => setPhotoZoom(null)}
          style={{ zIndex: 200 }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={photoZoom}
              alt="zoom"
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
            />
            <button
              onClick={() => setPhotoZoom(null)}
              style={{
                position: 'absolute', top: -12, right: -12,
                background: '#fff', border: 'none', borderRadius: '50%',
                width: 32, height: 32, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={fermerModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            {/* Assigner */}
            {modal === 'assigner' && (
              <>
                <div className="modal-header">
                  <h2>Assigner un technicien</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-form">
                  <div className="form-group">
                    <label>Technicien</label>
                    <select
                      value={assignForm.technicien_id}
                      onChange={e => setAssignForm({ technicien_id: e.target.value })}
                    >
                      <option value="">Sélectionner un technicien</option>
                      {techniciens.map(t => (
                        <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
                      ))}
                    </select>
                  </div>
                  {errModal && <p style={{ color: '#ef4444', fontSize: '13px' }}>{errModal}</p>}
                  <div className="modal-footer">
                    <button className="btn-cancel" onClick={fermerModal}>Annuler</button>
                    <button className="btn-primary" onClick={handleAssigner} disabled={submitting}>
                      {submitting ? 'Assignation...' : 'Assigner'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Clôturer */}
            {modal === 'cloturer' && (
              <>
                <div className="modal-header">
                  <h2>Clôturer l'intervention</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-form">
                  {/* Résumé photos */}
                  <div style={{
                    background: (ot.photos ?? []).length === 0 ? '#FFF7ED' : '#F0FDF4',
                    border: `1px solid ${(ot.photos ?? []).length === 0 ? '#FDE68A' : '#BBF7D0'}`,
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
                  }}>
                    <i className={`ti ${(ot.photos ?? []).length === 0 ? 'ti-alert-triangle' : 'ti-circle-check'}`}
                      style={{ color: (ot.photos ?? []).length === 0 ? '#F59E0B' : '#22C55E' }} />
                    <span>
                      {(ot.photos ?? []).length === 0
                        ? 'Aucune photo uploadée — recommandé avant clôture'
                        : `${(ot.photos ?? []).length} photo(s) uploadée(s)`
                      }
                    </span>
                  </div>

                  <div className="form-group">
                    <label>Commentaire de clôture <span className="required">*</span></label>
                    <textarea
                      placeholder="Décrivez les travaux effectués (min. 10 caractères)..."
                      value={cloturerForm.commentaire_cloture}
                      onChange={e => setCloturerForm(f => ({ ...f, commentaire_cloture: e.target.value }))}
                      rows={4}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                      {cloturerForm.commentaire_cloture.length} / 10 min
                    </span>
                  </div>

                  <div className="form-group">
                    <label>Durée réelle (minutes) <span className="required">*</span></label>
                    <input
                      type="number" min={1} placeholder="Ex: 90"
                      value={cloturerForm.duree_reelle_minutes}
                      onChange={e => setCloturerForm(f => ({ ...f, duree_reelle_minutes: e.target.value }))}
                    />
                  </div>

                  {errModal && <p style={{ color: '#ef4444', fontSize: '13px' }}>{errModal}</p>}
                  <div className="modal-footer">
                    <button className="btn-cancel" onClick={fermerModal}>Annuler</button>
                    <button className="btn-action-close" onClick={handleCloturer} disabled={submitting}>
                      {submitting ? 'Clôture...' : 'Clôturer'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Rouvrir */}
            {modal === 'rouvrir' && (
              <>
                <div className="modal-header">
                  <h2>Rouvrir l'intervention</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-form">
                  <div className="reouverture-warning">
                    <i className="ti ti-alert-triangle" />
                    <p>La réouverture invalidera le rapport PDF et repassera l'intervention en "En cours".</p>
                  </div>
                  <div className="form-group">
                    <label>Motif de réouverture <span className="required">*</span> (min. 20 caractères)</label>
                    <textarea
                      placeholder="Décrivez la raison de la réouverture..."
                      value={rouvrirForm.motif}
                      onChange={e => setRouvrirForm({ motif: e.target.value })}
                      rows={4}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                      {rouvrirForm.motif.length} / 20 min
                    </span>
                  </div>
                  {errModal && <p style={{ color: '#ef4444', fontSize: '13px' }}>{errModal}</p>}
                  <div className="modal-footer">
                    <button className="btn-cancel" onClick={fermerModal}>Annuler</button>
                    <button className="btn-action-reopen" onClick={handleRouvrir} disabled={submitting}>
                      {submitting ? 'Réouverture...' : 'Rouvrir'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Annuler */}
            {modal === 'annuler' && (
              <>
                <div className="modal-header">
                  <h2>Annuler l'intervention</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-form">
                  <p className="annuler-warning">
                    Êtes-vous sûr de vouloir annuler <strong>"{ot.titre}"</strong> ? Cette action est irréversible.
                  </p>
                  <div className="modal-footer">
                    <button className="btn-cancel" onClick={fermerModal}>Non, garder</button>
                    <button className="btn-action-cancel" onClick={handleAnnuler} disabled={submitting}>
                      {submitting ? 'Annulation...' : 'Oui, annuler'}
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  )
}