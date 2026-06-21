import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Equipements.css'

// On importe les vraies fonctions qui parlent au backend
// Ces fonctions remplacent les données mockées qui étaient en dur dans le fichier
import { getEquipements, createEquipement, updateEquipement, deleteEquipement } from '../api/equipements.api'
import { getBatiments } from '../api/batiments.api'

const STATUTS = [
  { value: 'actif', label: 'Actif', className: 'badge-actif' },
  { value: 'en_panne', label: 'En panne', className: 'badge-en-panne' },
  { value: 'hors_service', label: 'Hors service', className: 'badge-hors-service' },
]

const ITEMS_PER_PAGE = 6

const emptyForm = {
  nom: '', reference: '', type: '', marque: '', modele: '',
  numero_serie: '', date_installation: '', batiment_id: '', statut: 'actif', description: ''
}

export default function Equipements() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const batimentFilterFromUrl = searchParams.get('batiment') || ''

  // On remplace useState(mockEquipements) par un tableau vide au départ
  // Les vraies données seront chargées depuis le backend avec useEffect ci-dessous
  const [equipements, setEquipements] = useState([])
  const [batiments, setBatiments] = useState([])

  // On ajoute un état de chargement pour informer l'utilisateur que les données arrivent
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  const [search, setSearch] = useState('')
  const [filterBatiment, setFilterBatiment] = useState(batimentFilterFromUrl)
  const [filterStatut, setFilterStatut] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editEquipement, setEditEquipement] = useState(null)
  const [form, setForm] = useState(emptyForm)

  // ─── Chargement des données au montage de la page ──────────────────────────
  // useEffect avec un tableau vide [] en deuxième argument signifie :
  // "exécute cette fonction une seule fois, quand la page s'affiche pour la première fois"
  useEffect(() => {
    chargerDonnees()
  }, [])

  const chargerDonnees = async () => {
    setLoading(true)
    setErreur('')
    try {
      // On lance les deux requêtes en parallèle avec Promise.all
      // pour ne pas attendre l'une puis l'autre, mais les deux en même temps
      const [resEquipements, resBatiments] = await Promise.all([
        getEquipements(),
        getBatiments()
      ])

      // Le backend retourne toujours { data: [...] }
      // donc on prend .data pour récupérer juste le tableau
      setEquipements(resEquipements.data)
      setBatiments(resBatiments.data)
    } catch (error) {
      console.error('Erreur de chargement des équipements:', error)
      setErreur('Impossible de charger les équipements. Vérifiez que le serveur backend est démarré.')
    } finally {
      setLoading(false)
    }
  }

  const getBatimentNom = (id) => batiments.find(b => b.id === id)?.nom || '—'
  const getStatutInfo = (statut) => STATUTS.find(s => s.value === statut) || STATUTS[0]

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

  // ─── Suppression connectée au backend ──────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet équipement ?')) return

    try {
      // On appelle le vrai endpoint DELETE /equipements/:id
      await deleteEquipement(id)
      // Si la suppression a réussi, on retire l'équipement de la liste affichée
      setEquipements(prev => prev.filter(eq => eq.id !== id))
    } catch (error) {
      // Le backend peut refuser la suppression si l'équipement a des interventions
      // en cours (RG-REF-02) — on affiche le message d'erreur exact du backend
      const message = error.response?.data?.message || 'Erreur lors de la suppression.'
      window.alert(message)
    }
  }

  const handleEdit = (equipement) => {
    setEditEquipement(equipement)
    setForm({ ...equipement })
    setShowModal(true)
  }

  // ─── Création / modification connectée au backend ──────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    // RG-REF-04 : date_installation ne peut pas être dans le futur
    // Cette vérification est aussi faite côté backend, mais on la garde ici
    // pour donner un retour immédiat à l'utilisateur sans attendre le serveur
    if (form.date_installation && new Date(form.date_installation) > new Date()) {
      window.alert("La date d'installation ne peut pas être dans le futur.")
      return
    }

    try {
      if (editEquipement) {
        // Modification d'un équipement existant
        const res = await updateEquipement(editEquipement.id, form)
        setEquipements(prev => prev.map(eq =>
          eq.id === editEquipement.id ? res.data : eq
        ))
      } else {
        // Création d'un nouvel équipement
        const res = await createEquipement(form)
        setEquipements(prev => [...prev, res.data])
      }
      setShowModal(false)
      setEditEquipement(null)
      setForm(emptyForm)
    } catch (error) {
      // Le backend peut refuser la création si :
      // - la référence existe déjà pour ce bâtiment (RG-REF-01, erreur 409)
      // - un champ obligatoire manque (erreur 400)
      const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement.'
      window.alert(message)
    }
  }

  // ─── Affichage pendant le chargement ────────────────────────────────────────
  if (loading) {
    return (
      <div className="equipements">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          Chargement des équipements...
        </p>
      </div>
    )
  }

  // ─── Affichage en cas d'erreur de connexion au backend ──────────────────────
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

      {/* Header */}
      <div className="equipements-header">
        <div className="equipements-filters">
          <div className="search-box">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher un équipement..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select value={filterBatiment} onChange={e => handleBatimentFilterChange(e.target.value)}>
            <option value="">Tous les bâtiments</option>
            {batiments.map(b => (
              <option key={b.id} value={b.id}>{b.nom}</option>
            ))}
          </select>
          <select value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1) }}>
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={() => {
          setEditEquipement(null)
          setForm({ ...emptyForm, batiment_id: filterBatiment || '' })
          setShowModal(true)
        }}>
          <i className="ti ti-plus" aria-hidden="true" />
          Nouvel équipement
        </button>
      </div>

      {/* Grille */}
      {paginated.length === 0 ? (
        <div className="equipements-empty">
          <i className="ti ti-tool-off" aria-hidden="true" />
          <p>Aucun équipement trouvé</p>
        </div>
      ) : (
        <div className="equipements-grid">
          {paginated.map(eq => {
            const statutInfo = getStatutInfo(eq.statut)
            return (
              <div key={eq.id} className="equipement-card">
                <div className="equipement-card-top">
                  <div className="equipement-icon">
                    <i className="ti ti-settings" aria-hidden="true" />
                  </div>
                  <div className="equipement-actions">
                    <button onClick={() => handleEdit(eq)} title="Modifier">
                      <i className="ti ti-edit" aria-hidden="true" />
                    </button>
                    <button onClick={() => handleDelete(eq.id)} title="Supprimer" className="btn-danger">
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="equipement-info">
                  <p className="equipement-nom">{eq.nom}</p>
                  <p className="equipement-reference">Réf. {eq.reference}</p>
                  <span className={`statut-badge ${statutInfo.className}`}>{statutInfo.label}</span>
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
                  Voir la fiche
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="equipements-pagination">
          <p>Affichage {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} équipements</p>
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
              <h2>{editEquipement ? "Modifier l'équipement" : 'Nouvel équipement'}</h2>
              <button onClick={() => setShowModal(false)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    type="text"
                    placeholder="Ex: Climatiseur Hall A"
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Référence</label>
                  <input
                    type="text"
                    placeholder="Ex: CLIM-001"
                    value={form.reference}
                    onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <input
                    type="text"
                    placeholder="Ex: Climatisation"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Bâtiment</label>
                  <select
                    value={form.batiment_id}
                    onChange={e => setForm(f => ({ ...f, batiment_id: e.target.value }))}
                    required
                  >
                    <option value="">Sélectionner un bâtiment</option>
                    {batiments.map(b => (
                      <option key={b.id} value={b.id}>{b.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Marque</label>
                  <input
                    type="text"
                    placeholder="Ex: Daikin"
                    value={form.marque}
                    onChange={e => setForm(f => ({ ...f, marque: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Modèle</label>
                  <input
                    type="text"
                    placeholder="Ex: FTXM50"
                    value={form.modele}
                    onChange={e => setForm(f => ({ ...f, modele: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Numéro de série</label>
                  <input
                    type="text"
                    placeholder="Ex: SN-2024-001"
                    value={form.numero_serie}
                    onChange={e => setForm(f => ({ ...f, numero_serie: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Date d'installation</label>
                  <input
                    type="date"
                    value={form.date_installation}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, date_installation: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Statut</label>
                <select
                  value={form.statut}
                  onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                  required
                >
                  {STATUTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description (optionnel)</label>
                <textarea
                  placeholder="Notes ou précisions sur l'équipement"
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
                  {editEquipement ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}