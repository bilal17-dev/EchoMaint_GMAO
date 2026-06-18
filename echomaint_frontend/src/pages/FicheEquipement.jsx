import { useParams, useNavigate } from 'react-router-dom'
import './FicheEquipement.css'

// Mock — à remplacer par GET /equipements/:id
// (le backend renvoie l'équipement + bâtiment parent + client + stats 30 jours)
const mockFiche = {
  e1: {
    id: 'e1',
    nom: 'Climatiseur Hall A',
    reference: 'CLIM-001',
    type: 'Climatisation',
    marque: 'Daikin',
    modele: 'FTXM50',
    numero_serie: 'SN-2024-001',
    date_installation: '2024-03-12',
    statut: 'actif',
    description: "Climatiseur principal du hall d'accueil.",
    batiment: { id: '1', nom: 'Siège Social DGS Africa', adresse: 'Route de Ngor, Dakar' },
    client: { id: 'c1', nom: 'DGS Africa' },
    stats: { nb_interventions_30j: 2, derniere_intervention_date: '2026-05-28' }
  },
  e2: {
    id: 'e2',
    nom: 'Groupe Électrogène',
    reference: 'GE-002',
    type: 'Énergie',
    marque: 'Caterpillar',
    modele: 'C15',
    numero_serie: 'SN-2023-114',
    date_installation: '2023-06-01',
    statut: 'en_panne',
    description: '',
    batiment: { id: '1', nom: 'Siège Social DGS Africa', adresse: 'Route de Ngor, Dakar' },
    client: { id: 'c1', nom: 'DGS Africa' },
    stats: { nb_interventions_30j: 4, derniere_intervention_date: '2026-06-10' }
  },
}

// Mock — à remplacer par GET /equipements/:id/historique
const mockHistorique = {
  e1: [
    { id: 'ot1', titre: 'Révision filtre climatiseur', type: 'preventif', statut: 'terminee', date_fin_reelle: '2026-05-28', duree_reelle_minutes: 45, technicien: 'Modou Diop', commentaire_cloture: 'Filtre remplacé, niveau gaz vérifié.' },
    { id: 'ot2', titre: 'Contrôle annuel', type: 'preventif', statut: 'terminee', date_fin_reelle: '2026-02-14', duree_reelle_minutes: 60, technicien: 'Modou Diop', commentaire_cloture: 'Aucune anomalie détectée.' },
  ],
  e2: [
    { id: 'ot3', titre: 'Panne démarrage groupe', type: 'curatif', statut: 'terminee', date_fin_reelle: '2026-06-10', duree_reelle_minutes: 120, technicien: 'Awa Ndiaye', commentaire_cloture: 'Batterie remplacée.' },
    { id: 'ot4', titre: 'Fuite huile moteur', type: 'curatif', statut: 'annulee', date_fin_reelle: '2026-04-02', duree_reelle_minutes: 0, technicien: 'Awa Ndiaye', commentaire_cloture: 'Doublon avec OT précédent.' },
  ],
}

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

  const equipement = mockFiche[id]
  const historique = mockHistorique[id] || []

  if (!equipement) {
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

  const statutInfo = STATUT_LABELS[equipement.statut]

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
            <p className="fiche-stat-value">{equipement.stats.nb_interventions_30j}</p>
          </div>
        </div>
        <div className="fiche-stat-card">
          <div className="fiche-stat-icon" style={{ background: '#F0FDF4' }}>
            <i className="ti ti-calendar-check" style={{ color: '#22C55E' }} aria-hidden="true" />
          </div>
          <div>
            <p className="fiche-stat-label">Dernière intervention</p>
            <p className="fiche-stat-value">{formatDate(equipement.stats.derniere_intervention_date)}</p>
          </div>
        </div>
      </div>

      {/* Caractéristiques + Localisation */}
      <div className="fiche-grid">
        <div className="fiche-card">
          <h2>Caractéristiques techniques</h2>
          <div className="fiche-details">
            <div className="fiche-detail"><span>Type</span><strong>{equipement.type}</strong></div>
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
            <div className="fiche-detail"><span>Bâtiment</span><strong>{equipement.batiment.nom}</strong></div>
            <div className="fiche-detail"><span>Adresse</span><strong>{equipement.batiment.adresse}</strong></div>
            <div className="fiche-detail"><span>Client</span><strong>{equipement.client.nom}</strong></div>
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
              const otStatutInfo = OT_STATUT_LABELS[ot.statut]
              return (
                <div key={ot.id} className="historique-item">
                  <div className="historique-item-top">
                    <div>
                      <p className="historique-titre">{ot.titre}</p>
                      <p className="historique-meta">
                        {ot.type === 'preventif' ? 'Préventif' : 'Curatif'} · {formatDate(ot.date_fin_reelle)} · {ot.technicien}
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
