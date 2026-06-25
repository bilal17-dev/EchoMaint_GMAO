import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './MaintenancePlans.css'
import { useAuth } from '../hooks/useAuth'
import { getPlans, createPlan, updatePlan, deletePlan } from '../api/plans.api'
import { getEquipements } from '../api/equipements.api'

const PERIODICITE_OPTIONS = [
  { tKey: 'monthly',   value: 30  },
  { tKey: 'quarterly', value: 90  },
  { tKey: 'biannual',  value: 180 },
  { tKey: 'annual',    value: 365 },
  { tKey: 'custom',    value: 0   },
]

const ITEMS_PER_PAGE = 5

const emptyForm = {
  equipement_id:      '',
  label:              '',
  periodicite_custom: '',
  gamme_taches:       [{ ordre: 1, libelle: '', obligatoire: true }],
  actif:              true,
}

const MOCK_PLANS = [
  {
    id: 'mock-pm1',
    equipement_id: '',
    label: 'Entretien trimestriel ascenseurs',
    periodicite_jours: 90,
    gamme_taches: [
      { ordre: 1, libelle: 'Vérifier la pression',  obligatoire: true  },
      { ordre: 2, libelle: 'Nettoyer les filtres',   obligatoire: true  },
      { ordre: 3, libelle: 'Tester les alarmes',     obligatoire: false },
    ],
    actif: true,
    derniere_generation: null,
    _isMock: true,
  },
]

const parseTaches = (raw) => {
  if (!raw) return [{ ordre: 1, libelle: '', obligatoire: true }]
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [{ ordre: 1, libelle: '', obligatoire: true }] }
}

const detecterModePeriodicite = (jours) => {
  const preset = PERIODICITE_OPTIONS.find(o => o.value === jours && o.value !== 0)
  return preset ? preset.value : 0
}

