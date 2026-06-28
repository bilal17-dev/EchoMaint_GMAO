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
import Pagination from '../components/Pagination'

const ITEMS_PER_PAGE = 8

export default function Interventions() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user    = JSON.parse(localStorage.getItem('echomaint_user') || '{}')
  const isAdmin = user.role === 'admin'
  const isTech  = user.role === 'technicien'

  const [interventions,      setInterventions]      = useState([])
  const [techniciens,        setTechniciens]        = useState([])
  const [equipements,        setEquipements]        = useState([])
  const [loading,            setLoading]            = useState(true)
  const [erreurChargement,   setErreurChargement]   = useState('')

  const [selected, setSelected] = useState(null)
  const [modal,    setModal]    = useState(null)
  const [erreurs,  setErreurs]  = useState([])

  const [filterStatut,   setFilterStatut]   = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterPriorite, setFilterPriorite] = useState('')
  const [filterBatiment, setFilterBatiment] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const [formAssigner, setFormAssigner] = useState({ technicien_id: '' })
  const [formCloturer, setFormCloturer] = useState({ commentaire_cloture: '', duree_reelle_minutes: '' })
  const [formRouvrir,  setFormRouvrir]  = useState({ motif: '' })
  const [formCreer,    setFormCreer]    = useState({
    titre: '', type: 'preventif', priorite: 'normale',
    description: '', date_planifiee: '', technicien_id: '', equipement_id: ''
  })

  const chargerDonnees = async () => {
    setLoading(true); setErreurChargement('')
    try {
      const promises = [getInterventions(), getBatiments(), getEquipements()]
      if (isAdmin) promises.push(getTechniciens())
      const results = await Promise.all(promises)
      const [resI, resB, resE, resT] = results
      const norm = r => Array.isArray(r) ? r : (r?.data ?? [])
      const fresh = norm(resI)
      setInterventions(fresh)
      setSelected(prev => prev ? (fresh.find(i => i.id === prev.id) ?? null) : null)
      if (isAdmin && resT) setTechniciens(norm(resT))
      setEquipements(norm(resE))
    } catch { setErreurChargement(t('interventions.errors.loadError')) }
    finally  { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { chargerDonnees() }, [])

  const filtered = interventions.filter(i => {
    if (filterStatut   && i.statut       !== filterStatut)   return false
    if (filterType     && i.type         !== filterType)     return false
    if (filterPriorite && i.priorite     !== filterPriorite) return false
    if (filterBatiment && i.batiment_nom !== filterBatiment) return false
    return true
  })

  const totalPages      = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated       = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const batimentsNoms   = [...new Set(interventions.map(i => i.batiment_nom).filter(Boolean))]
  const activeFilterCount = [filterStatut, filterType, filterPriorite, filterBatiment].filter(Boolean).length

  const fermerModal = () => { setModal(null); setErreurs([]) }

  const handleAssigner = async () => {
    if (!formAssigner.technicien_id) { setErreurs([t('interventions.errors.selectTech')]); return }
    try {
      await assigner(selected.id, formAssigner.technicien_id)
      fermerModal()
      setFormAssigner({ technicien_id: '' })
      await chargerDonnees()
      setPage(1)
    } catch (e) { setErreurs([e.response?.data?.message || t('interventions.errors.assignError')]) }
  }

  const handleDemarrer = async id => {
    try {
      await demarrer(id)
      await chargerDonnees()
    } catch (e) { window.alert(e.response?.data?.message || t('interventions.errors.startError')) }
  }

  const handleCloturer = async () => {
    const errs = []
    if (!formCloturer.commentaire_cloture || formCloturer.commentaire_cloture.length < 10)
      errs.push(t('interventions.errors.commentMin'))
    if (!formCloturer.duree_reelle_minutes || Number(formCloturer.duree_reelle_minutes) <= 0)
      errs.push(t('interventions.errors.durationPositive'))
    if (errs.length) { setErreurs(errs); return }
    try {
      await cloturer(selected.id, {
        commentaire_cloture: formCloturer.commentaire_cloture,
        duree_reelle_minutes: parseInt(formCloturer.duree_reelle_minutes),
        resolu: true
      })
      fermerModal()
      setFormCloturer({ commentaire_cloture: '', duree_reelle_minutes: '' })
      await chargerDonnees()
      setPage(1)
    } catch (e) { setErreurs([e.response?.data?.message || t('interventions.errors.closeError')]) }
  }

  const handleRouvrir = async () => {
    if (!formRouvrir.motif || formRouvrir.motif.length < 20) { setErreurs([t('interventions.errors.reasonMin')]); return }
    try {
      await rouvrir(selected.id, formRouvrir.motif)
      fermerModal()
      setFormRouvrir({ motif: '' })
      await chargerDonnees()
      setPage(1)
    } catch (e) { setErreurs([e.response?.data?.message || t('interventions.errors.reopenError')]) }
  }

  const handleAnnuler = async () => {
    try {
      await annuler(selected.id)
      fermerModal()
      await chargerDonnees()
      setPage(1)
    } catch (e) { window.alert(e.response?.data?.message || t('interventions.errors.cancelError')) }
  }

  const handleCreer = async () => {
    const errs = []
    if (!formCreer.titre)          errs.push(t('interventions.errors.titleRequired'))
    if (!formCreer.date_planifiee) errs.push(t('interventions.errors.dateRequired'))
    if (!formCreer.equipement_id)  errs.push(t('interventions.errors.equipRequired'))
    if (errs.length) { setErreurs(errs); return }
    try {
      await createIntervention(formCreer)
      fermerModal()
      setFormCreer({ titre: '', type: 'preventif', priorite: 'normale', description: '', date_planifiee: '', technicien_id: '', equipement_id: '' })
      await chargerDonnees()
      setPage(1)
    } catch (e) { setErreurs([e.response?.data?.message || t('interventions.errors.createError')]) }
  }

  const fmtDate = v => v ? new Date(v).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
  const fmtDT   = v => v ? new Date(v).toLocaleString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
  const fmtShort= v => v ? new Date(v).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' }) : '—'

  const renderPanelActions = ot => {
    const isAssignedTech = user.id === ot.technicien_id
    return (
      <div className="iv-action-btns">
        {ot.statut === 'planifiee' && isAdmin && (
          <button className="btn-primary" onClick={() => { setSelected(ot); setModal('assigner') }}>
            <i className="ti ti-user-plus" /> {t('interventions.actions.assign')}
          </button>
        )}
        {ot.statut === 'assignee' && (isAdmin || (isTech && isAssignedTech)) && (
          <button className="btn-success" onClick={() => handleDemarrer(ot.id)}>
            <i className="ti ti-player-play" /> {t('interventions.actions.start')}
          </button>
        )}
        {ot.statut === 'en_cours' && (isAdmin || (isTech && isAssignedTech)) && (
          <button className="btn-success" onClick={() => { setSelected(ot); setModal('cloturer') }}>
            <i className="ti ti-check" /> {t('interventions.actions.close')}
          </button>
        )}
        {ot.statut === 'terminee' && isAdmin && (
          <button className="btn-secondary" onClick={() => { setSelected(ot); setModal('rouvrir') }}>
            <i className="ti ti-refresh" /> {t('interventions.actions.reopen')}
          </button>
        )}
        {['planifiee', 'assignee'].includes(ot.statut) && isAdmin && (
          <button className="btn-danger" onClick={() => { setSelected(ot); setModal('annuler') }}>
            <i className="ti ti-x" /> {t('interventions.actions.cancel')}
          </button>
        )}
      </div>
    )
  }

  if (loading)          return <div className="interventions"><p className="page-loading"><i className="ti ti-loader-2 spin" /> {t('common.loading')}</p></div>
  if (erreurChargement) return <div className="interventions"><p className="page-error">{erreurChargement}</p></div>

  return (
    <div className={`interventions ${selected ? 'iv-has-detail' : ''}`}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t('layout.interventions.title')}</h1>
          <p className="page-subtitle">{t('layout.interventions.subtitle')}</p>
        </div>
        <div className="page-header-actions">
          {isAdmin && (
            <button className="btn-primary btn-add-list" onClick={() => { setModal('creer'); setErreurs([]) }}>
              <i className="ti ti-plus" /> {t('interventions.new')}
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="iv-toolbar">
        <div className="iv-toolbar-top">
          <p className="iv-count">{t('interventions.count', { count: filtered.length })}</p>
          <button
            className={`btn-filter-mobile${activeFilterCount > 0 ? ' has-active' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <i className="ti ti-filter" />
            {t('common.filters')}
            {activeFilterCount > 0 && <span className="filter-mobile-badge">{activeFilterCount}</span>}
          </button>
        </div>
        <div className={`iv-filters${showFilters ? ' is-open' : ''}`}>
          <select className="filter-select" value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1) }}>
            <option value="">{t('interventions.allStatuts')}</option>
            {['planifiee','assignee','en_cours','terminee','annulee'].map(k => (
              <option key={k} value={k}>{t(`interventions.statuts.${k}`)}</option>
            ))}
          </select>
          <select className="filter-select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">{t('interventions.allTypes')}</option>
            <option value="preventif">{t('interventions.types.preventif')}</option>
            <option value="curatif">{t('interventions.types.curatif')}</option>
          </select>
          <select className="filter-select" value={filterPriorite} onChange={e => { setFilterPriorite(e.target.value); setPage(1) }}>
            <option value="">{t('interventions.allPriorites')}</option>
            {['basse','normale','haute','urgente'].map(p => (
              <option key={p} value={p}>{t(`interventions.priorites.${p}`)}</option>
            ))}
          </select>
          <select className="filter-select" value={filterBatiment} onChange={e => { setFilterBatiment(e.target.value); setPage(1) }}>
            <option value="">{t('interventions.allBatimentsFilter')}</option>
            {batimentsNoms.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* ── Workspace ───────────────────────────────────────────────────── */}
      <div className="iv-workspace">

        {/* List */}
        <div className="iv-list">
          {paginated.length === 0 ? (
            <div className="page-empty">
              <i className="ti ti-clipboard-off" />
              <h3>{t('interventions.emptyTitle')}</h3>
              <p>{t('interventions.empty')}</p>
            </div>
          ) : paginated.map((ot, idx) => (
            <div
              key={ot.id}
              className={`iv-row ${selected?.id === ot.id ? 'iv-row--active' : ''}`}
              data-priorite={ot.priorite}
              data-statut={ot.statut}
              style={{ animationDelay: `${idx * 0.03}s` }}
              onClick={() => setSelected(selected?.id === ot.id ? null : ot)}
            >
              {/* Type icon */}
              <div className="iv-row-type-icon" data-type={ot.type}>
                <i className={`ti ${ot.type === 'preventif' ? 'ti-tool' : 'ti-alert-triangle'}`} />
              </div>

              {/* Body */}
              <div className="iv-row-body">
                <p className="iv-row-title">{ot.titre}</p>
                <p className="iv-row-meta">
                  <i className="ti ti-building" />
                  {ot.batiment_nom}
                  <span className="iv-dot">·</span>
                  <i className="ti ti-cpu" />
                  {ot.equipement_nom || ot.equipement_reference}
                </p>
              </div>

              {/* Badges */}
              <div className="iv-row-badges">
                <span className={`badge badge-${ot.statut}`}>{t(`interventions.statuts.${ot.statut}`)}</span>
                <span className={`badge badge-${ot.priorite}`}>{t(`interventions.priorites.${ot.priorite}`)}</span>
              </div>

              {/* Technicien */}
              <div className="iv-row-tech">
                {ot.technicien_nom
                  ? <span className="iv-tech"><i className="ti ti-user-circle" />{ot.technicien_nom}</span>
                  : <span className="iv-tech-none">—</span>
                }
              </div>

              {/* Date */}
              <div className="iv-row-date">{fmtShort(ot.date_planifiee)}</div>

              {/* Chevron */}
              <div className="iv-row-chevron"><i className="ti ti-chevron-right" /></div>
            </div>
          ))}

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} total={filtered.length} itemsPerPage={ITEMS_PER_PAGE} onChange={setPage} />
        </div>

        {/* ── Detail Panel ──────────────────────────────────────────────── */}
        {selected && (
          <div className="iv-detail">

            {/* Hero */}
            <div className="iv-detail-hero" data-statut={selected.statut}>
              <div className="iv-detail-hero-top">
                <span className="iv-detail-type-pill" data-type={selected.type}>
                  <i className={`ti ${selected.type === 'preventif' ? 'ti-tool' : 'ti-alert-triangle'}`} />
                  {t(`interventions.types.${selected.type}`)}
                </span>
                <button className="iv-detail-close" onClick={() => setSelected(null)}>
                  <i className="ti ti-x" />
                </button>
              </div>
              <h2 className="iv-detail-title">{selected.titre}</h2>
              <div className="iv-detail-where">
                <span><i className="ti ti-building" /> {selected.batiment_nom}</span>
                <span className="iv-sep">·</span>
                <span><i className="ti ti-cpu" /> {selected.equipement_nom}</span>
              </div>
              <div className="iv-detail-hero-badges">
                <span className={`badge badge-${selected.statut}`}>{t(`interventions.statuts.${selected.statut}`)}</span>
                <span className={`badge badge-${selected.priorite}`}>{t(`interventions.priorites.${selected.priorite}`)}</span>
              </div>
            </div>

            {/* Body */}
            <div className="iv-detail-body">

              {/* Technicien */}
              <div className="iv-detail-section">
                <p className="iv-section-label"><i className="ti ti-user" /> {t('interventions.technicien')}</p>
                {selected.technicien_nom ? (
                  <div className="iv-tech-card">
                    <div className="iv-tech-avatar">
                      {selected.technicien_nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="iv-tech-info">
                      <p className="iv-tech-name">{selected.technicien_nom}</p>
                      <p className="iv-tech-role">{t('detail.technicien')}</p>
                    </div>
                  </div>
                ) : (
                  <p className="iv-no-tech"><i className="ti ti-user-off" /> {t('interventions.unassigned')}</p>
                )}
              </div>

              {/* Dates */}
              <div className="iv-detail-section">
                <p className="iv-section-label"><i className="ti ti-calendar" /> {t('interventions.sectionDates')}</p>
                <div className="iv-dates-grid">
                  <div className="iv-date-item">
                    <span className="iv-date-label">{t('interventions.detail.planned')}</span>
                    <span className="iv-date-val">{fmtDate(selected.date_planifiee)}</span>
                  </div>
                  <div className="iv-date-item">
                    <span className="iv-date-label">{t('interventions.detail.startReal')}</span>
                    <span className="iv-date-val">{fmtDT(selected.date_debut_reelle)}</span>
                  </div>
                  <div className="iv-date-item">
                    <span className="iv-date-label">{t('interventions.detail.endReal')}</span>
                    <span className="iv-date-val">{fmtDT(selected.date_fin_reelle)}</span>
                  </div>
                  {selected.duree_reelle_minutes && (
                    <div className="iv-date-item">
                      <span className="iv-date-label">{t('interventions.detail.realDuration')}</span>
                      <span className="iv-date-val">{selected.duree_reelle_minutes} {t('detail.min')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selected.description && (
                <div className="iv-detail-section">
                  <p className="iv-section-label"><i className="ti ti-file-text" /> {t('interventions.description')}</p>
                  <p className="iv-desc-text">{selected.description}</p>
                </div>
              )}

              {/* Rapport de clôture */}
              {selected.commentaire_cloture && (
                <div className="iv-detail-section">
                  <p className="iv-section-label"><i className="ti ti-check-circle" /> {t('interventions.rapportCloture')}</p>
                  <div className="iv-cloture-box">
                    <p>{selected.commentaire_cloture}</p>
                  </div>
                </div>
              )}

              {/* Réouvertures */}
              {selected.reouvertures?.length > 0 && (
                <div className="iv-detail-section">
                  <p className="iv-section-label">
                    <i className="ti ti-history" /> {t('interventions.sectionReouvertures')} ({selected.reouvertures.length})
                  </p>
                  <div className="iv-reouv-list">
                    {selected.reouvertures.map(r => (
                      <div key={r.id} className="iv-reouv-item">
                        <span className="iv-reouv-date">{fmtDate(r.created_at)}</span>
                        <p className="iv-reouv-motif">{r.motif}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="iv-detail-section iv-detail-actions-wrap">
                {renderPanelActions(selected)}
                <div className="iv-detail-links">
                  <button className="iv-link-btn" onClick={() => navigate(`/interventions/${selected.id}`)}>
                    <i className="ti ti-external-link" /> {t('interventions.voirFicheComplete')}
                  </button>
                  {selected.statut === 'terminee' && selected.rapport_pdf_chemin && (
                    <button
                      className="iv-pdf-btn"
                      onClick={async () => {
                        const token = localStorage.getItem('echomaint_token')
                        try {
                          const response = await fetch(getRapportUrl(selected.id), { headers: { Authorization: `Bearer ${token}` } })
                          if (!response.ok) throw new Error()
                          const blob = await response.blob()
                          const url  = URL.createObjectURL(blob)
                          const a    = document.createElement('a')
                          a.href = url; a.download = `rapport_OT_${selected.id}.pdf`
                          document.body.appendChild(a); a.click()
                          document.body.removeChild(a); URL.revokeObjectURL(url)
                        } catch { alert(t('interventions.errors.reportError')) }
                      }}
                    >
                      <i className="ti ti-file-type-pdf" /> {t('interventions.detail.downloadPdf')}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={fermerModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>

            {modal === 'assigner' && (
              <>
                <div className="modal-header">
                  <h2>{t('interventions.modal.assignTitle')}</h2>
                  <button className="modal-close-btn" onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-form">
                  <div className="form-group">
                    <label>{t('interventions.technicien')}</label>
                    <select value={formAssigner.technicien_id} onChange={e => setFormAssigner({ technicien_id: e.target.value })}>
                      <option value="">{t('interventions.modal.selectTech')}</option>
                      {techniciens.map(tc => <option key={tc.id} value={tc.id}>{tc.prenom} {tc.nom}</option>)}
                    </select>
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="iv-erreur">{e}</p>)}
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
                  <button className="modal-close-btn" onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-form">
                  <div className="form-group">
                    <label>{t('interventions.modal.closureComment')} <span className="iv-required">*</span></label>
                    <textarea
                      placeholder={t('interventions.modal.closureCommentPlaceholder')}
                      value={formCloturer.commentaire_cloture}
                      onChange={e => setFormCloturer(f => ({ ...f, commentaire_cloture: e.target.value }))}
                      rows={3}
                    />
                    <span className="iv-char-count">{formCloturer.commentaire_cloture.length} / 10 min</span>
                  </div>
                  <div className="form-group">
                    <label>{t('interventions.modal.realDuration')} <span className="iv-required">*</span></label>
                    <input
                      type="number" min="1" placeholder="Ex: 90"
                      value={formCloturer.duree_reelle_minutes}
                      onChange={e => setFormCloturer(f => ({ ...f, duree_reelle_minutes: e.target.value }))}
                    />
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="iv-erreur">{e}</p>)}
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
                  <button className="modal-close-btn" onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-form">
                  <div className="warning-box">
                    <i className="ti ti-alert-triangle" />
                    <p>{t('interventions.modal.reopenWarning')}</p>
                  </div>
                  <div className="form-group">
                    <label>{t('interventions.modal.reopenReason')} <span className="iv-required">*</span></label>
                    <textarea
                      placeholder={t('interventions.modal.reopenReasonPlaceholder')}
                      value={formRouvrir.motif}
                      onChange={e => setFormRouvrir({ motif: e.target.value })}
                      rows={3}
                    />
                    <span className="iv-char-count">{formRouvrir.motif.length} / 20 min</span>
                  </div>
                  {erreurs.map((e, i) => <p key={i} className="iv-erreur">{e}</p>)}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>{t('common.cancel')}</button>
                  <button className="btn-primary iv-btn-danger-confirm" onClick={handleRouvrir}>{t('interventions.actions.reopen')}</button>
                </div>
              </>
            )}

            {modal === 'annuler' && (
              <>
                <div className="modal-header">
                  <h2>{t('interventions.modal.cancelTitle')}</h2>
                  <button className="modal-close-btn" onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-form">
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {t('interventions.modal.cancelConfirm')} <strong>"{selected?.titre}"</strong> ? {t('interventions.modal.cancelIrreversible')}
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={fermerModal}>{t('interventions.modal.noKeep')}</button>
                  <button className="btn-primary iv-btn-danger-confirm" onClick={handleAnnuler}>{t('interventions.modal.yesCancel')}</button>
                </div>
              </>
            )}

            {modal === 'creer' && (
              <>
                <div className="modal-header">
                  <h2>{t('interventions.newOT')}</h2>
                  <button className="modal-close-btn" onClick={fermerModal}><i className="ti ti-x" /></button>
                </div>
                <div className="modal-form">
                  <div className="form-group">
                    <label>{t('interventions.titre')} <span className="iv-required">*</span></label>
                    <input
                      type="text" placeholder={t('interventions.titrePlaceholder')}
                      value={formCreer.titre}
                      onChange={e => setFormCreer(f => ({ ...f, titre: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('interventions.equipement')} <span className="iv-required">*</span></label>
                    <select value={formCreer.equipement_id} onChange={e => setFormCreer(f => ({ ...f, equipement_id: e.target.value }))}>
                      <option value="">{t('interventions.modal.selectEquip')}</option>
                      {equipements.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.nom} ({eq.reference}) — {eq.batiment_nom}</option>
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
                      <label>{t('interventions.datePlanifiee')} <span className="iv-required">*</span></label>
                      <input
                        type="datetime-local"
                        value={formCreer.date_planifiee}
                        onChange={e => setFormCreer(f => ({ ...f, date_planifiee: e.target.value }))}
                      />
                    </div>
                    {isAdmin && (
                      <div className="form-group">
                        <label>{t('interventions.modal.techOptional')}</label>
                        <select value={formCreer.technicien_id} onChange={e => setFormCreer(f => ({ ...f, technicien_id: e.target.value }))}>
                          <option value="">{t('interventions.unassigned')}</option>
                          {techniciens.map(tc => <option key={tc.id} value={tc.id}>{tc.prenom} {tc.nom}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  {formCreer.type === 'curatif' && (
                    <div className="info-box">
                      <i className="ti ti-info-circle" />
                      <p>{t('interventions.modal.curatifInfo')}</p>
                    </div>
                  )}
                  {erreurs.map((e, i) => <p key={i} className="iv-erreur">{e}</p>)}
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
