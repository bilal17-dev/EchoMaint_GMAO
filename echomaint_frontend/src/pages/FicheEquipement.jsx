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
  return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function FicheEquipement() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [equipement, setEquipement] = useState(null)
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  // null = pas d'erreur | 403 = accès refusé | 404 = introuvable | 'reseau' = erreur serveur
  const [erreurCode, setErreurCode] = useState(null)

  // ─── Chargement des données quand l'id change dans l'URL ────────────────────
  // Le tableau [id] en dépendance signifie : recharge à chaque fois que l'id
  // de l'équipement dans l'URL change (navigation d'une fiche à une autre)
  

  const chargerFiche = async () => {
    setLoading(true)
    setErreurCode(null)
    try {
      // On charge d'abord l'équipement seul : c'est lui qui peut retourner 403 ou 404.
      // Si ce premier appel échoue, on ne tente pas de charger l'historique.
      const resEquipement = await getEquipement(id)
      setEquipement(resEquipement.data)

      // L'historique est secondaire : une erreur ici n'empêche pas d'afficher la fiche.
      try {
        const resHistorique = await getHistorique(id)
        setHistorique(resHistorique.data ?? [])
      } catch {
        setHistorique([])
      }
    } catch (error) {
      console.error('Erreur de chargement de la fiche équipement:', error)
      const status = error.response?.status
      // On distingue les trois cas pour afficher un message adapté à l'utilisateur.
      if (status === 403)       setErreurCode(403)
      else if (status === 404)  setErreurCode(404)
      else                      setErreurCode('reseau')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    chargerFiche()
  }, [id])

  if (loading) {
    return (
      <div className="fiche-equipement">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          Chargement de la fiche équipement...
        </p>
      </div>
    )
  }

  if (erreurCode !== null) {
    // Icône et message adaptés à la nature de l'erreur
    const config = {
      403: { icone: 'ti-lock',         message: "Vous n'avez pas accès à cet équipement." },
      404: { icone: 'ti-database-off', message: 'Équipement introuvable.' },
      reseau: { icone: 'ti-wifi-off',  message: 'Impossible de charger cet équipement. Vérifiez votre connexion.' },
    }
    const { icone, message } = config[erreurCode] ?? config.reseau
    return (
      <div className="fiche-equipement">
        <div className="fiche-empty">
          <i className={`ti ${icone}`} aria-hidden="true" />
          <p>{message}</p>
          <button className="btn-outline" onClick={() => navigate('/equipements')}>
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  if (!equipement) return null

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
                <div
                  key={ot.id}
                  className="historique-item historique-item-clickable"
                  onClick={() => navigate(`/interventions/${ot.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="historique-item-top">
                    <div>
                      <p className="historique-titre">{ot.titre}</p>
                      <p className="historique-meta">
                        {ot.type === 'preventif' ? 'Préventif' : 'Curatif'} · {formatDate(ot.date_fin_reelle || ot.updated_at)} · {ot.technicien_nom || 'Non assigné'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`ot-badge ${otStatutInfo.className}`}>{otStatutInfo.label}</span>
                      <i className="ti ti-chevron-right" style={{ color: '#94a3b8', fontSize: '14px' }} />
                    </div>
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