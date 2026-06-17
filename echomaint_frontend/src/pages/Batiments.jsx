import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBatiments, deleteBatiment } from '../api/batiments.api'
import './Batiments.css'

const mockBatiments = [
  { id: '1', nom: 'Siège Social DGS Africa', adresse: 'Route de Ngor, Dakar', client_nom: 'DGS Africa', nb_equipements: 24 },
  { id: '2', nom: 'Tour Almadies', adresse: 'Route des Almadies, Dakar', client_nom: 'SCI Almadies', nb_equipements: 18 },
  { id: '3', nom: 'Entrepôt Mbao', adresse: 'Zone industrielle, Mbao', client_nom: 'Logistique SN', nb_equipements: 42 },
  { id: '4', nom: 'Immeuble Plateau', adresse: 'Plateau, Dakar', client_nom: 'DGS Africa', nb_equipements: 15 },
  { id: '5', nom: 'Agence Thiès', adresse: 'Centre ville, Thiès', client_nom: 'Agence Sud', nb_equipements: 8 },
  { id: '6', nom: 'Centre Technique', adresse: 'Almadies, Dakar', client_nom: 'DGS Africa', nb_equipements: 12 },
]

const ITEMS_PER_PAGE = 6

export default function Batiments() {
  const navigate = useNavigate()
  const [batiments, setBatiments] = useState(mockBatiments)
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editBatiment, setEditBatiment] = useState(null)
  const [form, setForm] = useState({ nom: '', adresse: '', client_id: '' })

  const clients = [...new Set(mockBatiments.map(b => b.client_nom))]

  const filtered = batiments.filter(b => {
    const matchSearch = b.nom.toLowerCase().includes(search.toLowerCase()) ||
      b.adresse.toLowerCase().includes(search.toLowerCase())
    const matchClient = filterClient ? b.client_nom === filterClient : true
    return matchSearch && matchClient
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce bâtiment ?')) {
      setBatiments(prev => prev.filter(b => b.id !== id))
    }
  }

  const handleEdit = (batiment) => {
    setEditBatiment(batiment)
    setForm({ nom: batiment.nom, adresse: batiment.adresse, client_id: batiment.client_nom })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editBatiment) {
      setBatiments(prev => prev.map(b =>
        b.id === editBatiment.id
          ? { ...b, nom: form.nom, adresse: form.adresse }
          : b
      ))
    } else {
      const newBatiment = {
        id: Date.now().toString(),
        nom: form.nom,
        adresse: form.adresse,
        client_nom: form.client_id,
        nb_equipements: 0
      }
      setBatiments(prev => [...prev, newBatiment])
    }
    setShowModal(false)
    setEditBatiment(null)
    setForm({ nom: '', adresse: '', client_id: '' })
  }

  return (
    <div className="batiments">

      {/* Header */}
      <div className="batiments-header">
        <div className="batiments-filters">
          <div className="search-box">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher un bâtiment..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            value={filterClient}
            onChange={e => { setFilterClient(e.target.value); setPage(1) }}
          >
            <option value="">Tous les clients</option>
            {clients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={() => {
          setEditBatiment(null)
          setForm({ nom: '', adresse: '', client_id: '' })
          setShowModal(true)
        }}>
          <i className="ti ti-plus" aria-hidden="true" />
          Nouveau bâtiment
        </button>
      </div>

      {/* Grille */}
      {paginated.length === 0 ? (
        <div className="batiments-empty">
          <i className="ti ti-building-off" aria-hidden="true" />
          <p>Aucun bâtiment trouvé</p>
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
                  <button onClick={() => handleEdit(batiment)} title="Modifier">
                    <i className="ti ti-edit" aria-hidden="true" />
                  </button>
                  <button onClick={() => handleDelete(batiment.id)} title="Supprimer" className="btn-danger">
                    <i className="ti ti-trash" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="batiment-info">
                <p className="batiment-nom">{batiment.nom}</p>
                <p className="batiment-adresse">
                  <i className="ti ti-map-pin" aria-hidden="true" />
                  {batiment.adresse}
                </p>
              </div>

              <div className="batiment-meta">
                <span><strong>{batiment.nb_equipements}</strong> équipements</span>
                <span>Client: <strong>{batiment.client_nom}</strong></span>
              </div>

              <button
                className="btn-outline"
                onClick={() => navigate(`/equipements?batiment=${batiment.id}`)}
              >
                <i className="ti ti-eye" aria-hidden="true" />
                Voir les équipements
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="batiments-pagination">
          <p>Affichage {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} bâtiments</p>
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
              <h2>{editBatiment ? 'Modifier le bâtiment' : 'Nouveau bâtiment'}</h2>
              <button onClick={() => setShowModal(false)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nom du bâtiment</label>
                <input
                  type="text"
                  placeholder="Ex: Siège Social DGS Africa"
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  placeholder="Ex: Route de Ngor, Dakar"
                  value={form.adresse}
                  onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Client associé</label>
                <input
                  type="text"
                  placeholder="Ex: DGS Africa"
                  value={form.client_id}
                  onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editBatiment ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}