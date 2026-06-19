import { useState } from 'react'
import './DemandesIntervention.css'

// Mock — à remplacer par GET /demandes-intervention (vue admin : toutes les DI)
const mockDemandes = [
  {
    id: 'di1',
    client: 'DGS Africa',
    equipement: { id: 'e2', nom: 'Groupe Électrogène' },
    batiment: 'Siège Social DGS Africa',
    titre: 'Bruit anormal au démarrage',
    description: "Le groupe électrogène fait un bruit métallique fort au démarrage depuis hier matin.",
    priorite: 'haute',
    statut: 'ouverte',
    created_at: '2026-06-15T09:20:00',
    ot_id: null,
  },
  {
    id: 'di2',
    client: 'SCI Almadies',
    equipement: { id: 'e3', nom: 'Ascenseur Tour A' },
    batiment: 'Tour Almadies',
    titre: "L'ascenseur s'arrête entre deux étages",
    description: "Plusieurs usagers signalent un arrêt brusque entre le 2e et le 3e étage.",
    priorite: 'urgente',
    statut: 'ouverte',
    created_at: '2026-06-16T14:05:00',
    ot_id: null,
  },
  {
    id: 'di3',
    client: 'Logistique SN',
    equipement: { id: 'e4', nom: 'Pompe à Eau' },
    batiment: 'Entrepôt Mbao',
    titre: 'Fuite au niveau du raccord',
    description: 'Petite fuite visible, flaque au sol près de la pompe.',
    priorite: 'normale',
    statut: 'traitee',
    created_at: '2026-06-10T08:00:00',
    ot_id: 'OT-2026-0145',
  },
  {
    id: 'di4',
    client: 'DGS Africa',
    equipement: { id: 'e1', nom: 'Climatiseur Hall A' },
    batiment: 'Siège Social DGS Africa',
    titre: 'Doublon de signalement',
    description: 'Déjà signalé hier par un autre utilisateur.',
    priorite: 'basse',
    statut: 'rejetee',
    created_at: '2026-06-12T11:30:00',
    ot_id: null,
  },
]

const PRIORITES = {
  basse: { label: 'Basse', className: 'prio-basse' },
  normale: { label: 'Normale', className: 'prio-normale' },
  haute: { label: 'Haute', className: 'prio-haute' },
  urgente: { label: 'Urgente', className: 'prio-urgente' },
}

const STATUTS = {
  ouverte: { label: 'Ouverte', className: 'statut-ouverte' },
  traitee: { label: 'Traitée', className: 'statut-traitee' },
  rejetee: { label: 'Rejetée', className: 'statut-rejetee' },
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function DemandesIntervention() {
  const [demandes, setDemandes] = useState(mockDemandes)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  const filtered = demandes.filter(d => {
    const matchSearch =
      d.titre.toLowerCase().includes(search.toLowerCase()) ||
      d.equipement.nom.toLowerCase().includes(search.toLowerCase()) ||
      d.client.toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut ? d.statut === filterStatut : true
    return matchSearch && matchStatut
  })

  const handleRejeter = (id) => {
    if (!window.confirm('Rejeter cette demande ?')) return
    // --- Mode mock : PUT /demandes-intervention/:id/statut { statut: 'rejetee' } ---
    setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut: 'rejetee' } : d))
  }

  const handleConvertir = (id) => {
    if (!window.confirm('Convertir cette demande en intervention curative ?')) return
    // --- Mode mock : POST /demandes-intervention/:id/convertir ---
    // RG-DI-03 : copie titre/description/priorité, type OT forcé à curatif, DI passe à traitee
    const fakeOtId = `OT-${Date.now().toString().slice(-6)}`
    setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut: 'traitee', ot_id: fakeOtId } : d))
  }

  return (
    <div className="demandes">

      {/* Header */}
      <div className="demandes-header">
        <div className="demandes-filters">
          <div className="search-box">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher (titre, équipement, client)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="ouverte">Ouvertes</option>
            <option value="traitee">Traitées</option>
            <option value="rejetee">Rejetées</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="demandes-empty">
          <i className="ti ti-clipboard-off" aria-hidden="true" />
          <p>Aucune demande trouvée</p>
        </div>
      ) : (
        <div className="demandes-list">
          {filtered.map(d => {
            const prioInfo = PRIORITES[d.priorite]
            const statutInfo = STATUTS[d.statut]
            return (
              <div key={d.id} className="demande-card">
                <div className="demande-card-top">
                  <div className="demande-card-titles">
                    <p className="demande-titre">{d.titre}</p>
                    <p className="demande-meta">
                      <i className="ti ti-settings" aria-hidden="true" /> {d.equipement.nom}
                      {' · '}
                      <i className="ti ti-building" aria-hidden="true" /> {d.batiment}
                      {' · '}
                      {d.client}
                    </p>
                  </div>
                  <div className="demande-badges">
                    <span className={`prio-badge ${prioInfo.className}`}>{prioInfo.label}</span>
                    <span className={`statut-badge-di ${statutInfo.className}`}>{statutInfo.label}</span>
                  </div>
                </div>

                <p className="demande-description">{d.description}</p>

                <div className="demande-footer">
                  <span className="demande-date">{formatDateTime(d.created_at)}</span>

                  {d.statut === 'ouverte' && (
                    <div className="demande-actions">
                      <button className="btn-cancel" onClick={() => handleRejeter(d.id)}>
                        <i className="ti ti-x" aria-hidden="true" />
                        Rejeter
                      </button>
                      <button className="btn-primary" onClick={() => handleConvertir(d.id)}>
                        <i className="ti ti-transform" aria-hidden="true" />
                        Convertir en intervention
                      </button>
                    </div>
                  )}

                  {d.statut === 'traitee' && d.ot_id && (
                    <span className="demande-ot-link">
                      <i className="ti ti-link" aria-hidden="true" />
                      Convertie en {d.ot_id}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}