import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Equipements.css'

import { getEquipements, createEquipement, updateEquipement, deleteEquipement } from '../api/equipements.api'
import { getBatiments } from '../api/batiments.api'
import Pagination from '../components/Pagination'

const STATUTS = [
  { value: 'actif',        className: 'badge-actif' },
  { value: 'en_panne',     className: 'badge-en-panne' },
  { value: 'hors_service', className: 'badge-hors-service' },
]

const ITEMS_PER_PAGE = 6

const emptyForm = {
  nom: '', reference: '', type: '', marque: '', modele: '',
  numero_serie: '', date_installation: '', batiment_id: '', statut: 'actif', description: ''
}

export default function Equipements() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const batimentFilterFromUrl = searchParams.get('batiment') || ''

  const [equipements, setEquipements] = useState([])
  const [batiments, setBatiments] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [search, setSearch] = useState('')
  const [filterBatiment, setFilterBatiment] = useState(batimentFilterFromUrl)
  const [filterStatut, setFilterStatut] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editEquipement, setEditEquipement] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const user = JSON.parse(localStorage.getItem('echomaint_user') || '{}')

  const chargerDonnees = async () => {
    setLoading(true)
    setErreur('')
    try {
      const [resEquipements, resBatiments] = await Promise.all([
        getEquipements(),
        getBatiments()
      ])

      const equips = Array.isArray(resEquipements)       ? resEquipements
                   : Array.isArray(resEquipements?.data)  ? resEquipements.data
                   : []
      const bats   = Array.isArray(resBatiments)         ? resBatiments
                   : Array.isArray(resBatiments?.data)    ? resBatiments.data
                   : []

      setEquipements(equips)
      setBatiments(bats)
    } catch (error) {
      console.error('Erreur de chargement des équipements:', error)
      setErreur(t('equipements.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    chargerDonnees()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getBatimentNom = (id) => batiments.find(b => b.id === id)?.nom || '—'
  const getStatutClassName = (statut) => STATUTS.find(s => s.value === statut)?.className || 'badge-actif'

  const filtered = equipements.filter(eq => {
    const matchSearch =
      eq.nom.toLowerCase().includes(search.toLowerCase()) ||
      eq.reference.toLowerCase().includes(search.toLowerCase())
    const matchBatiment = filterBatiment ? eq.batiment_id === filterBatiment : true
    const matchStatut = filterStatut ? eq.statut === filterStatut : true
    return matchSearch && matchBatiment && matchStatut
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleBatimentFilterChange = (value) => {
    setFilterBatiment(value)
    setPage(1)
    setSearchParams(value ? { batiment: value } : {})
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('equipements.deleteConfirm'))) return

    try {
      await deleteEquipement(id)
      await chargerDonnees()
      setPage(1)
    } catch (error) {
      const message = error.response?.data?.message || t('common.error')
      window.alert(message)
    }
  }

  const handleEdit = (equipement) => {
    setEditEquipement(equipement)
    setForm({ ...equipement })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.date_installation && new Date(form.date_installation) > new Date()) {
      window.alert(t('equipements.installDateFuture'))
      return
    }

    try {
      if (editEquipement) {
        await updateEquipement(editEquipement.id, form)
      } else {
        await createEquipement(form)
      }
      setShowModal(false)
      setEditEquipement(null)
      setForm(emptyForm)
      await chargerDonnees()
      setPage(1)
    } catch (error) {
      const message = error.response?.data?.message || t('common.error')
      window.alert(message)
    }
  }

  if (loading) {
    return (
      <div className="equipements">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          {t('equipements.loading')}
        </p>
      </div>
    )
  }

  if (erreur) {
    return (
      <div className="equipements">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
          {erreur}
        </p>
      </div>
    )
  }

  return (
    <div className="equipements">

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('layout.equipements.title')}</h1>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: '3px' }}>{t('layout.equipements.subtitle')}</p>
        </div>
      </div>

      {/* Header */}
      <div className="equipements-header">
        <div className="equipements-filters">
          <div className="search-box">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('equipements.search')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select value={filterBatiment} onChange={e => handleBatimentFilterChange(e.target.value)}>
            <option value="">{t('equipements.allBatiments')}</option>
            {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
          <select value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1) }}>
            <option value="">{t('equipements.allStatuts')}</option>
            {STATUTS.map(s => (
              <option key={s.value} value={s.value}>{t(`equipements.statuts.${s.value}`)}</option>
            ))}
          </select>
        </div>
        {user.role === 'admin' && (
          <button className="btn-primary" onClick={() => {
            setEditEquipement(null)
            setForm(emptyForm)
            setShowModal(true)
          }}>
            <i className="ti ti-plus" aria-hidden="true" />
            {t('equipements.new')}
          </button>
        )}
      </div>

      {/* Grille */}
      {paginated.length === 0 ? (
        <div className="equipements-empty">
          <i className="ti ti-tool-off" aria-hidden="true" />
          <p>{t('equipements.empty')}</p>
        </div>
      ) : (
        <div className="equipements-grid">
          {paginated.map(eq => (
            <div key={eq.id} className="equipement-card" data-statut={eq.statut}>
              <div className="equipement-card-top">
                <div className="equipement-icon">
                  <i className="ti ti-settings" aria-hidden="true" />
                </div>
                <div className="equipement-actions">
                  {user.role === 'admin' && (
                    <>
                      <button onClick={() => handleEdit(eq)} title={t('common.edit')}>
                        <i className="ti ti-edit" aria-hidden="true" />
                      </button>
                      <button onClick={() => handleDelete(eq.id)} title={t('common.delete')} className="btn-danger">
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="equipement-info">
                <p className="equipement-nom">{eq.nom}</p>
                <p className="equipement-reference">{t('equipements.ref')} {eq.reference}</p>
                <span className={`statut-badge ${getStatutClassName(eq.statut)}`}>
                  {t(`equipements.statuts.${eq.statut}`)}
                </span>
              </div>

              <div className="equipement-meta">
                <span><i className="ti ti-building" aria-hidden="true" /> {getBatimentNom(eq.batiment_id)}</span>
                <span>{eq.marque} {eq.modele}</span>
              </div>

              <button
                className="btn-outline"
                onClick={() => navigate(`/equipements/${eq.id}`)}
              >
                <i className="ti ti-eye" aria-hidden="true" />
                {t('equipements.viewFiche')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} total={filtered.length} itemsPerPage={ITEMS_PER_PAGE} onChange={setPage} />

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editEquipement ? t('equipements.edit') : t('equipements.new')}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('equipements.name')}</label>
                  <input
                    type="text"
                    placeholder={t('equipements.namePlaceholder')}
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('equipements.reference')}</label>
                  <input
                    type="text"
                    placeholder={t('equipements.referencePlaceholder')}
                    value={form.reference}
                    onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('equipements.type')}</label>
                  <input
                    type="text"
                    placeholder={t('equipements.typePlaceholder')}
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>{t('batiments.name')}</label>
                  <select
                    value={form.batiment_id}
                    onChange={e => setForm(f => ({ ...f, batiment_id: e.target.value }))}
                    required
                  >
                    <option value="">{t('equipements.selectBatiment')}</option>
                    {batiments.map(b => (
                      <option key={b.id} value={b.id}>{b.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('equipements.brand')}</label>
                  <input
                    type="text"
                    placeholder={t('equipements.brandPlaceholder')}
                    value={form.marque}
                    onChange={e => setForm(f => ({ ...f, marque: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>{t('equipements.model')}</label>
                  <input
                    type="text"
                    placeholder={t('equipements.modelPlaceholder')}
                    value={form.modele}
                    onChange={e => setForm(f => ({ ...f, modele: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('equipements.serialNumber')}</label>
                  <input
                    type="text"
                    placeholder={t('equipements.serialPlaceholder')}
                    value={form.numero_serie}
                    onChange={e => setForm(f => ({ ...f, numero_serie: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>{t('equipements.installDate')}</label>
                  <input
                    type="date"
                    value={form.date_installation}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, date_installation: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('equipements.status')}</label>
                <select
                  value={form.statut}
                  onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                  required
                >
                  {STATUTS.map(s => (
                    <option key={s.value} value={s.value}>{t(`equipements.statuts.${s.value}`)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('equipements.description')} <span style={{ color: '#94a3b8', fontSize: '12px' }}>({t('common.optional')})</span></label>
                <textarea
                  placeholder={t('equipements.descriptionPlaceholder')}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {editEquipement ? t('common.save') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
