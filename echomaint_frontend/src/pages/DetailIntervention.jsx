import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './DetailIntervention.css'

import {
  getIntervention, assigner, demarrer, cloturer,
  rouvrir, annuler, getRapportUrl, uploadPhoto
} from '../api/interventions.api'
import { getTechniciens } from '../api/utilisateurs.api'

const STATUT_META = {
  planifiee: { label: 'Planifiée',  bg: 'linear-gradient(135deg,#1E293B 0%,#334155 100%)' },
  assignee:  { label: 'Assignée',   bg: 'linear-gradient(135deg,#431407 0%,#78350F 100%)' },
  en_cours:  { label: 'En cours',   bg: 'linear-gradient(135deg,#1E3A5F 0%,#1E40AF 100%)' },
  terminee:  { label: 'Terminée',   bg: 'linear-gradient(135deg,#052E16 0%,#065F46 100%)' },
  annulee:   { label: 'Annulée',    bg: 'linear-gradient(135deg,#450A0A 0%,#7F1D1D 100%)' },
}
const TYPE_META = {
  preventif: { label: 'Préventif', icon: 'ti-tool',           cls: 'detiv-chip--prev' },
  curatif:   { label: 'Curatif',   icon: 'ti-alert-triangle', cls: 'detiv-chip--cur'  },
}
const PRIO_META = {
  basse:   { label: 'Basse',   cls: 'detiv-chip--prio-basse'   },
  normale: { label: 'Normale', cls: 'detiv-chip--prio-normale' },
  haute:   { label: 'Haute',   cls: 'detiv-chip--prio-haute'   },
  urgente: { label: 'Urgente', cls: 'detiv-chip--prio-urgente' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STORAGE_URL = 'http://localhost:5000/storage'
function getPhotoUrl(chemin) {
  if (!chemin) return ''
  const normalise = chemin.replace(/\\/g, '/')
  const idx = normalise.indexOf('storage/')
  if (idx !== -1) return `http://localhost:5000/${normalise.slice(idx)}`
  return `${STORAGE_URL}/${normalise}`
}

function initials(prenom, nom) {
  return `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase() || '?'
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
    <div className="detiv-comment-form">
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
  const [photoZoom,      setPhotoZoom]      = useState(null)

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

  const handleAssigner = async () => {
    if (!assignForm.technicien_id) { setErrModal('Sélectionnez un technicien.'); return }
    setSubmitting(true)
    try {
      const res = await assigner(id, assignForm.technicien_id)
      const tech = techniciens.find(t => t.id === assignForm.technicien_id)
      setOt(prev => ({
        ...prev, ...(res?.data ?? res),
        technicien_nom:    tech ? tech.nom    : prev.technicien_nom,
        technicien_prenom: tech ? tech.prenom : prev.technicien_prenom,
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
    const photos = ot.photos ?? []
    if (photos.length === 0) {
      const ok = window.confirm('Aucune photo n\'a été uploadée. Voulez-vous quand même clôturer ?')
      if (!ok) return
    }
    setSubmitting(true)
    try {
      const res = await cloturer(id, {
        commentaire_cloture:  cloturerForm.commentaire_cloture,
        duree_reelle_minutes: parseInt(cloturerForm.duree_reelle_minutes),
        resolu: true
      })
      setOt(prev => ({ ...prev, ...(res?.data ?? res) }))
      fermerModal(); setCloturerForm({ commentaire_cloture: '', duree_reelle_minutes: '' })
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
      setOt(prev => ({ ...prev, photos: res?.data ?? [] }))
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

  /* ── États de chargement ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="detiv-empty-state">
      <div className="detiv-empty-inner">
        <i className="ti ti-loader-2 spin" style={{ fontSize: 32, color: 'var(--brand)' }} />
        <p>Chargement de l'intervention...</p>
      </div>
    </div>
  )

  if (erreur || !ot) return (
    <div className="detiv-empty-state">
      <div className="detiv-empty-inner">
        <i className="ti ti-alert-circle" style={{ fontSize: 40, color: '#ef4444' }} />
        <p>{erreur || 'Intervention introuvable.'}</p>
        <button className="btn-outline" onClick={() => navigate('/interventions')}>Retour à la liste</button>
      </div>
    </div>
  )

  const statutMeta          = STATUT_META[ot.statut]  || STATUT_META.planifiee
  const typeMeta            = TYPE_META[ot.type]       || TYPE_META.preventif
  const prioMeta            = PRIO_META[ot.priorite]   || PRIO_META.normale
  const isTechAssigne        = isTech && ot.technicien_id === user.id
  const isAdminOrTechAssigne = isAdmin || isTechAssigne
  const peutUploaderPhoto    = isAdminOrTechAssigne && ['assignee', 'en_cours'].includes(ot.statut)
  const peutSupprimerPhoto   = isAdminOrTechAssigne && ot.statut !== 'terminee'
  const photosAvant          = (ot.photos ?? []).filter(p => p.type_photo === 'avant')
  const photosApres          = (ot.photos ?? []).filter(p => p.type_photo === 'apres')

  return (
    <div className="detiv">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="detiv-hero" style={{ background: statutMeta.bg }}>

        <div className="detiv-hero-top">
          <button className="detiv-back-btn" onClick={() => navigate(-1)}>
            <i className="ti ti-arrow-left" /> Retour
          </button>
          <span className="detiv-ot-id">OT-{String(ot.id).padStart(4, '0')}</span>
        </div>

        <div className="detiv-hero-content">
          <div className={`detiv-type-icon ${ot.type === 'curatif' ? 'detiv-type-icon--cur' : ''}`}>
            <i className={`ti ${typeMeta.icon}`} />
          </div>
          <div className="detiv-hero-text">
            <h1 className="detiv-hero-title">{ot.titre}</h1>
            <div className="detiv-hero-chips">
              <span className="detiv-chip detiv-chip--statut">{statutMeta.label}</span>
              <span className={`detiv-chip ${prioMeta.cls}`}>{prioMeta.label}</span>
              <span className={`detiv-chip ${typeMeta.cls}`}>{typeMeta.label}</span>
            </div>
            {ot.description && (
              <p className="detiv-hero-desc">{ot.description}</p>
            )}
          </div>
        </div>

        {ot.statut !== 'annulee' && (
          <div className="detiv-hero-actions">
            {isAdmin && ot.statut === 'planifiee' && (
              <button className="detiv-action-btn detiv-action-btn--blue" onClick={() => setModal('assigner')}>
                <i className="ti ti-user-plus" /> Assigner
              </button>
            )}
            {isAdminOrTechAssigne && ot.statut === 'assignee' && (
              <button className="detiv-action-btn detiv-action-btn--violet" onClick={handleDemarrer}>
                <i className="ti ti-player-play" /> Démarrer
              </button>
            )}
            {isAdminOrTechAssigne && ot.statut === 'en_cours' && (
              <button className="detiv-action-btn detiv-action-btn--green" onClick={() => setModal('cloturer')}>
                <i className="ti ti-circle-check" /> Clôturer
              </button>
            )}
            {isAdmin && ot.statut === 'terminee' && (
              <button className="detiv-action-btn detiv-action-btn--amber" onClick={() => setModal('rouvrir')}>
                <i className="ti ti-rotate" /> Rouvrir
              </button>
            )}
            {isAdmin && ['planifiee', 'assignee'].includes(ot.statut) && (
              <button className="detiv-action-btn detiv-action-btn--ghost" onClick={() => setModal('annuler')}>
                <i className="ti ti-ban" /> Annuler
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div className="detiv-body">

        {/* Grille 2 colonnes : Info + Équipement */}
        <div className="detiv-grid-2">

          {/* Card : Informations */}
          <div className="detiv-card">
            <div className="detiv-card-head">
              <div className="detiv-card-icon" style={{ background: '#EFF6FF' }}>
                <i className="ti ti-info-circle" style={{ color: '#2563EB' }} />
              </div>
              <h2 className="detiv-card-title">Informations</h2>
            </div>

            {/* Technicien */}
            <div className="detiv-tech-card">
              <div className="detiv-tech-avatar">
                {ot.technicien_nom
                  ? initials(ot.technicien_prenom, ot.technicien_nom)
                  : <i className="ti ti-user-off" />
                }
              </div>
              <div className="detiv-tech-info">
                <p className="detiv-tech-name">
                  {ot.technicien_nom
                    ? `${ot.technicien_prenom ?? ''} ${ot.technicien_nom}`.trim()
                    : 'Non assigné'
                  }
                </p>
                <p className="detiv-tech-role">Technicien assigné</p>
              </div>
            </div>

            {/* Dates */}
            <div className="detiv-dates-grid">
              <div className="detiv-date-item">
                <span className="detiv-date-label"><i className="ti ti-calendar" /> Planifiée</span>
                <span className="detiv-date-val">{fmtDate(ot.date_planifiee)}</span>
              </div>
              <div className="detiv-date-item" data-done={!!ot.date_debut_reelle || undefined}>
                <span className="detiv-date-label"><i className="ti ti-player-play" /> Démarrée</span>
                <span className="detiv-date-val">{fmtDateTime(ot.date_debut_reelle)}</span>
              </div>
              <div className="detiv-date-item" data-done={!!ot.date_fin_reelle || undefined}>
                <span className="detiv-date-label"><i className="ti ti-circle-check" /> Clôturée</span>
                <span className="detiv-date-val">{fmtDateTime(ot.date_fin_reelle)}</span>
              </div>
              {ot.duree_reelle_minutes && (
                <div className="detiv-date-item detiv-date-item--accent">
                  <span className="detiv-date-label"><i className="ti ti-clock" /> Durée réelle</span>
                  <span className="detiv-date-val">{ot.duree_reelle_minutes} min</span>
                </div>
              )}
            </div>

            {ot.commentaire_cloture && (
              <div className="detiv-cloture-box">
                <p className="detiv-cloture-label">
                  <i className="ti ti-clipboard-check" /> Commentaire de clôture
                </p>
                <p className="detiv-cloture-text">{ot.commentaire_cloture}</p>
              </div>
            )}
          </div>

          {/* Card : Équipement & Bâtiment */}
          <div className="detiv-card">
            <div className="detiv-card-head">
              <div className="detiv-card-icon" style={{ background: '#F0FDF4' }}>
                <i className="ti ti-cpu" style={{ color: '#059669' }} />
              </div>
              <h2 className="detiv-card-title">Équipement & Bâtiment</h2>
            </div>

            <div className="detiv-equip-hero">
              <div className="detiv-equip-icon">
                <i className="ti ti-settings" />
              </div>
              <div>
                <p className="detiv-equip-name">{ot.equipement_nom || '—'}</p>
                {ot.equipement_reference && (
                  <p className="detiv-equip-ref">Réf. {ot.equipement_reference}</p>
                )}
              </div>
            </div>

            <div className="detiv-meta-row">
              <div className="detiv-meta-icon">
                <i className="ti ti-building" />
              </div>
              <div>
                <p className="detiv-meta-label">Bâtiment</p>
                <p className="detiv-meta-val">{ot.batiment_nom || '—'}</p>
              </div>
            </div>

            {ot.description && (
              <div className="detiv-desc-box">
                <p className="detiv-desc-label">Description</p>
                <p className="detiv-desc-text">{ot.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Card : Rapport PDF */}
        <div className="detiv-card">
          <div className="detiv-card-head">
            <div className="detiv-card-icon" style={{ background: '#FEF2F2' }}>
              <i className="ti ti-file-type-pdf" style={{ color: '#EF4444' }} />
            </div>
            <h2 className="detiv-card-title">Rapport d'intervention</h2>
          </div>

          {ot.statut === 'terminee' && ot.rapport_url ? (
            <button
              className="detiv-rapport-btn"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('echomaint_token')
                  const res = await fetch(
                    `http://localhost:5000${ot.rapport_url}`,
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
              <i className="ti ti-download" /> Télécharger le rapport PDF
            </button>
          ) : ot.statut === 'en_cours' && !ot.rapport_url ? (
            <div className="detiv-info-msg detiv-info-msg--warning">
              <i className="ti ti-refresh-alert" />
              <span>Rapport invalidé — nouvelle clôture requise</span>
            </div>
          ) : ot.statut === 'terminee' ? (
            <div className="detiv-info-msg detiv-info-msg--error">
              <i className="ti ti-file-off" />
              <span>Rapport non disponible — veuillez contacter l'administrateur.</span>
            </div>
          ) : (
            <div className="detiv-info-msg">
              <i className="ti ti-clock" />
              <span>Le rapport sera disponible après la clôture de l'intervention.</span>
            </div>
          )}
        </div>

        {/* Card : Photos */}
        <div className="detiv-card">
          <div className="detiv-card-head">
            <div className="detiv-card-icon" style={{ background: '#F5F3FF' }}>
              <i className="ti ti-camera" style={{ color: '#8B5CF6' }} />
            </div>
            <h2 className="detiv-card-title">Photos d'intervention</h2>
          </div>

          <div className="detiv-photos-cols">
            {/* Avant */}
            <div className="detiv-photos-section">
              <p className="detiv-photos-label">
                <i className="ti ti-camera" />
                Avant
                <span className="detiv-photos-count">{photosAvant.length}</span>
              </p>
              {photosAvant.length === 0
                ? <p className="detiv-photos-empty">Aucune photo avant</p>
                : (
                  <div className="detiv-photos-grid">
                    {photosAvant.map(p => (
                      <div key={p.id} className="detiv-photo-thumb">
                        <img
                          src={getPhotoUrl(p.chemin_fichier)}
                          alt="avant"
                          onClick={() => setPhotoZoom(getPhotoUrl(p.chemin_fichier))}
                          onError={e => { e.target.style.background = '#f1f5f9'; e.target.alt = 'Image non disponible' }}
                        />
                        {peutSupprimerPhoto && (
                          <button className="detiv-photo-del" onClick={() => handleSupprimerPhoto(p.id)} title="Supprimer">
                            <i className="ti ti-x" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
              {peutUploaderPhoto && (
                <label className="detiv-upload-btn">
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
            <div className="detiv-photos-section">
              <p className="detiv-photos-label">
                <i className="ti ti-camera-check" />
                Après
                <span className="detiv-photos-count">{photosApres.length}</span>
              </p>
              {photosApres.length === 0
                ? <p className="detiv-photos-empty">Aucune photo après</p>
                : (
                  <div className="detiv-photos-grid">
                    {photosApres.map(p => (
                      <div key={p.id} className="detiv-photo-thumb">
                        <img
                          src={getPhotoUrl(p.chemin_fichier)}
                          alt="après"
                          onClick={() => setPhotoZoom(getPhotoUrl(p.chemin_fichier))}
                          onError={e => { e.target.style.background = '#f1f5f9'; e.target.alt = 'Image non disponible' }}
                        />
                        {peutSupprimerPhoto && (
                          <button className="detiv-photo-del" onClick={() => handleSupprimerPhoto(p.id)} title="Supprimer">
                            <i className="ti ti-x" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
              {peutUploaderPhoto && (
                <label className="detiv-upload-btn">
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

        {/* Card : Commentaires */}
        <div className="detiv-card">
          <div className="detiv-card-head">
            <div className="detiv-card-icon" style={{ background: '#F0FDF4' }}>
              <i className="ti ti-message-circle" style={{ color: '#059669' }} />
            </div>
            <h2 className="detiv-card-title">
              Commentaires
              {(ot.commentaires ?? []).length > 0 && (
                <span className="detiv-count-chip">{ot.commentaires.length}</span>
              )}
            </h2>
          </div>

          {(ot.commentaires ?? []).length === 0
            ? <p className="detiv-empty-text">Aucun commentaire pour cette intervention.</p>
            : (
              <div className="detiv-comments-list">
                {ot.commentaires.map(c => (
                  <div key={c.id} className="detiv-comment">
                    <div className="detiv-comment-avatar">
                      {`${c.prenom?.[0] ?? ''}${c.nom?.[0] ?? c.user?.nom?.[0] ?? '?'}`.toUpperCase()}
                    </div>
                    <div className="detiv-comment-body">
                      <div className="detiv-comment-header">
                        <strong>{c.prenom ? `${c.prenom} ${c.nom}` : (c.user?.nom ?? '—')}</strong>
                        <span>{fmtDateTime(c.created_at)}</span>
                      </div>
                      <p className="detiv-comment-text">{c.contenu}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }

          {ot.statut !== 'annulee' && (
            <CommentaireForm
              interventionId={id}
              onAjout={nouveauxCommentaires => setOt(prev => ({ ...prev, commentaires: nouveauxCommentaires }))}
            />
          )}
        </div>

        {/* Card : Réouvertures */}
        {(ot.reouvertures ?? []).length > 0 && (
          <div className="detiv-card">
            <div className="detiv-card-head">
              <div className="detiv-card-icon" style={{ background: '#FFFBEB' }}>
                <i className="ti ti-refresh-alert" style={{ color: '#D97706' }} />
              </div>
              <h2 className="detiv-card-title">
                Historique des réouvertures
                <span className="detiv-count-chip detiv-count-chip--warn">{ot.reouvertures.length}</span>
              </h2>
            </div>
            <div className="detiv-reouv-list">
              {ot.reouvertures.map(r => (
                <div key={r.id} className="detiv-reouv-item">
                  <div className="detiv-reouv-header">
                    <strong>{r.user?.nom ?? r.auteur ?? '—'}</strong>
                    <span>{fmtDateTime(r.created_at)}</span>
                  </div>
                  <p className="detiv-reouv-motif">{r.motif}</p>
                  <span className="detiv-reouv-statut">Statut précédent : {r.statut_precedent}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Zoom photo ─────────────────────────────────────────────────────── */}
      {photoZoom && (
        <div className="modal-overlay" onClick={() => setPhotoZoom(null)} style={{ zIndex: 900 }}>
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

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
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
                    <select value={assignForm.technicien_id} onChange={e => setAssignForm({ technicien_id: e.target.value })}>
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
                    <label>Commentaire de clôture <span style={{ color: '#b91c1c' }}>*</span></label>
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
                    <label>Durée réelle (minutes) <span style={{ color: '#b91c1c' }}>*</span></label>
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
                    <label>Motif de réouverture <span style={{ color: '#b91c1c' }}>*</span> (min. 20 caractères)</label>
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
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
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
