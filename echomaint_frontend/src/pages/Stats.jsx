import { useState, useEffect } from 'react'
import './Stats.css'

// On remplace mockOTs, mockBatiments et mockTechniciens
// par les vraies fonctions connectées au backend
import { getInterventions } from '../api/interventions.api'
import { getBatiments } from '../api/batiments.api'
import { getTechniciens } from '../api/utilisateurs.api'

const STATUTS = ['planifiee', 'assignee', 'en_cours', 'terminee', 'annulee']
const STATUT_LABELS = {
  planifiee: 'Planifiée', assignee: 'Assignée', en_cours: 'En cours',
  terminee: 'Terminée', annulee: 'Annulée',
}
const TYPES = ['preventif', 'curatif']

/**
 * Exporte les interventions filtrées en fichier CSV directement depuis le navigateur.
 * C'est un export "côté client" différent de l'export backend /exports/interventions
 * qui génère le fichier côté serveur avec plus de données.
 */
function exportInterventionsCSV(data) {
  const headers = ['ID', 'Titre', 'Type', 'Statut', 'Priorité', 'Équipement', 'Bâtiment', 'Technicien', 'Date planifiée', 'Durée (min)', 'Réouvertures']
  const rows = data.map(ot => [
    ot.id,
    ot.titre,
    ot.type,
    ot.statut,
    ot.priorite,
    ot.equipement_nom || '—',
    ot.batiment_nom || '—',
    ot.technicien_nom ? `${ot.technicien_prenom || ''} ${ot.technicien_nom}`.trim() : 'Non assigné',
    ot.date_planifiee ? new Date(ot.date_planifiee).toLocaleDateString('fr-FR') : '—',
    ot.duree_reelle_minutes || '—',
    ot.reouvertures?.length || 0
  ])

  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `echomaint_interventions_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Stats() {
  const [interventions, setInterventions] = useState([])
  const [batiments, setBatiments] = useState([])
  const [techniciens, setTechniciens] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBatiment, setFilterBatiment] = useState('')
  const [filterTechnicien, setFilterTechnicien] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  // ─── Chargement initial ───────────────────────────────────────────────────
  useEffect(() => {
    chargerDonnees()
  }, [])

  const chargerDonnees = async () => {
    setLoading(true)
    setErreur('')
    try {
      // On charge toutes les interventions + bâtiments + techniciens en parallèle
      const [resInterventions, resBatiments, resTechniciens] = await Promise.all([
        getInterventions(),
        getBatiments(),
        getTechniciens()
      ])

      setInterventions(resInterventions.data)
      setBatiments(resBatiments.data)
      setTechniciens(resTechniciens.data)
    } catch (error) {
      console.error('Erreur de chargement des statistiques:', error)
      setErreur('Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Filtrage côté frontend ───────────────────────────────────────────────
  const filtered = interventions.filter(ot => {
    if (filterStatut && ot.statut !== filterStatut) return false
    if (filterType && ot.type !== filterType) return false
    if (filterBatiment && ot.batiment_id !== filterBatiment) return false
    if (filterTechnicien && ot.technicien_id !== filterTechnicien) return false
    if (dateDebut && new Date(ot.date_planifiee) < new Date(dateDebut)) return false
    if (dateFin && new Date(ot.date_planifiee) > new Date(dateFin)) return false
    return true
  })

  if (loading) {
    return (
      <div className="stats">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          Chargement des données...
        </p>
      </div>
    )
  }

  if (erreur) {
    return (
      <div className="stats">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
          {erreur}
        </p>
      </div>
    )
  }

  return (
    <div className="stats">

      {/* Section export interventions */}
      <div className="stats-section">
        <div className="stats-section-header">
          <div>
            <h2>Export — Liste des interventions</h2>
            <p>Filtrez puis exportez la liste des OT au format CSV ou PDF.</p>
          </div>
          <div className="stats-export-btns">
            <button
              className="btn-export"
              onClick={() => exportInterventionsCSV(filtered)}
            >
              <i className="ti ti-file-type-csv" aria-hidden="true" />
              Export CSV ({filtered.length} OT)
            </button>
            <button
              className="btn-export btn-export-pdf"
              onClick={() => {
                // Construit les paramètres de filtre pour l'endpoint backend
                const params = new URLSearchParams()
                params.set('format', 'pdf')
                if (filterStatut) params.set('statut', filterStatut)
                if (filterType) params.set('type', filterType)
                if (filterBatiment) params.set('batiment_id', filterBatiment)
                if (filterTechnicien) params.set('technicien_id', filterTechnicien)
                if (dateDebut) params.set('date_planifiee_debut', dateDebut)
                if (dateFin) params.set('date_planifiee_fin', dateFin)
                window.open(
                  `${import.meta.env.VITE_API_URL}/exports/interventions?${params.toString()}`,
                  '_blank'
                )
              }}
            >
              <i className="ti ti-file-type-pdf" aria-hidden="true" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="stats-filters">
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t} value={t}>{t === 'preventif' ? 'Préventif' : 'Curatif'}</option>)}
          </select>
          <select value={filterBatiment} onChange={e => setFilterBatiment(e.target.value)}>
            <option value="">Tous les bâtiments</option>
            {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
          <select value={filterTechnicien} onChange={e => setFilterTechnicien(e.target.value)}>
            <option value="">Tous les techniciens</option>
            {techniciens.map(tech => <option key={tech.id} value={tech.id}>{tech.prenom} {tech.nom}</option>)}
          </select>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} title="Date début" />
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} title="Date fin" />
        </div>

        {/* Tableau */}
        {filtered.length === 0 ? (
          <p className="stats-empty">Aucune intervention trouvée avec ces filtres.</p>
        ) : (
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Équipement</th>
                  <th>Bâtiment</th>
                  <th>Technicien</th>
                  <th>Date planifiée</th>
                  <th>Durée (min)</th>
                  <th>Réouvertures</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ot => (
                  <tr key={ot.id}>
                    <td className="stats-td-titre">{ot.titre}</td>
                    <td>
                      <span className={`stats-chip ${ot.type === 'preventif' ? 'chip-prev' : 'chip-cur'}`}>
                        {ot.type === 'preventif' ? 'Préventif' : 'Curatif'}
                      </span>
                    </td>
                    <td>
                      <span className={`stats-chip stats-chip-${ot.statut}`}>
                        {STATUT_LABELS[ot.statut]}
                      </span>
                    </td>
                    <td>{ot.priorite}</td>
                    <td>{ot.equipement_nom || '—'}</td>
                    <td>{ot.batiment_nom || '—'}</td>
                    <td>{ot.technicien_nom ? `${ot.technicien_prenom || ''} ${ot.technicien_nom}`.trim() : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td>{ot.date_planifiee ? new Date(ot.date_planifiee).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{ot.duree_reelle_minutes || '—'}</td>
                    <td className="stats-td-center">{ot.reouvertures?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section export KPI */}
      <div className="stats-section stats-section-kpi">
        <div className="stats-section-header">
          <div>
            <h2>Export — Tableau de bord KPI</h2>
            <p>Les exports CSV et PDF du tableau de bord sont disponibles directement depuis la page Tableau de bord.</p>
          </div>
          <a href="/dashboard" className="btn-export">
            <i className="ti ti-layout-dashboard" aria-hidden="true" />
            Aller au tableau de bord
          </a>
        </div>
      </div>

    </div>
  )
}