import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './DemandesIntervention.css'
import { getDemandes, convertirDemande, creerDemande, rejeterDemande } from '../api/demandes.api'
import { getEquipements } from '../api/equipements.api'
import Pagination from '../components/Pagination'

const PRIORITES_CLASS = {
  basse:   'prio-basse',
  normale: 'prio-normale',
  haute:   'prio-haute',
  urgente: 'prio-urgente',
}

const STATUTS_CLASS = {
  ouverte: 'statut-ouverte',
  traitee: 'statut-traitee',
  rejetee: 'statut-rejetee',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getUserConnecte() {
  try {
    const raw = localStorage.getItem('echomaint_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const emptyForm = { equipement_id: '', titre: '', description: '', priorite: 'normale' }
const ITEMS_PER_PAGE = 8

export default function DemandesIntervention() {
  const { t } = useTranslation()
  const userConnecte = getUserConnecte()
  const role = userConnecte?.role || 'client'

  const [demandes, setDemandes]         = useState([])
  const [equipements, setEquipements]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [erreur, setErreur]             = useState('')
  const [search, setSearch]             = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [page, setPage]                 = useState(1)

  const [modalCreer, setModalCreer]     = useState(false)
  const [form, setForm]                 = useState(emptyForm)
  const [formErreurs, setFormErreurs]   = useState([])
  const [submitting, setSubmitting]     = useState(false)

  const [modalRejet, setModalRejet]     = useState(null)
  const [motifRejet, setMotifRejet]     = useState('')
  const [rejetErreur, setRejetErreur]   = useState('')

  const [detailDI, setDetailDI]         = useState(null)

  const chargerDemandes = async () => {
    setLoading(true)
    setErreur('')
    try {
      const res = await getDemandes()
      setDemandes(res.data || [])
    } catch {
      setErreur(t('di.loadError'))
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = demandes.filter(d => {
    const matchSearch =
      (d.titre || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.equipement_nom || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.client_nom || '').toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut ? d.statut === filterStatut : true
    return matchSearch && matchStatut
  })

  // Reset page quand le filtre change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, [search, filterStatut])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleSoumettre = async () => {
    const errs = []
    if (!form.equipement_id)      errs.push(t('di.errors.equipement'))
    if (!form.titre.trim())       errs.push(t('di.errors.titre'))
    if (!form.description.trim()) errs.push(t('di.errors.description'))
    if (errs.length) { setFormErreurs(errs); return }

    setSubmitting(true)
    setFormErreurs([])
    try {
      await creerDemande(form)
      setModalCreer(false)
      setForm(emptyForm)
      await chargerDemandes()
      setPage(1)
    } catch (error) {
      setFormErreurs([error.response?.data?.message || t('common.error')])
    } finally {
      setSubmitting(false)
    }
  }

  const handleConvertir = async (id) => {
    if (!window.confirm(t('di.takenCare'))) return
    try {
      await convertirDemande(id)
      await chargerDemandes()
      setPage(1)
    } catch (error) {
      window.alert(error.response?.data?.message || t('common.error'))
    }
  }

  const ouvrirModalRejet = (id) => {
    setModalRejet(id)
    setMotifRejet('')
    setRejetErreur('')
  }

  const handleRejeter = async () => {
    if (motifRejet.trim().length < 10) {
      setRejetErreur(t('di.errors.motifMin'))
      return
    }
    try {
      await rejeterDemande(modalRejet, motifRejet.trim())
      setModalRejet(null)
      await chargerDemandes()
      setPage(1)
    } catch (error) {
      setRejetErreur(error.response?.data?.message || t('di.rejetErreur'))
    }
  }

  if (loading) return (
    <div className="demandes">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>{t('di.loading')}</p>
    </div>
  )

  if (erreur) return (
    <div className="demandes">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{erreur}</p>
    </div>
  )

  return (
    <div className="demandes">

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('layout.demandes.title')}</h1>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: '3px' }}>{t('layout.demandes.subtitle')}</p>
        </div>
      </div>

      {/* Header */}
      <div className="demandes-header">
        <div className="demandes-filters">
          <div className="search-box">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder={t('di.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">{t('interventions.allStatuts')}</option>
            <option value="ouverte">{t('di.statuts.ouvertePlural')}</option>
            <option value="traitee">{t('di.statuts.traiteePlural')}</option>
            <option value="rejetee">{t('di.statuts.rejeteePlural')}</option>
          </select>
        </div>

        {role === 'client' && (
          <button className="btn-primary btn-add-list" onClick={() => setModalCreer(true)}>
            <i className="ti ti-plus" /> {t('di.new')}
          </button>
        )}
      </div>

      {/* Tableau professionnel */}
      {filtered.length === 0 ? (
        <div className="demandes-empty">
          <i className="ti ti-clipboard-off" />
          <p>{t('di.empty')}</p>
        </div>
      ) : (
        <>
          <div className="di-table-wrap">
            <table className="di-table">
              <thead>
                <tr>
                  <th className="di-th">{t('di.table.titre')}</th>
                  {role === 'admin' && <th className="di-th">{t('di.table.demandeur')}</th>}
                  <th className="di-th">{t('di.table.equipement')}</th>
                  <th className="di-th">{t('di.table.date')}</th>
                  <th className="di-th">{t('di.table.heure')}</th>
                  <th className="di-th di-th-priorite">{t('di.table.priorite')}</th>
                  <th className="di-th">{t('di.table.statut')}</th>
                  <th className="di-th di-th-actions">{t('di.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(d => (
                  <tr
                    key={d.id}
                    className="di-row di-row--clickable"
                    data-prio={d.priorite}
                    onClick={() => setDetailDI(d)}
                  >
                    <td className="di-td di-td-titre">
                      <span className="di-titre">{d.titre}</span>
                      {d.description && (
                        <span className="di-desc-truncate">{d.description}</span>
                      )}
                    </td>
                    {role === 'admin' && (
                      <td className="di-td di-td-demandeur">{d.client_nom || '—'}</td>
                    )}
                    <td className="di-td di-td-equip">
                      <span className="di-equip-name">
                        <i className="ti ti-cpu" /> {d.equipement_nom || '—'}
                      </span>
                    </td>
                    <td className="di-td di-td-date">{formatDate(d.created_at)}</td>
                    <td className="di-td di-td-time">{formatTime(d.created_at)}</td>
                    <td className="di-td di-td-priorite">
                      <span className={`prio-badge ${PRIORITES_CLASS[d.priorite] || ''}`}>
                        {t(`interventions.priorites.${d.priorite}`)}
                      </span>
                    </td>
                    <td className="di-td">
                      <span className={`statut-badge-di ${STATUTS_CLASS[d.statut] || ''}`}>
                        {t(`di.statuts.${d.statut}`)}
                      </span>
                    </td>
                    <td className="di-td di-td-actions" onClick={e => e.stopPropagation()}>
                      {role === 'admin' && d.statut === 'ouverte' && (
                        <div className="di-row-actions">
                          <button
                            className="di-action-btn di-action-btn--danger"
                            onClick={() => ouvrirModalRejet(d.id)}
                            title={t('di.reject')}
                          >
                            <i className="ti ti-x" />
                          </button>
                          <button
                            className="di-action-btn di-action-btn--primary"
                            onClick={() => handleConvertir(d.id)}
                            title={t('di.convert')}
                          >
                            <i className="ti ti-transform" />
                          </button>
                        </div>
                      )}
                      {role === 'client' && d.statut === 'traitee' && (
                        <span className="di-status-badge di-status-badge--ok">
                          <i className="ti ti-check" /> {t('di.takenCare')}
                        </span>
                      )}
                      {role === 'client' && d.statut === 'rejetee' && (
                        <span className="di-status-badge di-status-badge--ko">
                          <i className="ti ti-alert-circle" /> {t('di.statuts.rejetee')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} total={filtered.length} itemsPerPage={ITEMS_PER_PAGE} onChange={setPage} />
        </>
      )}

      {/* Modal création DI — CLIENT */}
      {modalCreer && (
        <div className="modal-overlay" onClick={() => setModalCreer(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('di.newModalTitle')}</h2>
              <button className="modal-close-btn" onClick={() => setModalCreer(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t('di.equipement')} <span className="required">*</span></label>
                <select value={form.equipement_id} onChange={e => setForm(f => ({ ...f, equipement_id: e.target.value }))}>
                  <option value="">{t('di.selectEquipement')}</option>
                  {equipements.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nom} — {eq.batiment_nom}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('interventions.titre')} <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder={t('interventions.titrePlaceholder')}
                  value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>{t('interventions.description')} <span className="required">*</span></label>
                <textarea
                  placeholder={t('interventions.descriptionPlaceholder')}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>{t('interventions.priorite')}</label>
                <select value={form.priorite} onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))}>
                  {['basse', 'normale', 'haute', 'urgente'].map(p => (
                    <option key={p} value={p}>{t(`interventions.priorites.${p}`)}</option>
                  ))}
                </select>
              </div>
              {formErreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModalCreer(false)}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleSoumettre} disabled={submitting}>
                {submitting ? t('di.submitting') : t('di.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail DI — ADMIN & CLIENT */}
      {detailDI && (
        <div className="modal-overlay" onClick={() => setDetailDI(null)}>
          <div className="modal modal-lg di-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="di-detail-header-left">
                <span className={`prio-badge ${PRIORITES_CLASS[detailDI.priorite] || ''}`}>
                  {t(`interventions.priorites.${detailDI.priorite}`)}
                </span>
                <h2 className="di-detail-title">{detailDI.titre}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setDetailDI(null)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="modal-body">
              {/* Statut */}
              <div className="di-detail-statut-row">
                <span className={`statut-badge-di ${STATUTS_CLASS[detailDI.statut] || ''}`}>
                  {t(`di.statuts.${detailDI.statut}`)}
                </span>
                <span className="di-detail-date">
                  <i className="ti ti-calendar" /> {formatDate(detailDI.created_at)} — {formatTime(detailDI.created_at)}
                </span>
              </div>

              {/* Métadonnées */}
              <div className="di-detail-meta-grid">
                <div className="di-detail-meta-item">
                  <span className="di-detail-meta-label"><i className="ti ti-cpu" /> {t('di.equipement')}</span>
                  <strong>{detailDI.equipement_nom || '—'}</strong>
                  {detailDI.equipement_reference && (
                    <span className="di-detail-meta-sub">{t('equipements.ref')} {detailDI.equipement_reference}</span>
                  )}
                </div>
                {detailDI.batiment_nom && (
                  <div className="di-detail-meta-item">
                    <span className="di-detail-meta-label"><i className="ti ti-building" /> {t('batiments.title')}</span>
                    <strong>{detailDI.batiment_nom}</strong>
                  </div>
                )}
                {role === 'admin' && detailDI.client_nom && (
                  <div className="di-detail-meta-item">
                    <span className="di-detail-meta-label"><i className="ti ti-user" /> {t('batiments.client')}</span>
                    <strong>{detailDI.client_nom}</strong>
                  </div>
                )}
              </div>

              {/* Description complète */}
              <div className="di-detail-section">
                <p className="di-detail-section-label">{t('interventions.description')}</p>
                <p className="di-detail-desc">{detailDI.description || '—'}</p>
              </div>

              {/* Motif de rejet — visible admin ET client */}
              {detailDI.statut === 'rejetee' && detailDI.motif_rejet && (
                <div className="di-detail-rejet-box">
                  <div className="di-detail-rejet-header">
                    <i className="ti ti-alert-circle" />
                    <strong>{t('di.motifRejet')}</strong>
                  </div>
                  <p className="di-detail-rejet-text">{detailDI.motif_rejet}</p>
                </div>
              )}
            </div>

            {/* Actions admin depuis le modal */}
            {role === 'admin' && detailDI.statut === 'ouverte' && (
              <div className="modal-footer">
                <button
                  className="di-modal-action-btn di-modal-action-btn--danger"
                  onClick={() => { setDetailDI(null); ouvrirModalRejet(detailDI.id) }}
                >
                  <i className="ti ti-x" /> {t('di.reject')}
                </button>
                <button
                  className="di-modal-action-btn di-modal-action-btn--primary"
                  onClick={() => { setDetailDI(null); handleConvertir(detailDI.id) }}
                >
                  <i className="ti ti-transform" /> {t('di.convert')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal rejet — ADMIN */}
      {modalRejet && (
        <div className="modal-overlay" onClick={() => setModalRejet(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('di.rejectTitle')}</h2>
              <button className="modal-close-btn" onClick={() => setModalRejet(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t('di.motifRejet')} <span className="required">*</span></label>
                <textarea
                  placeholder={t('di.motifRejetPlaceholder')}
                  value={motifRejet}
                  onChange={e => setMotifRejet(e.target.value)}
                  rows={4}
                />
              </div>
              {rejetErreur && <p className="erreur">{rejetErreur}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModalRejet(null)}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleRejeter}>{t('di.confirmRejet')}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
