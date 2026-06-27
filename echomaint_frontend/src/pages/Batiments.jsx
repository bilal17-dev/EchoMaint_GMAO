import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Batiments.css'

import { getBatiments, createBatiment, updateBatiment, deleteBatiment } from '../api/batiments.api'
import { getClients } from '../api/clients.api'

const ITEMS_PER_PAGE = 6

export default function Batiments() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [batiments, setBatiments] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editBatiment, setEditBatiment] = useState(null)
  const [form, setForm] = useState({ nom: '', adresse: '', ville: '', client_id: '', description: '' })
  const user = JSON.parse(localStorage.getItem('echomaint_user') || '{}')

  const chargerDonnees = async () => {
    setLoading(true)
    setErreur('')
    try {
      const [resBatiments, resClients] = await Promise.all([
        getBatiments(),
        getClients()
      ])

      const bats    = Array.isArray(resBatiments)       ? resBatiments
                    : Array.isArray(resBatiments?.data)  ? resBatiments.data
                    : []
      const cls     = Array.isArray(resClients)         ? resClients
                    : Array.isArray(resClients?.data)    ? resClients.data
                    : []

      setBatiments(bats)
      setClients(cls)
    } catch (error) {
      console.error('Erreur de chargement des bâtiments:', error)
      setErreur(t('batiments.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    chargerDonnees()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getClientNom = (clientId) => clients.find(c => c.id === clientId)?.nom || '—'

  const filtered = batiments.filter(b => {
    const matchSearch =
      b.nom.toLowerCase().includes(search.toLowerCase()) ||
      b.adresse.toLowerCase().includes(search.toLowerCase()) ||
      b.ville.toLowerCase().includes(search.toLowerCase())
    const matchClient = filterClient ? b.client_id === filterClient : true
    return matchSearch && matchClient
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleDelete = async (id) => {
    if (!window.confirm(t('batiments.deleteConfirm'))) return

    try {
      await deleteBatiment(id)
      setBatiments(prev => prev.filter(b => b.id !== id))
    } catch (error) {
      const message = error.response?.data?.message || t('batiments.deleteBlocked')
      window.alert(message)
    }
  }

  const handleEdit = (batiment) => {
    setEditBatiment(batiment)
    setForm({
      nom: batiment.nom,
      adresse: batiment.adresse,
      ville: batiment.ville,
      client_id: batiment.client_id,
      description: batiment.description || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editBatiment) {
        const res = await updateBatiment(editBatiment.id, form)
        setBatiments(prev => prev.map(b =>
          b.id === editBatiment.id ? res.data : b
        ))
      } else {
        const res = await createBatiment(form)
        setBatiments(prev => [...prev, res.data])
      }
      setShowModal(false)
      setEditBatiment(null)
      setForm({ nom: '', adresse: '', ville: '', client_id: '', description: '' })
    } catch (error) {
      const message = error.response?.data?.message || t('common.error')
      window.alert(message)
    }
  }

  if (loading) {
    return (
      <div className="batiments">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          {t('batiments.loading')}
        </p>
      </div>
    )
  }

  if (erreur) {
    return (
      <div className="batiments">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
          {erreur}
        </p>
      </div>
    )
  }

  return (
    <div className="batiments">

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('layout.batiments.title')}</h1>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: '3px' }}>{t('layout.batiments.subtitle')}</p>
        </div>
      </div>

      {/* Header */}
      <div className="batiments-header">
        <div className="batiments-filters">
          <div className="search-box">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('batiments.search')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            value={filterClient}
            onChange={e => { setFilterClient(e.target.value); setPage(1) }}
          >
            <option value="">{t('batiments.allClients')}</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
        {user.role === 'admin' && (
          <button className="btn-primary" onClick={() => {
            setEditBatiment(null)
            setForm({ nom: '', adresse: '', ville: '', client_id: '', description: '' })
            setShowModal(true)
          }}>
            <i className="ti ti-plus" aria-hidden="true" />
            {t('batiments.new')}
          </button>
        )}
      </div>

      {/* Grille */}
      {paginated.length === 0 ? (
        <div className="batiments-empty">
          <i className="ti ti-building-off" aria-hidden="true" />
          <p>{t('batiments.empty')}</p>
        </div>
      ) : (
        <div className="batiments-grid">
          {paginated.map(batiment => (
            <div key={batiment.id} className="batiment-card">
              <div className="batiment-card-top">
                <div className="batiment-icon">
                  <i className="ti ti-building" aria-hidden="true" />
                </div>
                <div className="batiment-actions">
                  {user.role === 'admin' && (
                    <>
                      <button onClick={() => handleEdit(batiment)} title={t('common.edit')}>
                        <i className="ti ti-edit" aria-hidden="true" />
                      </button>
                      <button onClick={() => handleDelete(batiment.id)} title={t('common.delete')} className="btn-danger">
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="batiment-info">
                <p className="batiment-nom">{batiment.nom}</p>
                <p className="batiment-adresse">
                  <i className="ti ti-map-pin" aria-hidden="true" />
                  {batiment.adresse}, {batiment.ville}
                </p>
              </div>

              <div className="batiment-meta">
                <span><strong>{batiment.nb_equipements ?? 0}</strong> {t('batiments.equipments')}</span>
                <span>{t('batiments.client')}: <strong>{getClientNom(batiment.client_id)}</strong></span>
              </div>

              <button
                className="btn-outline"
                onClick={() => navigate(`/equipements?batiment=${batiment.id}`)}
              >
                <i className="ti ti-eye" aria-hidden="true" />
                {t('batiments.viewEquipments')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="batiments-pagination">
          <p>
            {t('pagination.showing')} {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} {t('pagination.of')} {filtered.length} {t('pagination.buildings')}
          </p>
          <div className="pagination-btns">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <i className="ti ti-chevron-left" aria-hidden="true" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={page === i + 1 ? 'active' : ''}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <i className="ti ti-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editBatiment ? t('batiments.edit') : t('batiments.new')}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>{t('batiments.name')}</label>
                <input
                  type="text"
                  placeholder={t('batiments.namePlaceholder')}
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('batiments.address')}</label>
                  <input
                    type="text"
                    placeholder={t('batiments.addressPlaceholder')}
                    value={form.adresse}
                    onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('batiments.city')}</label>
                  <input
                    type="text"
                    placeholder={t('batiments.cityPlaceholder')}
                    value={form.ville}
                    onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('batiments.client')}</label>
                <select
                  value={form.client_id}
                  onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  required
                >
                  <option value="">{t('batiments.selectClient')}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('batiments.description')} <span style={{ color: '#94a3b8', fontSize: '12px' }}>({t('common.optional')})</span></label>
                <textarea
                  placeholder={t('batiments.descriptionPlaceholder')}
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
                  {editBatiment ? t('common.save') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
