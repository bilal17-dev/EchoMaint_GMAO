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
  const nbTotal    = historique.length
  const nbTermines = historique.filter(o => o.statut === 'terminee').length

  return (
    <div className="fiche-equipement">

      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <div className={`fiche-hero fiche-hero--${equipement.statut || 'actif'}`}>
        <div className="fiche-hero-top">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Retour
          </button>
          <span className={`statut-badge ${statutInfo.className}`}>{statutInfo.label}</span>
        </div>

        <div className="fiche-hero-body">
          <div className="fiche-hero-icon">
            <i className="ti ti-cpu" aria-hidden="true" />
          </div>
          <div className="fiche-hero-info">
            <h1 className="fiche-hero-name">{equipement.nom}</h1>
            <div className="fiche-hero-meta">
              {equipement.reference && (
                <span className="fiche-meta-chip">
                  <i className="ti ti-hash" /> Réf. {equipement.reference}
                </span>
              )}
              {equipement.type && (
                <span className="fiche-meta-chip">
                  <i className="ti ti-tag" /> {equipement.type}
                </span>
              )}
              {equipement.batiment_nom && (
                <span className="fiche-meta-chip">
                  <i className="ti ti-building" /> {equipement.batiment_nom}
                </span>
              )}
              {equipement.client_nom && (
                <span className="fiche-meta-chip">
                  <i className="ti ti-user" /> {equipement.client_nom}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="fiche-kpi-row">
        <div className="fiche-kpi-card">
          <div className="fiche-kpi-icon" style={{ background: '#EFF6FF' }}>
            <i className="ti ti-tools" style={{ color: '#2563EB' }} />
          </div>
          <div className="fiche-kpi-body">
            <p className="fiche-kpi-label">Interventions — 30 jours</p>
            <p className="fiche-kpi-value">{equipement.nb_interventions_30j ?? 0}</p>
          </div>
        </div>
        <div className="fiche-kpi-card">
          <div className="fiche-kpi-icon" style={{ background: '#F5F3FF' }}>
            <i className="ti ti-clipboard-list" style={{ color: '#7C3AED' }} />
          </div>
          <div className="fiche-kpi-body">
            <p className="fiche-kpi-label">Total interventions</p>
            <p className="fiche-kpi-value">{nbTotal}</p>
          </div>
        </div>
        <div className="fiche-kpi-card">
          <div className="fiche-kpi-icon" style={{ background: '#F0FDF4' }}>
            <i className="ti ti-circle-check" style={{ color: '#059669' }} />
          </div>
          <div className="fiche-kpi-body">
            <p className="fiche-kpi-label">Interventions terminées</p>
            <p className="fiche-kpi-value">{nbTermines}</p>
          </div>
        </div>
        <div className="fiche-kpi-card">
          <div className="fiche-kpi-icon" style={{ background: '#FFF7ED' }}>
            <i className="ti ti-calendar-event" style={{ color: '#D97706' }} />
          </div>
          <div className="fiche-kpi-body">
            <p className="fiche-kpi-label">Dernière intervention</p>
            <p className="fiche-kpi-value fiche-kpi-value--sm">{formatDate(equipement.derniere_intervention_date)}</p>
          </div>
        </div>
      </div>

      {/* ── Info grid : caractéristiques + localisation ───────────────────── */}
      <div className="fiche-grid">
        <div className="fiche-card">
          <div className="fiche-card-header">
            <div className="fiche-card-icon" style={{ background: '#EFF6FF' }}>
              <i className="ti ti-settings-2" style={{ color: '#2563EB' }} />
            </div>
            <h2 className="fiche-card-title">Caractéristiques techniques</h2>
          </div>
          <div className="fiche-details">
            <div className="fiche-detail">
              <span>Marque</span>
              <strong>{equipement.marque || '—'}</strong>
            </div>
            <div className="fiche-detail">
              <span>Modèle</span>
              <strong>{equipement.modele || '—'}</strong>
            </div>
            <div className="fiche-detail">
              <span>Numéro de série</span>
              <strong>{equipement.numero_serie || '—'}</strong>
            </div>
            <div className="fiche-detail">
              <span>Date d'installation</span>
              <strong>{formatDate(equipement.date_installation)}</strong>
            </div>
          </div>
          {equipement.description && (
            <div className="fiche-description">
              <i className="ti ti-notes" />
              <p>{equipement.description}</p>
            </div>
          )}
        </div>

        <div className="fiche-card">
          <div className="fiche-card-header">
            <div className="fiche-card-icon" style={{ background: '#F0FDF4' }}>
              <i className="ti ti-map-pin" style={{ color: '#059669' }} />
            </div>
            <h2 className="fiche-card-title">Localisation</h2>
          </div>
          <div className="fiche-details">
            <div className="fiche-detail">
              <span>Bâtiment</span>
              <strong>{equipement.batiment_nom || '—'}</strong>
            </div>
            <div className="fiche-detail">
              <span>Client / Organisation</span>
              <strong>{equipement.client_nom || '—'}</strong>
            </div>
          </div>

          {/* Indicateur statut visuel */}
          <div className={`fiche-statut-visual fiche-statut-visual--${equipement.statut || 'actif'}`}>
            <div className="fiche-statut-dot" />
            <div className="fiche-statut-text">
              <strong>{statutInfo.label}</strong>
              <span>État actuel de l'équipement</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Historique — timeline ─────────────────────────────────────────── */}
      <div className="fiche-card fiche-card--full">
        <div className="fiche-card-header">
          <div className="fiche-card-icon" style={{ background: '#FFF7ED' }}>
            <i className="ti ti-history" style={{ color: '#D97706' }} />
          </div>
          <h2 className="fiche-card-title">Historique des interventions</h2>
          {nbTotal > 0 && (
            <span className="fiche-historique-count">{nbTotal}</span>
          )}
        </div>

        {historique.length === 0 ? (
          <div className="fiche-historique-empty">
            <i className="ti ti-clipboard-off" />
            <p>Aucune intervention enregistrée pour cet équipement.</p>
          </div>
        ) : (
          <div className="historique-timeline">
            {historique.map((ot, idx) => {
              const otStatutInfo = OT_STATUT_LABELS[ot.statut] || OT_STATUT_LABELS.terminee
              const isPreventif  = ot.type === 'preventif'
              return (
                <div
                  key={ot.id}
                  className={`timeline-item${idx === historique.length - 1 ? ' timeline-item--last' : ''}`}
                  onClick={() => navigate(`/interventions/${ot.id}`)}
                >
                  <div className={`timeline-dot timeline-dot--${isPreventif ? 'prev' : 'cur'}`} />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div className="timeline-header-left">
                        <span className={`timeline-type-chip ${isPreventif ? 'chip-type-prev' : 'chip-type-cur'}`}>
                          {isPreventif ? 'Préventif' : 'Curatif'}
                        </span>
                        <p className="timeline-titre">{ot.titre}</p>
                      </div>
                      <div className="timeline-header-right">
                        <span className={`ot-badge ${otStatutInfo.className}`}>{otStatutInfo.label}</span>
                        <i className="ti ti-chevron-right timeline-arrow" />
                      </div>
                    </div>
                    <div className="timeline-meta">
                      <span><i className="ti ti-calendar" /> {formatDate(ot.date_fin_reelle || ot.updated_at)}</span>
                      <span><i className="ti ti-user" /> {ot.technicien_nom || 'Non assigné'}</span>
                    </div>
                    {ot.commentaire_cloture && (
                      <p className="timeline-commentaire">{ot.commentaire_cloture}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}