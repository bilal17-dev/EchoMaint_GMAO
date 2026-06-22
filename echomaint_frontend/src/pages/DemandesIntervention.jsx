import { useState, useEffect } from 'react'
import './DemandesIntervention.css'

// On remplace mockDemandes par les vraies fonctions connectées au backend
import { getDemandes, convertirDemande } from '../api/demandes.api'

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
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  // ─── Chargement initial ───────────────────────────────────────────────────
  useEffect(() => {
    chargerDemandes()
  }, [])

  const chargerDemandes = async () => {
    setLoading(true)
    setErreur('')
    try {
      const res = await getDemandes()
      setDemandes(res.data)
    } catch (error) {
      console.error('Erreur de chargement des demandes:', error)
      setErreur('Impossible de charger les demandes d\'intervention.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = demandes.filter(d => {
    const matchSearch =
      d.titre.toLowerCase().includes(search.toLowerCase()) ||
      (d.equipement_nom || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.client_nom || '').toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut ? d.statut === filterStatut : true
    return matchSearch && matchStatut
  })

  /**
   * NOTE IMPORTANTE :
   * Le backend actuel (DemandeInterventionController.js) n'a PAS d'endpoint
   * pour rejeter une demande, seulement /convertir.
   * On garde donc le rejet en mode "non disponible" en attendant
   * que Sokna ajoute cette route si besoin.
   */
  const handleRejeter = (id) => {
    window.alert('Le rejet de demande n\'est pas encore disponible côté backend. Demande à Sokna d\'ajouter PUT /demandes-intervention/:id/statut.')
  }

  const handleConvertir = async (id) => {
    if (!window.confirm('Convertir cette demande en intervention curative ?')) return

    try {
      // Appel réel à POST /demandes-intervention/:id/convertir
      // RG-DI-03 : le backend copie titre/description/priorité, force le type à curatif
      const res = await convertirDemande(id)

      // On met à jour la demande dans la liste avec le lien vers le nouvel OT
      setDemandes(prev => prev.map(d =>
        d.id === id ? { ...d, statut: 'traitee', intervention_id: res.data.id } : d
      ))
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la conversion.'
      window.alert(message)
    }
  }

  if (loading) {
    return (
      <div className="demandes">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          Chargement des demandes...
        </p>
      </div>
    )
  }

  if (erreur) {
    return (
      <div className="demandes">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
          {erreur}
        </p>
      </div>
    )
  }

  return (
    <div className="demandes">

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

      {filtered.length === 0 ? (
        <div className="demandes-empty">
          <i className="ti ti-clipboard-off" aria-hidden="true" />
          <p>Aucune demande trouvée</p>
        </div>
      ) : (
        <div className="demandes-list">
          {filtered.map(d => {
            const prioInfo = PRIORITES[d.priorite] || PRIORITES.normale
            const statutInfo = STATUTS[d.statut] || STATUTS.ouverte
            return (
              <div key={d.id} className="demande-card">
                <div className="demande-card-top">
                  <div className="demande-card-titles">
                    <p className="demande-titre">{d.titre}</p>
                    <p className="demande-meta">
                      <i className="ti ti-settings" aria-hidden="true" /> {d.equipement_nom}
                      {' · '}
                      <i className="ti ti-building" aria-hidden="true" /> {d.batiment_nom || '—'}
                      {' · '}
                      {d.client_nom}
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

                  {d.statut === 'traitee' && d.intervention_id && (
                    <span className="demande-ot-link">
                      <i className="ti ti-link" aria-hidden="true" />
                      Convertie en intervention
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