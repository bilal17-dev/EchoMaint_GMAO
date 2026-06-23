import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Batiments.css'

// On importe les vraies fonctions qui parlent au backend
// Elles remplacent les tableaux mockClients et mockBatiments qui étaient écrits en dur
import { getBatiments, createBatiment, updateBatiment, deleteBatiment } from '../api/batiments.api'
import { getClients } from '../api/clients.api'

const ITEMS_PER_PAGE = 6

export default function Batiments() {
  const navigate = useNavigate()

  // On démarre avec des tableaux vides : les vraies données arrivent via useEffect ci-dessous
  const [batiments, setBatiments] = useState([])
  const [clients, setClients] = useState([])

  // États pour gérer le chargement et les erreurs de connexion au backend
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editBatiment, setEditBatiment] = useState(null)
  const [form, setForm] = useState({ nom: '', adresse: '', ville: '', client_id: '', description: '' })
  const user = JSON.parse(localStorage.getItem('echomaint_user') || '{}')

  // ─── Chargement des données au premier affichage de la page ────────────────
  // Le tableau vide [] en deuxième argument veut dire :
  // "exécute cette fonction une seule fois, juste après le premier rendu de la page"
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
      const clients = Array.isArray(resClients)         ? resClients
                    : Array.isArray(resClients?.data)    ? resClients.data
                    : []

      setBatiments(bats)
      setClients(clients)
    } catch (error) {
      console.error('Erreur de chargement des bâtiments:', error)
      setErreur('Impossible de charger les bâtiments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    chargerDonnees()
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

  // ─── Suppression connectée au backend ──────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce bâtiment ?')) return

    try {
      // On appelle le vrai endpoint DELETE /batiments/:id
      // Le backend lui-même vérifie la règle RG-REF-03 :
      // impossible de supprimer si le bâtiment a encore des équipements actifs
      await deleteBatiment(id)
      setBatiments(prev => prev.filter(b => b.id !== id))
    } catch (error) {
      // Si le backend refuse (équipements rattachés), on affiche son message exact
      const message = error.response?.data?.message
        || 'Impossible de supprimer ce bâtiment : il a encore des équipements rattachés.'
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

  // ─── Création / modification connectée au backend ──────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editBatiment) {
        // Modification d'un bâtiment existant
        const res = await updateBatiment(editBatiment.id, form)
        setBatiments(prev => prev.map(b =>
          b.id === editBatiment.id ? res.data : b
        ))
      } else {
        // Création d'un nouveau bâtiment
        const res = await createBatiment(form)
        setBatiments(prev => [...prev, res.data])
      }
      setShowModal(false)
      setEditBatiment(null)
      setForm({ nom: '', adresse: '', ville: '', client_id: '', description: '' })
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement.'
      window.alert(message)
    }
  }

  // ─── Affichage pendant le chargement des données ────────────────────────────
  if (loading) {
    return (
      <div className="batiments">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          Chargement des bâtiments...
        </p>
      </div>
    )
  }

  // ─── Affichage en cas d'erreur de connexion au backend ──────────────────────
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
            Nouveau bâtiment
          </button>
        )}
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
                  {user.role === 'admin' && (
                    <>
                      <button onClick={() => handleEdit(batiment)} title="Modifier">
                        <i className="ti ti-edit" aria-hidden="true" />
                      </button>
                      <button onClick={() => handleDelete(batiment.id)} title="Supprimer" className="btn-danger">
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
                {/*
                  nb_equipements n'existe pas forcément dans la réponse du backend.
                  On affiche "0" par défaut si le champ n'est pas fourni,
                  pour éviter une erreur d'affichage (undefined).
                */}
                <span><strong>{batiment.nb_equipements ?? 0}</strong> équipements</span>
                <span>Client: <strong>{getClientNom(batiment.client_id)}</strong></span>
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

              <div className="form-row">
                <div className="form-group">
                  <label>Adresse</label>
                  <input
                    type="text"
                    placeholder="Ex: Route de Ngor"
                    value={form.adresse}
                    onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ville</label>
                  <input
                    type="text"
                    placeholder="Ex: Dakar"
                    value={form.ville}
                    onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Client associé</label>
                <select
                  value={form.client_id}
                  onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description (optionnel)</label>
                <textarea
                  placeholder="Notes ou précisions sur le bâtiment"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
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