export default function MaintenancePlans() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [plans,             setPlans]             = useState([])
  const [equipements,       setEquipements]       = useState([])
  const [loading,           setLoading]           = useState(true)
  const [backendDispo,      setBackendDispo]      = useState(true)
  const [page,              setPage]              = useState(1)

  const [showModal,         setShowModal]         = useState(false)
  const [editingPlan,       setEditingPlan]       = useState(null)
  const [form,              setForm]              = useState(emptyForm)
  const [submitErr,         setSubmitErr]         = useState('')
  const [periodiciteMode,   setPeriodiciteMode]   = useState(30)
  const [submitting,        setSubmitting]        = useState(false)

  const [confirmDeletePlan, setConfirmDeletePlan] = useState(null)

  const charger = async () => {
    setLoading(true)
    try {
      const [resPlans, resEquip] = await Promise.all([getPlans(), getEquipements()])
      setPlans(Array.isArray(resPlans) ? resPlans : (resPlans?.data  ?? []))
      setEquipements(Array.isArray(resEquip) ? resEquip : (resEquip?.data  ?? []))
      setBackendDispo(true)
    } catch {
      console.warn('[Plans] Backend non disponible, mock activé.')
      setBackendDispo(false)
      setPlans(MOCK_PLANS)
      try {
        const resEquip = await getEquipements()
        setEquipements(Array.isArray(resEquip) ? resEquip : (resEquip?.data ?? []))
      } catch { setEquipements([]) }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { charger() }, [])

  const closeModal = () => {
    setShowModal(false)
    setEditingPlan(null)
    setForm(emptyForm)
    setPeriodiciteMode(30)
    setSubmitErr('')
  }

  const ajouterTache = () =>
    setForm(f => ({
      ...f,
      gamme_taches: [...f.gamme_taches, { ordre: f.gamme_taches.length + 1, libelle: '', obligatoire: true }]
    }))

  const supprimerTache = (i) =>
    setForm(f => ({
      ...f,
      gamme_taches: f.gamme_taches.filter((_, idx) => idx !== i).map((t, idx) => ({ ...t, ordre: idx + 1 }))
    }))

  const updateTache = (i, field, value) =>
    setForm(f => ({
      ...f,
      gamme_taches: f.gamme_taches.map((tk, idx) => idx === i ? { ...tk, [field]: value } : tk)
    }))

  const handleNouveauPlan = () => {
    setEditingPlan(null)
    setForm(emptyForm)
    setPeriodiciteMode(30)
    setSubmitErr('')
    setShowModal(true)
  }

  const handleEdit = (plan) => {
    const taches = parseTaches(plan.gamme_taches)
    setEditingPlan(plan)
    setForm({
      equipement_id:      plan.equipement_id,
      label:              plan.label ?? '',
      periodicite_custom: detecterModePeriodicite(plan.periodicite_jours) === 0
                            ? String(plan.periodicite_jours)
                            : '',
      gamme_taches:       taches,
      actif:              plan.actif,
    })
    setPeriodiciteMode(detecterModePeriodicite(plan.periodicite_jours))
    setSubmitErr('')
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setSubmitErr('')

    if (!editingPlan && !form.equipement_id) { setSubmitErr(t('plans.errors.selectEquipement')); return }
    if (!form.label.trim())                   { setSubmitErr(t('plans.errors.labelRequired')); return }
    if (form.gamme_taches.some(tk => !tk.libelle.trim())) {
      setSubmitErr(t('plans.errors.tachesRequired')); return
    }

    const periodicite = periodiciteMode === 0 ? parseInt(form.periodicite_custom) || 0 : periodiciteMode
    if (periodicite < 1) { setSubmitErr(t('plans.errors.periodiciteMin')); return }

    if (!backendDispo) {
      if (editingPlan) {
        setPlans(prev => prev.map(p => p.id !== editingPlan.id ? p : {
          ...p, label: form.label, periodicite_jours: periodicite,
          gamme_taches: form.gamme_taches, actif: form.actif,
        }))
      } else {
        setPlans(prev => [{
          id: `mock-${Date.now()}`, equipement_id: form.equipement_id,
          label: form.label, periodicite_jours: periodicite,
          gamme_taches: form.gamme_taches, actif: true,
          derniere_generation: null, _isMock: true,
        }, ...prev])
      }
      closeModal()
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        label: form.label, periodicite_jours: periodicite,
        gamme_taches: form.gamme_taches, actif: form.actif,
        ...(!editingPlan && { equipement_id: form.equipement_id }),
      }

      if (editingPlan) {
        await updatePlan(editingPlan.id, payload)
      } else {
        await createPlan(payload)
      }

      closeModal()
      await charger()
    } catch (err) {
      setSubmitErr(err.response?.data?.message || t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (plan) => {
    if (plan._isMock) {
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, actif: !p.actif } : p))
      return
    }
    try {
      await updatePlan(plan.id, { actif: !plan.actif })
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, actif: !p.actif } : p))
    } catch (err) {
      window.alert(err.response?.data?.message || t('common.error'))
    }
  }

  const handleDeleteConfirm = async () => {
    const plan = confirmDeletePlan
    setConfirmDeletePlan(null)

    if (plan._isMock) {
      setPlans(prev => prev.filter(p => p.id !== plan.id))
      return
    }

    try {
      await deletePlan(plan.id)
      await charger()
    } catch (err) {
      window.alert(err.response?.data?.message || t('common.error'))
    }
  }

  const getEquipementNom = (id) => equipements.find(e => e.id === id)?.nom || '—'

  const totalPages = Math.ceil(plans.length / ITEMS_PER_PAGE)
  const paginated  = plans.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  if (loading) return (
    <div className="mplans">
      <p className="mplans-msg">{t('plans.loading')}</p>
    </div>
  )

  return (
    <div className="mplans">

      {!backendDispo && (
        <div className="mplans-mock-banner">
          <i className="ti ti-info-circle" />
          {t('plans.mockBanner')}
        </div>
      )}

      <div className="mplans-header">
        <div>
          <h2 className="mplans-title">{t('plans.title')}</h2>
          <p className="mplans-sub">{t('plans.subtitle')}</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn-primary" onClick={handleNouveauPlan}>
            <i className="ti ti-plus" /> {t('plans.new')}
          </button>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="mplans-empty">
          <i className="ti ti-calendar-off" />
          <p>{t('plans.empty')}</p>
          {user?.role === 'admin' && (
            <button className="btn-primary" onClick={handleNouveauPlan}>
              {t('plans.createFirst')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mplans-table-wrap">
            <table className="mplans-table">
              <thead>
                <tr>
                  <th>{t('plans.table.plan')}</th>
                  <th>{t('plans.table.equipement')}</th>
                  <th>{t('plans.table.periodicite')}</th>
                  <th>{t('plans.table.taches')}</th>
                  <th>{t('plans.table.lastGeneration')}</th>
                  <th>{t('plans.table.statut')}</th>
                  {user?.role === 'admin' && <th>{t('plans.table.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map(plan => {
                  const tacheCount = parseTaches(plan.gamme_taches).length
                  return (
                    <tr key={plan.id}>
                      <td className="mplans-label">
                        {plan.label}
                        {plan._isMock && <span className="mplans-mock-tag">{t('plans.preview')}</span>}
                      </td>
                      <td>{getEquipementNom(plan.equipement_id)}</td>
                      <td>
                        <span className="mplans-periode">
                          <i className="ti ti-refresh" />
                          {plan.periodicite_jours} {t('plans.days')}
                        </span>
                      </td>
                      <td>
                        <span className="mplans-taches-count">
                          {tacheCount} {tacheCount > 1 ? t('plans.taskCountPlural') : t('plans.taskCount')}
                        </span>
                      </td>
                      <td className="mplans-date">
                        {plan.derniere_generation
                          ? new Date(plan.derniere_generation).toLocaleDateString()
                          : <span className="mplans-never">{t('plans.neverGenerated')}</span>}
                      </td>
                      <td>
                        <span className={`mplans-badge ${plan.actif ? 'mplans-badge--actif' : 'mplans-badge--inactif'}`}>
                          {plan.actif ? t('plans.statuts.actif') : t('plans.statuts.inactif')}
                        </span>
                      </td>

                      {user?.role === 'admin' && (
                        <td>
                          <div className="mplans-actions">
                            <button
                              className={`btn-toggle-plan ${plan.actif ? 'btn-desactiver' : 'btn-activer'}`}
                              onClick={() => handleToggle(plan)}
                              title={plan.actif ? t('plans.deactivate') : t('plans.activate')}
                            >
                              <i className={`ti ${plan.actif ? 'ti-pause' : 'ti-play'}`} />
                              {plan.actif ? t('plans.deactivate') : t('plans.activate')}
                            </button>

                            <button className="btn-edit-plan" onClick={() => handleEdit(plan)} title={t('common.edit')}>
                              <i className="ti ti-pencil" />
                              {t('common.edit')}
                            </button>

                            <button className="btn-delete-plan" onClick={() => setConfirmDeletePlan(plan)} title={t('common.delete')}>
                              <i className="ti ti-trash" />
                              {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mplans-pagination">
              <p>{(page-1)*ITEMS_PER_PAGE+1}–{Math.min(page*ITEMS_PER_PAGE, plans.length)} {t('pagination.of')} {plans.length}</p>
              <div className="pagination-btns">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>
                  <i className="ti ti-chevron-left" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i+1} className={page === i+1 ? 'active' : ''} onClick={() => setPage(i+1)}>
                    {i+1}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>
                  <i className="ti ti-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal création / modification */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPlan ? t('plans.editTitle') : t('plans.newTitle')}</h2>
              <button onClick={closeModal}><i className="ti ti-x" /></button>
            </div>

            <div className="modal-body">
              {!editingPlan && (
                <div className="form-group">
                  <label>{t('plans.equipement')} <span className="required">*</span></label>
                  <select value={form.equipement_id} onChange={e => setForm(f => ({ ...f, equipement_id: e.target.value }))}>
                    <option value="">{t('plans.selectEquipement')}</option>
                    {equipements.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.nom} — {eq.reference}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>{t('plans.label')} <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Ex : Entretien trimestriel des ascenseurs"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>{t('plans.periodiciteLabel')}</label>
                <div className="mplans-periodo-grid">
                  {PERIODICITE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`mplans-periodo-btn ${periodiciteMode === opt.value ? 'active' : ''}`}
                      onClick={() => setPeriodiciteMode(opt.value)}
                    >
                      {t(`plans.periodicites.${opt.tKey}`)}
                    </button>
                  ))}
                </div>
                {periodiciteMode === 0 && (
                  <input
                    type="number"
                    min="1"
                    placeholder={t('plans.nombreJours')}
                    value={form.periodicite_custom}
                    onChange={e => setForm(f => ({ ...f, periodicite_custom: e.target.value }))}
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>

              {editingPlan && (
                <div className="form-group">
                  <label className="mplans-tache-oblig" style={{ fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={form.actif}
                      onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                    />
                    {t('plans.actifLabel')}
                  </label>
                </div>
              )}

              <div className="form-group">
                <label>{t('plans.gammeTaches')} <span className="required">*</span></label>
                <div className="mplans-taches">
                  {form.gamme_taches.map((tache, i) => (
                    <div key={i} className="mplans-tache-row">
                      <span className="mplans-tache-ordre">{tache.ordre}</span>
                      <input
                        type="text"
                        placeholder={t('plans.tachePlaceholder')}
                        value={tache.libelle}
                        onChange={e => updateTache(i, 'libelle', e.target.value)}
                      />
                      <label className="mplans-tache-oblig">
                        <input
                          type="checkbox"
                          checked={tache.obligatoire}
                          onChange={e => updateTache(i, 'obligatoire', e.target.checked)}
                        />
                        {t('plans.obligatoire')}
                      </label>
                      {form.gamme_taches.length > 1 && (
                        <button type="button" className="mplans-tache-del" onClick={() => supprimerTache(i)}>
                          <i className="ti ti-trash" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="mplans-add-tache" onClick={ajouterTache}>
                    <i className="ti ti-plus" /> {t('plans.ajouterTache')}
                  </button>
                </div>
              </div>

              {submitErr && <p className="erreur">{submitErr}</p>}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal} disabled={submitting}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? t('plans.saving')
                  : editingPlan
                    ? t('plans.saveChanges')
                    : (backendDispo ? t('plans.createPlan') : t('plans.addMock'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      {confirmDeletePlan && (
        <div className="modal-overlay" onClick={() => setConfirmDeletePlan(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog__icon">
              <i className="ti ti-alert-triangle" />
            </div>
            <h3 className="confirm-dialog__title">{t('plans.deleteTitle')}</h3>
            <p className="confirm-dialog__body">
              <strong>« {confirmDeletePlan.label} »</strong> — {t('plans.deleteBody')}
            </p>
            <div className="confirm-dialog__actions">
              <button className="btn-cancel" onClick={() => setConfirmDeletePlan(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>
                <i className="ti ti-trash" /> {t('plans.deleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
