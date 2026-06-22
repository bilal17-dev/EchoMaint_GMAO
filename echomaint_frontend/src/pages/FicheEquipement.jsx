import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './FicheEquipement.css'

// On remplace mockFiche et mockHistorique par les vraies fonctions backend
import { getEquipement, getHistorique } from '../api/equipements.api'

const STATUT_LABELS = {
  actif: { label: 'Actif', className: 'badge-actif' },
  en_panne: { label: 'En panne', className: 'badge-en-panne' },
  hors_service: { label: 'Hors service', className: 'badge-hors-service' },
}

const OT_STATUT_LABELS = {
  planifiee: { label: 'Planifiée', className: 'ot-badge-planifiee' },
  assignee: { label: 'Assignée', className: 'ot-badge-assignee' },
  en_cours: { label: 'En cours', className: 'ot-badge-en-cours' },
  terminee: { label: 'Terminée', className: 'ot-badge-terminee' },
  annulee: { label: 'Annulée', className: 'ot-badge-annulee' },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function FicheEquipement() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [equipement, setEquipement] = useState(null)
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  // ─── Chargement des données quand l'id change dans l'URL ────────────────────
  // Le tableau [id] en dépendance signifie : recharge à chaque fois que l'id
  // de l'équipement dans l'URL change (navigation d'une fiche à une autre)
  useEffect(() => {
    chargerFiche()
  }, [id])

  const chargerFiche = async () => {
    setLoading(true)
    setErreur('')
    try {
      // GET /equipements/:id renvoie l'équipement avec bâtiment, client et stats 30j
      // GET /equipements/:id/historique renvoie la liste des OT terminés/annulés
      const [resEquipement, resHistorique] = await Promise.all([
        getEquipement(id),
        getHistorique(id)
      ])

      setEquipement(resEquipement.data)
      setHistorique(resHistorique.data)
    } catch (error) {
      console.error('Erreur de chargement de la fiche équipement:', error)
      setErreur('Impossible de charger cet équipement.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fiche-equipement">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          Chargement de la fiche équipement...
        </p>
      </div>
    )
  }

  if (erreur || !equipement) {
    return (
      <div className="fiche-equipement">
        <div className="fiche-empty">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          <p>Équipement introuvable.</p>
          <button className="btn-outline" onClick={() => navigate('/equipements')}>
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  const statutInfo = STATUT_LABELS[equipement.statut] || STATUT_LABELS.actif

  return (
    <div className="fiche-equipement">

      {/* Header */}
      <div className="fiche-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Retour
        </button>

        <div className="fiche-header-title">
          <div className="fiche-icon">
            <i className="ti ti-settings" aria-hidden="true" />
          </div>
          <div>
            <h1>{equipement.nom}</h1>
            <p>Réf. {equipement.reference}</p>
          </div>
        </div>

        <span className={`statut-badge ${statutInfo.className}`}>{statutInfo.label}</span>
      </div>

      {/* Stats 30 jours */}
      <div className="fiche-stats">
        <div className="fiche-stat-card">
          <div className="fiche-stat-icon" style={{ background: '#EFF6FF' }}>
            <i className="ti ti-tools" style={{ color: '#2563EB' }} aria-hidden="true" />
          </div>
          <div>
            <p className="fiche-stat-label">Interventions (30 derniers jours)</p>
            {/* nb_interventions_30j vient du calcul fait par le backend dans EquipementController.show */}
            <p className="fiche-stat-value">{equipement.nb_interventions_30j ?? 0}</p>
          </div>
        </div>
        <div className="fiche-stat-card">
          <div className="fiche-stat-icon" style={{ background: '#F0FDF4' }}>
            <i className="ti ti-calendar-check" style={{ color: '#22C55E' }} aria-hidden="true" />
          </div>
          <div>
            <p className="fiche-stat-label">Dernière intervention</p>
            <p className="fiche-stat-value">{formatDate(equipement.derniere_intervention_date)}</p>
          </div>
        </div>
      </div>

      {/* Caractéristiques + Localisation */}
      <div className="fiche-grid">
        <div className="fiche-card">
          <h2>Caractéristiques techniques</h2>
          <div className="fiche-details">
            <div className="fiche-detail"><span>Type</span><strong>{equipement.type || '—'}</strong></div>
            <div className="fiche-detail"><span>Marque</span><strong>{equipement.marque || '—'}</strong></div>
            <div className="fiche-detail"><span>Modèle</span><strong>{equipement.modele || '—'}</strong></div>
            <div className="fiche-detail"><span>Numéro de série</span><strong>{equipement.numero_serie || '—'}</strong></div>
            <div className="fiche-detail"><span>Date d'installation</span><strong>{formatDate(equipement.date_installation)}</strong></div>
          </div>
          {equipement.description && (
            <p className="fiche-description">{equipement.description}</p>
          )}
        </div>

        <div className="fiche-card">
          <h2>Localisation</h2>
          <div className="fiche-details">
            {/* batiment_nom et client_nom viennent des jointures faites dans Equipement.findById */}
            <div className="fiche-detail"><span>Bâtiment</span><strong>{equipement.batiment_nom || '—'}</strong></div>
            <div className="fiche-detail"><span>Client</span><strong>{equipement.client_nom || '—'}</strong></div>
          </div>
        </div>
      </div>

      {/* Historique des interventions */}
      <div className="fiche-card">
        <h2>Historique des interventions</h2>
        {historique.length === 0 ? (
          <p className="fiche-historique-empty">Aucune intervention enregistrée pour cet équipement.</p>
        ) : (
          <div className="historique-list">
            {historique.map(ot => {
              const otStatutInfo = OT_STATUT_LABELS[ot.statut] || OT_STATUT_LABELS.terminee
              return (
                <div key={ot.id} className="historique-item">
                  <div className="historique-item-top">
                    <div>
                      <p className="historique-titre">{ot.titre}</p>
                      <p className="historique-meta">
                        {ot.type === 'preventif' ? 'Préventif' : 'Curatif'} · {formatDate(ot.date_fin_reelle || ot.updated_at)} · {ot.technicien_nom || 'Non assigné'}
                      </p>
                    </div>
                    <span className={`ot-badge ${otStatutInfo.className}`}>{otStatutInfo.label}</span>
                  </div>
                  {ot.commentaire_cloture && (
                    <p className="historique-commentaire">{ot.commentaire_cloture}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}