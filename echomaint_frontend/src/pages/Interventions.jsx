import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Interventions.css'

import {
  getInterventions, createIntervention, assigner, demarrer,
  cloturer, rouvrir, annuler, getRapportUrl
} from '../api/interventions.api'
import { getTechniciens } from '../api/utilisateurs.api'
import { getBatiments } from '../api/batiments.api'
import { getEquipements } from '../api/equipements.api'

const STATUT_COLORS = {
  planifiee: { bg: '#F1F5F9', color: '#64748B' },
  assignee:  { bg: '#FFF7ED', color: '#F59E0B' },
  en_cours:  { bg: '#EFF6FF', color: '#2563EB' },
  terminee:  { bg: '#F0FDF4', color: '#22C55E' },
  annulee:   { bg: '#FEF2F2', color: '#EF4444' },
}

const PRIORITE_COLORS = {
  basse:   { bg: '#F0FDF4', color: '#22C55E' },
  normale: { bg: '#EFF6FF', color: '#2563EB' },
  haute:   { bg: '#FFF7ED', color: '#F59E0B' },
  urgente: { bg: '#FEF2F2', color: '#EF4444' },
}

export default function Interventions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('echomaint_user') || '{}')
  const isAdmin = user.role === 'admin'
  const isTech  = user.role === 'technicien'

  const [interventions, setInterventions] = useState([])
  const [techniciens,   setTechniciens]   = useState([])
  const [batiments,     setBatiments]     = useState([])
  const [equipements,   setEquipements]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [erreurChargement, setErreurChargement] = useState('')

  const [selected, setSelected] = useState(null)
  const [modal,    setModal]    = useState(null)
  const [erreurs,  setErreurs]  = useState([])

  const [filterStatut,   setFilterStatut]   = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterPriorite, setFilterPriorite] = useState('')
  const [filterBatiment, setFilterBatiment] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  const [formAssigner,  setFormAssigner]  = useState({ technicien_id: '' })
  const [formCloturer,  setFormCloturer]  = useState({ commentaire_cloture: '', duree_reelle_minutes: '' })
  const [formRouvrir,   setFormRouvrir]   = useState({ motif: '' })
  const [formCreer,     setFormCreer]     = useState({
    titre: '', type: 'preventif', priorite: 'normale',
    description: '', date_planifiee: '', technicien_id: '', equipement_id: ''
  })

  const chargerDonnees = async () => {
    setLoading(true)
    setErreurChargement('')
    try {
      const promises = [getInterventions(), getBatiments(), getEquipements()]
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
      setErreurChargement(t('interventions.errors.loadError'))
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { chargerDonnees() }, [])

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

  const mettreAJourLocalement = (id, data) => {
    setInterventions(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
    if (selected?.id === id) setSelected(prev => ({ ...prev, ...data }))
  }

  const fermerModal = () => { setModal(null); setErreurs([]) }

  const handleAssigner = async () => {
    if (!formAssigner.technicien_id) { setErreurs([t('interventions.errors.selectTech')]); return }
    try {
      const res = await assigner(selected.id, formAssigner.technicien_id)
      const data = res?.data ?? res
      mettreAJourLocalement(selected.id, data)
      const tech = techniciens.find(tc => tc.id === formAssigner.technicien_id)
      if (tech) mettreAJourLocalement(selected.id, {
        ...data,
        technicien_nom: `${tech.prenom} ${tech.nom}`,
        technicien_id: tech.id
      })
      fermerModal()
      setFormAssigner({ technicien_id: '' })
    } catch (error) {
      setErreurs([error.response?.data?.message || t('interventions.errors.assignError')])
    }
  }

  const handleDemarrer = async (id) => {
    try {
      const res = await demarrer(id)
      mettreAJourLocalement(id, res?.data ?? res)
    } catch (error) {
      window.alert(error.response?.data?.message || t('interventions.errors.startError'))
    }
  }

  const handleCloturer = async () => {
    const errs = []
    if (!formCloturer.commentaire_cloture || formCloturer.commentaire_cloture.length < 10)
      errs.push(t('interventions.errors.commentMin'))
    if (!formCloturer.duree_reelle_minutes || Number(formCloturer.duree_reelle_minutes) <= 0)
      errs.push(t('interventions.errors.durationPositive'))
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
      setErreurs([error.response?.data?.message || t('interventions.errors.closeError')])
    }
  }

  const handleRouvrir = async () => {
    if (!formRouvrir.motif || formRouvrir.motif.length < 20) {
      setErreurs([t('interventions.errors.reasonMin')]); return
    }
    try {
      const res = await rouvrir(selected.id, formRouvrir.motif)
      mettreAJourLocalement(selected.id, res?.data ?? res)
      fermerModal()
      setFormRouvrir({ motif: '' })
    } catch (error) {
      setErreurs([error.response?.data?.message || t('interventions.errors.reopenError')])
    }
  }

  const handleAnnuler = async () => {
    try {
      const res = await annuler(selected.id)
      mettreAJourLocalement(selected.id, res?.data ?? res)
      fermerModal()
    } catch (error) {
      window.alert(error.response?.data?.message || t('interventions.errors.cancelError'))
    }
  }

  const handleCreer = async () => {
    const errs = []
    if (!formCreer.titre)         errs.push(t('interventions.errors.titleRequired'))
    if (!formCreer.date_planifiee) errs.push(t('interventions.errors.dateRequired'))
    if (!formCreer.equipement_id) errs.push(t('interventions.errors.equipRequired'))
    if (errs.length) { setErreurs(errs); return }

    try {
      const res = await createIntervention(formCreer)
      const nouvelle = res?.data ?? res
      setInterventions(prev => [nouvelle, ...prev])
      fermerModal()
      setFormCreer({ titre: '', type: 'preventif', priorite: 'normale', description: '', date_planifiee: '', technicien_id: '', equipement_id: '' })
    } catch (error) {
      setErreurs([error.response?.data?.message || t('interventions.errors.createError')])
    }
  }

  const renderActions = (ot) => {
    const isAssignedTech = user.id === ot.technicien_id

    return (
      <div className="ot-actions">
        {ot.statut === 'planifiee' && isAdmin && (
          <button className="btn-action btn-blue" onClick={() => { setSelected(ot); setModal('assigner') }}>
            <i className="ti ti-user-plus" /> {t('interventions.actions.assign')}
          </button>
        )}
        {ot.statut === 'assignee' && (isAdmin || (isTech && isAssignedTech)) && (
          <button className="btn-action btn-orange" onClick={() => handleDemarrer(ot.id)}>
            <i className="ti ti-player-play" /> {t('interventions.actions.start')}
          </button>
        )}
        {ot.statut === 'en_cours' && (isAdmin || (isTech && isAssignedTech)) && (
          <button className="btn-action btn-green" onClick={() => { setSelected(ot); setModal('cloturer') }}>
            <i className="ti ti-check" /> {t('interventions.actions.close')}
          </button>
        )}
        {ot.statut === 'terminee' && isAdmin && (
          <button className="btn-action btn-purple" onClick={() => { setSelected(ot); setModal('rouvrir') }}>
            <i className="ti ti-refresh" /> {t('interventions.actions.reopen')}
          </button>
        )}
        {['planifiee', 'assignee'].includes(ot.statut) && isAdmin && (
          <button className="btn-action btn-red" onClick={() => { setSelected(ot); setModal('annuler') }}>
            <i className="ti ti-x" /> {t('interventions.actions.cancel')}
          </button>
        )}
        <button className="btn-action btn-ghost" onClick={() => navigate(`/interventions/${ot.id}`)}>
          <i className="ti ti-eye" /> {t('interventions.actions.detail')}
        </button>
      </div>
    )
  }

  if (loading) return (
    <div className="interventions">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>{t('common.loading')}</p>
    </div>
  )

  if (erreurChargement) return (
    <div className="interventions">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{erreurChargement}</p>
    </div>
  )

  return (
    <div className="interventions">

      <div className="interventions-header">
        <div className="interventions-filters">
          <select value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1) }}>
            <option value="">{t('interventions.allStatuts')}</option>
            {Object.keys(STATUT_COLORS).map(k => (
              <option key={k} value={k}>{t(`interventions.statuts.${k}`)}</option>
            ))}
          </select>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">{t('interventions.allTypes')}</option>
            <option value="preventif">{t('interventions.types.preventif')}</option>
            <option value="curatif">{t('interventions.types.curatif')}</option>
          </select>
          <select value={filterPriorite} onChange={e => { setFilterPriorite(e.target.value); setPage(1) }}>
            <option value="">{t('interventions.allPriorites')}</option>
            {['basse','normale','haute','urgente'].map(p => (
              <option key={p} value={p}>{t(`interventions.priorites.${p}`)}</option>
            ))}
          </select>
          <select value={filterBatiment} onChange={e => { setFilterBatiment(e.target.value); setPage(1) }}>
            <option value="">{t('interventions.allBatimentsFilter')}</option>
            {batimentsNoms.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => { setModal('creer'); setErreurs([]) }}>
            <i className="ti ti-plus" /> {t('interventions.new')}
          </button>
        )}
      </div>

      <div className="interventions-layout">

        <div className="interventions-list">
          {paginated.length === 0 ? (
            <div className="empty">
              <i className="ti ti-clipboard-off" />
              <p>{t('interventions.empty')}</p>
            </div>
          ) : paginated.map(ot => (
            <div
              key={ot.id}
              className={`ot-card ${selected?.id === ot.id ? 'ot-card-active' : ''}`}
              onClick={() => setSelected(ot)}
            >
              <div className="ot-card-top">
                <span className="ot-type">
                  {ot.type === 'preventif' ? `🔧 ${t('interventions.types.preventif')}` : `🚨 ${t('interventions.types.curatif')}`}
                </span>
                <span className="badge" style={{ background: STATUT_COLORS[ot.statut]?.bg, color: STATUT_COLORS[ot.statut]?.color }}>
                  {t(`interventions.statuts.${ot.statut}`)}
                </span>
              </div>
              <p className="ot-titre">{ot.titre}</p>
              <p className="ot-meta">
                <i className="ti ti-building" /> {ot.batiment_nom} &nbsp;·&nbsp;
                <i className="ti ti-cpu" /> {ot.equipement_reference}
              </p>
              <div className="ot-card-bottom">
                <span className="badge-priorite" style={{ background: PRIORITE_COLORS[ot.priorite]?.bg, color: PRIORITE_COLORS[ot.priorite]?.color }}>
                  {t(`interventions.priorites.${ot.priorite}`)}
                </span>
                {ot.technicien_nom ? (
                  <span className="ot-tech"><i className="ti ti-user" /> {ot.technicien_nom}</span>
                ) : (
                  <span className="ot-tech-empty">{t('interventions.unassigned')}</span>
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

        {selected && (
          <div className="ot-detail">
            <div className="ot-detail-header">
              <h2>{selected.titre}</h2>
              <button className="btn-close" onClick={() => setSelected(null)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="detail-section">
              <h3><i className="ti ti-info-circle" /> {t('interventions.detail.info')}</h3>
              <div className="detail-grid">
                <div><span>{t('interventions.type')}</span><p>{t(`interventions.types.${selected.type}`)}</p></div>
                <div>
                  <span>{t('interventions.priorite')}</span>
                  <p>
                    <span className="badge" style={{ background: PRIORITE_COLORS[selected.priorite]?.bg, color: PRIORITE_COLORS[selected.priorite]?.color }}>
                      {t(`interventions.priorites.${selected.priorite}`)}
                    </span>
                  </p>
                </div>
                <div>
                  <span>{t('common.status')}</span>
                  <p>
                    <span className="badge" style={{ background: STATUT_COLORS[selected.statut]?.bg, color: STATUT_COLORS[selected.statut]?.color }}>
                      {t(`interventions.statuts.${selected.statut}`)}
                    </span>
                  </p>
                </div>
                <div><span>{t('interventions.datePlanifiee')}</span><p>{selected.date_planifiee ? new Date(selected.date_planifiee).toLocaleDateString() : '—'}</p></div>
                <div><span>{t('interventions.detail.startReal')}</span><p>{selected.date_debut_reelle ? new Date(selected.date_debut_reelle).toLocaleString() : '—'}</p></div>
                <div><span>{t('interventions.detail.endReal')}</span><p>{selected.date_fin_reelle ? new Date(selected.date_fin_reelle).toLocaleString() : '—'}</p></div>
                {selected.duree_reelle_minutes && (
                  <div><span>{t('interventions.detail.realDuration')}</span><p>{selected.duree_reelle_minutes} min</p></div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h3><i className="ti ti-building" /> {t('interventions.detail.equipBatiment')}</h3>
              <div className="detail-grid">
                <div><span>{t('interventions.equipement')}</span><p>{selected.equipement_nom}</p></div>
                <div><span>{t('interventions.detail.reference')}</span><p>{selected.equipement_reference}</p></div>
                <div><span>{t('interventions.batiment')}</span><p>{selected.batiment_nom}</p></div>
              </div>
            </div>

            <div className="detail-section">
              <h3><i className="ti ti-user" /> {t('interventions.technicien')}</h3>
              <p>{selected.technicien_nom || <span style={{ color: '#94a3b8' }}>{t('interventions.unassigned')}</span>}</p>
            </div>

            {selected.description && (
              <div className="detail-section">
                <h3><i className="ti ti-file-text" /> {t('interventions.description')}</h3>
                <p>{selected.description}</p>
              </div>
            )}

            {selected.commentaire_cloture && (
              <div className="detail-section">
                <h3><i className="ti ti-message" /> {t('interventions.detail.closureComment')}</h3>
                <p>{selected.commentaire_cloture}</p>
              </div>
            )}

            {selected.reouvertures?.length > 0 && (
              <div className="detail-section">
                <h3><i className="ti ti-history" /> {t('interventions.detail.reopenings')} ({selected.reouvertures.length})</h3>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>{t('interventions.detail.date')}</th>
                      <th>{t('interventions.detail.author')}</th>
                      <th>{t('interventions.detail.prevStatus')}</th>
                      <th>{t('interventions.detail.reason')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.reouvertures.map(r => (
                      <tr key={r.id}>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td>{r.auteur || r.user?.nom}</td>
                        <td>
                          <span className="badge" style={{ background: STATUT_COLORS[r.statut_precedent]?.bg, color: STATUT_COLORS[r.statut_precedent]?.color }}>
                            {t(`interventions.statuts.${r.statut_precedent}`)}
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
                <button
                  className="btn-rapport"
                  onClick={async () => {
                    const token = localStorage.getItem('echomaint_token')
                    try {
                      const response = await fetch(getRapportUrl(selected.id), {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      if (!response.ok) throw new Error('download error')
                      const blob = await response.blob()
                      const url  = URL.createObjectURL(blob)
                      const a    = document.createElement('a')
                      a.href     = url
                      a.download = `rapport_OT_${selected.id}.pdf`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    } catch {
                      alert(t('interventions.errors.reportError'))
                    }
                  }}
                >
                  <i className="ti ti-file-type-pdf" /> {t('interventions.detail.downloadPdf')}
                </button>
              </div>
            )}

            <div className="detail-actions">
              {renderActions(selected)}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={fermerModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            {modal === 'assigner' && (
              <>
                <div className="modal-header">
                  <h2>{t('interventions.modal.assignTitle')}</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('interventions.technicien')}</label>
                    <select value={formAssigner.technicien_id} onChange={e => setFormAssigner({ technicien_id: e.target.value })}>
                      <option value="">{t('interventions.modal.selectTech')}</option>
                      {techniciens.map(tc => (
                        <option key={tc.id} value={tc.id}>{tc.prenom} {tc.nom}</option>
                      ))}
                    </select>
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>{t('common.cancel')}</button>
                  <button className="btn-primary" onClick={handleAssigner}>{t('interventions.actions.assign')}</button>
                </div>
              </>
            )}

            {modal === 'cloturer' && (
              <>
                <div className="modal-header">
                  <h2>{t('interventions.modal.closeTitle')}</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('interventions.modal.closureComment')} <span className="required">*</span></label>
                    <textarea
                      placeholder={t('interventions.modal.closureCommentPlaceholder')}
                      value={formCloturer.commentaire_cloture}
                      onChange={e => setFormCloturer(f => ({ ...f, commentaire_cloture: e.target.value }))}
                      rows={3}
                    />
                    <span className="char-count">{formCloturer.commentaire_cloture.length} / 10 min</span>
                  </div>
                  <div className="form-group">
                    <label>{t('interventions.modal.realDuration')} <span className="required">*</span></label>
                    <input
                      type="number" min="1" placeholder="Ex: 90"
                      value={formCloturer.duree_reelle_minutes}
                      onChange={e => setFormCloturer(f => ({ ...f, duree_reelle_minutes: e.target.value }))}
                    />
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>{t('common.cancel')}</button>
                  <button className="btn-primary" onClick={handleCloturer}>{t('interventions.actions.close')}</button>
                </div>
              </>
            )}

            {modal === 'rouvrir' && (
              <>
                <div className="modal-header">
                  <h2>{t('interventions.modal.reopenTitle')}</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="warning-box">
                    <i className="ti ti-alert-triangle" />
                    <p>{t('interventions.modal.reopenWarning')}</p>
                  </div>
                  <div className="form-group">
                    <label>{t('interventions.modal.reopenReason')} <span className="required">*</span></label>
                    <textarea
                      placeholder={t('interventions.modal.reopenReasonPlaceholder')}
                      value={formRouvrir.motif}
                      onChange={e => setFormRouvrir({ motif: e.target.value })}
                      rows={3}
                    />
                    <span className="char-count">{formRouvrir.motif.length} / 20 min</span>
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>{t('common.cancel')}</button>
                  <button className="btn-primary btn-danger-confirm" onClick={handleRouvrir}>{t('interventions.actions.reopen')}</button>
                </div>
              </>
            )}

            {modal === 'annuler' && (
              <>
                <div className="modal-header">
                  <h2>{t('interventions.modal.cancelTitle')}</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <p>{t('interventions.modal.cancelConfirm')} <strong>"{selected?.titre}"</strong> ? {t('interventions.modal.cancelIrreversible')}</p>
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>{t('interventions.modal.noKeep')}</button>
                  <button className="btn-primary btn-danger-confirm" onClick={handleAnnuler}>{t('interventions.modal.yesCancel')}</button>
                </div>
              </>
            )}

            {modal === 'creer' && (
              <>
                <div className="modal-header">
                  <h2>{t('interventions.newOT')}</h2>
                  <button onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('interventions.titre')} <span className="required">*</span></label>
                    <input
                      type="text" placeholder={t('interventions.titrePlaceholder')}
                      value={formCreer.titre}
                      onChange={e => setFormCreer(f => ({ ...f, titre: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('interventions.equipement')} <span className="required">*</span></label>
                    <select value={formCreer.equipement_id} onChange={e => setFormCreer(f => ({ ...f, equipement_id: e.target.value }))}>
                      <option value="">{t('interventions.modal.selectEquip')}</option>
                      {equipements.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.nom} ({eq.reference}) — {eq.batiment_nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('interventions.type')}</label>
                      <select value={formCreer.type} onChange={e => setFormCreer(f => ({ ...f, type: e.target.value }))}>
                        <option value="preventif">{t('interventions.types.preventif')}</option>
                        <option value="curatif">{t('interventions.types.curatif')}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('interventions.priorite')}</label>
                      <select value={formCreer.priorite} onChange={e => setFormCreer(f => ({ ...f, priorite: e.target.value }))}>
                        {['basse','normale','haute','urgente'].map(p => (
                          <option key={p} value={p}>{t(`interventions.priorites.${p}`)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{t('interventions.description')}</label>
                    <textarea
                      placeholder={t('interventions.descriptionPlaceholder')}
                      value={formCreer.description}
                      onChange={e => setFormCreer(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('interventions.datePlanifiee')} <span className="required">*</span></label>
                      <input
                        type="datetime-local"
                        value={formCreer.date_planifiee}
                        onChange={e => setFormCreer(f => ({ ...f, date_planifiee: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('interventions.modal.techOptional')}</label>
                      <select value={formCreer.technicien_id} onChange={e => setFormCreer(f => ({ ...f, technicien_id: e.target.value }))}>
                        <option value="">{t('interventions.unassigned')}</option>
                        {techniciens.map(tc => (
                          <option key={tc.id} value={tc.id}>{tc.prenom} {tc.nom}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {formCreer.type === 'curatif' && (
                    <div className="info-box">
                      <i className="ti ti-info-circle" />
                      <p>{t('interventions.modal.curatifInfo')}</p>
                    </div>
                  )}
                  {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>{t('common.cancel')}</button>
                  <button className="btn-primary" onClick={handleCreer}>{t('interventions.createOT')}</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
