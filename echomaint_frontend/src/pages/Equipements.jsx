import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Equipements.css'

// Mock bâtiments — à remplacer par GET /batiments
const mockBatiments = [
  { id: '1', nom: 'Siège Social DGS Africa' },
  { id: '2', nom: 'Tour Almadies' },
  { id: '3', nom: 'Entrepôt Mbao' },
  { id: '4', nom: 'Immeuble Plateau' },
  { id: '5', nom: 'Agence Thiès' },
  { id: '6', nom: 'Centre Technique' },
]

// Mock équipements — modèle v2.1 (reference, type, marque, modele, numero_serie, date_installation, statut)
const mockEquipements = [
  { id: 'e1', batiment_id: '1', nom: 'Climatiseur Hall A', reference: 'CLIM-001', type: 'Climatisation', marque: 'Daikin', modele: 'FTXM50', numero_serie: 'SN-2024-001', date_installation: '2024-03-12', statut: 'actif', description: '' },
  { id: 'e2', batiment_id: '1', nom: 'Groupe Électrogène', reference: 'GE-002', type: 'Énergie', marque: 'Caterpillar', modele: 'C15', numero_serie: 'SN-2023-114', date_installation: '2023-06-01', statut: 'en_panne', description: '' },
  { id: 'e3', batiment_id: '2', nom: 'Ascenseur Tour A', reference: 'ASC-003', type: 'Ascenseur', marque: 'Otis', modele: 'Gen2', numero_serie: 'SN-2022-067', date_installation: '2022-11-20', statut: 'actif', description: '' },
  { id: 'e4', batiment_id: '3', nom: 'Pompe à Eau', reference: 'POM-004', type: 'Hydraulique', marque: 'Grundfos', modele: 'CR15', numero_serie: 'SN-2024-090', date_installation: '2024-01-15', statut: 'hors_service', description: '' },
  { id: 'e5', batiment_id: '3', nom: 'Compresseur', reference: 'COMP-005', type: 'Pneumatique', marque: 'Atlas Copco', modele: 'GA22', numero_serie: 'SN-2023-201', date_installation: '2023-09-08', statut: 'actif', description: '' },
  { id: 'e6', batiment_id: '4', nom: 'Onduleur', reference: 'OND-006', type: 'Énergie', marque: 'APC', modele: 'SRT3000', numero_serie: 'SN-2024-045', date_installation: '2024-05-02', statut: 'actif', description: '' },
]

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

  const [equipements, setEquipements] = useState(mockEquipements)
  const [search, setSearch] = useState('')
  const [filterBatiment, setFilterBatiment] = useState(batimentFilterFromUrl)
  const [filterStatut, setFilterStatut] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editEquipement, setEditEquipement] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const getBatimentNom = (id) => mockBatiments.find(b => b.id === id)?.nom || '—'
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

  const handleDelete = (id) => {
    // Reflète RG-REF-02 côté backend : soft delete impossible si OT actifs sur l'équipement
    if (window.confirm('Supprimer cet équipement ?')) {
      setEquipements(prev => prev.filter(eq => eq.id !== id))
    }
  }

  const handleEdit = (equipement) => {
    setEditEquipement(equipement)
    setForm({ ...equipement })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // RG-REF-04 : date_installation ne peut pas être dans le futur
    if (new Date(form.date_installation) > new Date()) {
      window.alert("La date d'installation ne peut pas être dans le futur.")
      return
    }

    // RG-REF-01 : référence unique par bâtiment
    const doublon = equipements.find(eq =>
      eq.reference === form.reference &&
      eq.batiment_id === form.batiment_id &&
      eq.id !== editEquipement?.id
    )
    if (doublon) {
      window.alert('Cette référence existe déjà pour ce bâtiment.')
      return
    }

    if (editEquipement) {
      setEquipements(prev => prev.map(eq =>
        eq.id === editEquipement.id ? { ...eq, ...form } : eq
      ))
    } else {
      setEquipements(prev => [...prev, { id: `e${Date.now()}`, ...form }])
    }
    setShowModal(false)
    setEditEquipement(null)
    setForm(emptyForm)
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
            {mockBatiments.map(b => (
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
                    required
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
                    {mockBatiments.map(b => (
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
                    required
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
