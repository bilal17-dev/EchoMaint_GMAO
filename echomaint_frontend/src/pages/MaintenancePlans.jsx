import { useState, useEffect } from 'react'
import './MaintenancePlans.css'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios.config'
import { getEquipements } from '../api/equipements.api'

const PERIODICITE_OPTIONS = [
  { label: 'Tous les mois',      value: 30  },
  { label: 'Tous les 3 mois',    value: 90  },
  { label: 'Tous les 6 mois',    value: 180 },
  { label: 'Tous les ans',       value: 365 },
  { label: 'Personnalisé (jours)', value: 0  },
]

const ITEMS_PER_PAGE = 5

const emptyForm = {
  equipement_id: '',
  label: '',
  periodicite_jours: 30,
  periodicite_custom: '',
  gamme_taches: [{ ordre: 1, libelle: '', obligatoire: true }],
  actif: true,
}

export default function MaintenancePlans() {
  const { user } = useAuth()

  const [plans,       setPlans]       = useState([])
  const [equipements, setEquipements] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [erreur,      setErreur]      = useState('')
  const [page,        setPage]        = useState(1)
  const [showModal,   setShowModal]   = useState(false)
  const [form,        setForm]        = useState(emptyForm)
  const [submitErr,   setSubmitErr]   = useState('')
  const [periodiciteMode, setPeriodiciteMode] = useState(30)

  useEffect(() => { charger() }, [])

  const mockPlans = [
  {
    id: 'pm1',
    equipement_id: '',
    label: 'Entretien trimestriel ascenseurs',
    periodicite_jours: 90,
    gamme_taches: [
      { ordre: 1, libelle: 'Vérifier la pression', obligatoire: true },
      { ordre: 2, libelle: 'Nettoyer les filtres', obligatoire: true },
    ],
    actif: true,
    derniere_generation: null,
  },
]

const charger = async () => {
  setLoading(true)
  setErreur('')
  try {
    const [resPlans, resEquip] = await Promise.all([
      api.get('/plans-maintenance'),
      getEquipements(),
    ])
    const p = Array.isArray(resPlans.data) ? resPlans.data
            : Array.isArray(resPlans.data?.data) ? resPlans.data.data
            : []
    const e = Array.isArray(resEquip) ? resEquip
            : Array.isArray(resEquip.data) ? resEquip.data
            : []
    setPlans(p)
    setEquipements(e)
  } catch (err) {
    console.warn('[MOCK] /plans-maintenance non disponible, données mockées utilisées.')
    // Fallback mock au lieu d'afficher une erreur rouge
    setPlans(mockPlans)
    try {
      const resEquip = await getEquipements()
      const e = Array.isArray(resEquip) ? resEquip
              : Array.isArray(resEquip.data) ? resEquip.data
              : []
      setEquipements(e)
    } catch {
      setEquipements([])
    }
  } finally {
    setLoading(false)
  }
}

  // ── Tâches ──────────────────────────────────────────────────────────────────
  const ajouterTache = () =>
    setForm(f => ({
      ...f,
      gamme_taches: [...f.gamme_taches, { ordre: f.gamme_taches.length + 1, libelle: '', obligatoire: true }]
    }))

  const supprimerTache = (i) =>
    setForm(f => ({
      ...f,
      gamme_taches: f.gamme_taches
        .filter((_, idx) => idx !== i)
        .map((t, idx) => ({ ...t, ordre: idx + 1 }))
    }))

  const updateTache = (i, field, value) =>
    setForm(f => ({
      ...f,
      gamme_taches: f.gamme_taches.map((t, idx) => idx === i ? { ...t, [field]: value } : t)
    }))

  // ── Soumission ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitErr('')
    if (!form.equipement_id) { setSubmitErr('Sélectionnez un équipement.'); return }
    if (!form.label.trim())  { setSubmitErr('Le libellé est obligatoire.'); return }
    if (form.gamme_taches.some(t => !t.libelle.trim())) {
      setSubmitErr('Toutes les tâches doivent avoir un libellé.'); return
    }

    const periodicite = periodiciteMode === 0
      ? parseInt(form.periodicite_custom) || 0
      : periodiciteMode

    if (periodicite < 1) { setSubmitErr('La périodicité doit être ≥ 1 jour.'); return }

    try {
      const payload = {
        equipement_id:    form.equipement_id,
        label:            form.label,
        periodicite_jours: periodicite,
        gamme_taches:     form.gamme_taches,
        actif:            form.actif,
      }
      const res = await api.post('/plans-maintenance', payload)
      const nouveau = res.data?.data ?? res.data
      setPlans(prev => [nouveau, ...prev])
      setShowModal(false)
      setForm(emptyForm)
      setPeriodiciteMode(30)
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la création.'
      setSubmitErr(msg)
    }
  }

  // ── Toggle actif ────────────────────────────────────────────────────────────
  const handleToggle = async (plan) => {
    try {
      await api.put(`/plans-maintenance/${plan.id}`, { actif: !plan.actif })
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, actif: !p.actif } : p))
    } catch (err) {
      window.alert(err.response?.data?.message || 'Erreur lors de la mise à jour.')
    }
  }

  const getEquipementNom = (id) => equipements.find(e => e.id === id)?.nom || '—'

  const totalPages = Math.ceil(plans.length / ITEMS_PER_PAGE)
  const paginated  = plans.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  if (loading) return (
    <div className="mplans">
      <p className="mplans-msg">Chargement des plans de maintenance…</p>
    </div>
  )

  if (erreur) return (
    <div className="mplans">
      <p className="mplans-msg mplans-msg--error">{erreur}</p>
    </div>
  )

  return (
    <div className="mplans">

      {/* Header */}
      <div className="mplans-header">
        <div>
          <h2 className="mplans-title">Plans de maintenance préventive</h2>
          <p className="mplans-sub">Configurez les révisions régulières de vos équipements</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn-primary" onClick={() => { setShowModal(true); setSubmitErr('') }}>
            <i className="ti ti-plus" /> Nouveau plan
          </button>
        )}
      </div>

      {/* Tableau des plans */}
      {plans.length === 0 ? (
        <div className="mplans-empty">
          <i className="ti ti-calendar-off" />
          <p>Aucun plan de maintenance configuré</p>
          {user?.role === 'admin' && (
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              Créer le premier plan
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mplans-table-wrap">
            <table className="mplans-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Équipement</th>
                  <th>Périodicité</th>
                  <th>Tâches</th>
                  <th>Dernière génération</th>
                  <th>Statut</th>
                  {user?.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map(plan => (
                  <tr key={plan.id}>
                    <td className="mplans-label">{plan.label}</td>
                    <td>{getEquipementNom(plan.equipement_id)}</td>
                    <td>
                      <span className="mplans-periode">
                        <i className="ti ti-refresh" />
                        {plan.periodicite_jours} jours
                      </span>
                    </td>
                    <td>
                      <span className="mplans-taches-count">
                        {(plan.gamme_taches ?? []).length} tâche{(plan.gamme_taches ?? []).length > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="mplans-date">
                      {plan.derniere_generation
                        ? new Date(plan.derniere_generation).toLocaleDateString('fr-FR')
                        : <span className="mplans-never">Jamais générée</span>}
                    </td>
                    <td>
                      <span className={`mplans-badge ${plan.actif ? 'mplans-badge--actif' : 'mplans-badge--inactif'}`}>
                        {plan.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td>
                        <button
                          className={`btn-toggle-plan ${plan.actif ? 'btn-desactiver' : 'btn-activer'}`}
                          onClick={() => handleToggle(plan)}
                        >
                          <i className={`ti ${plan.actif ? 'ti-pause' : 'ti-play'}`} />
                          {plan.actif ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mplans-pagination">
              <p>{(page-1)*ITEMS_PER_PAGE+1}–{Math.min(page*ITEMS_PER_PAGE, plans.length)} sur {plans.length}</p>
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

      {/* Modal création */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau plan de maintenance</h2>
              <button onClick={() => setShowModal(false)}><i className="ti ti-x" /></button>
            </div>

            <div className="modal-body">
              {/* Équipement */}
              <div className="form-group">
                <label>Équipement ciblé <span className="required">*</span></label>
                <select
                  value={form.equipement_id}
                  onChange={e => setForm(f => ({ ...f, equipement_id: e.target.value }))}
                >
                  <option value="">Sélectionner un équipement</option>
                  {equipements.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nom} — {eq.reference}</option>
                  ))}
                </select>
              </div>

              {/* Libellé */}
              <div className="form-group">
                <label>Libellé du plan <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Ex : Entretien trimestriel des ascenseurs"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>

              {/* Périodicité */}
              <div className="form-group">
                <label>Périodicité</label>
                <div className="mplans-periodo-grid">
                  {PERIODICITE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`mplans-periodo-btn ${periodiciteMode === opt.value ? 'active' : ''}`}
                      onClick={() => setPeriodiciteMode(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {periodiciteMode === 0 && (
                  <input
                    type="number"
                    min="1"
                    placeholder="Nombre de jours"
                    value={form.periodicite_custom}
                    onChange={e => setForm(f => ({ ...f, periodicite_custom: e.target.value }))}
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>

              {/* Gamme de tâches */}
              <div className="form-group">
                <label>Gamme de tâches <span className="required">*</span></label>
                <div className="mplans-taches">
                  {form.gamme_taches.map((tache, i) => (
                    <div key={i} className="mplans-tache-row">
                      <span className="mplans-tache-ordre">{tache.ordre}</span>
                      <input
                        type="text"
                        placeholder={`Ex : Vérifier la pression`}
                        value={tache.libelle}
                        onChange={e => updateTache(i, 'libelle', e.target.value)}
                      />
                      <label className="mplans-tache-oblig">
                        <input
                          type="checkbox"
                          checked={tache.obligatoire}
                          onChange={e => updateTache(i, 'obligatoire', e.target.checked)}
                        />
                        Obligatoire
                      </label>
                      {form.gamme_taches.length > 1 && (
                        <button
                          type="button"
                          className="mplans-tache-del"
                          onClick={() => supprimerTache(i)}
                        >
                          <i className="ti ti-trash" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="mplans-add-tache" onClick={ajouterTache}>
                    <i className="ti ti-plus" /> Ajouter une tâche
                  </button>
                </div>
              </div>

              {submitErr && <p className="erreur">{submitErr}</p>}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleSubmit}>Créer le plan</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}