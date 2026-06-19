import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './Stats.css'

const mockBatiments = [
  { id: '1', nom: 'Siège Social DGS Africa' },
  { id: '2', nom: 'Tour Almadies' },
  { id: '3', nom: 'Entrepôt Mbao' },
  { id: '4', nom: 'Immeuble Plateau' },
]

const mockTechniciens = [
  { id: 't1', nom: 'Modou Diop' },
  { id: 't2', nom: 'Awa Ndiaye' },
]

const STATUTS = ['a_planifier', 'planifiee', 'assignee', 'en_cours', 'terminee', 'annulee']
const STATUT_LABELS = {
  a_planifier: 'À planifier', planifiee: 'Planifiée', assignee: 'Assignée',
  en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée',
}
const TYPES = ['preventif', 'curatif']

// Mock OT pour export — à remplacer par GET /exports/interventions?format=csv&...
const mockOTs = [
  { id: 'ot1', titre: 'Révision filtre climatiseur', type: 'preventif', statut: 'terminee', priorite: 'basse', equipement: 'Climatiseur Hall A', batiment: 'Siège Social DGS Africa', technicien: 'Modou Diop', date_planifiee: '2026-05-28', date_debut_reelle: '2026-05-28', date_fin_reelle: '2026-05-28', duree_reelle_minutes: 45, nb_reouvertures: 0 },
  { id: 'ot2', titre: 'Panne démarrage groupe', type: 'curatif', statut: 'en_cours', priorite: 'haute', equipement: 'Groupe Électrogène', batiment: 'Siège Social DGS Africa', technicien: 'Awa Ndiaye', date_planifiee: '2026-06-15', date_debut_reelle: '2026-06-15', date_fin_reelle: '', duree_reelle_minutes: '', nb_reouvertures: 0 },
  { id: 'ot3', titre: 'Contrôle ascenseur', type: 'preventif', statut: 'assignee', priorite: 'moyenne', equipement: 'Ascenseur Tour A', batiment: 'Tour Almadies', technicien: 'Modou Diop', date_planifiee: '2026-06-20', date_debut_reelle: '', date_fin_reelle: '', duree_reelle_minutes: '', nb_reouvertures: 0 },
  { id: 'ot4', titre: 'Fuite pompe à eau', type: 'curatif', statut: 'a_planifier', priorite: 'haute', equipement: 'Pompe à Eau', batiment: 'Entrepôt Mbao', technicien: '', date_planifiee: '2026-06-22', date_debut_reelle: '', date_fin_reelle: '', duree_reelle_minutes: '', nb_reouvertures: 0 },
  { id: 'ot5', titre: 'Vérification compresseur', type: 'preventif', statut: 'annulee', priorite: 'basse', equipement: 'Compresseur', batiment: 'Entrepôt Mbao', technicien: 'Awa Ndiaye', date_planifiee: '2026-05-10', date_debut_reelle: '', date_fin_reelle: '', duree_reelle_minutes: '', nb_reouvertures: 0 },
  { id: 'ot6', titre: 'Maintenance onduleur', type: 'preventif', statut: 'terminee', priorite: 'moyenne', equipement: 'Onduleur', batiment: 'Immeuble Plateau', technicien: 'Modou Diop', date_planifiee: '2026-04-30', date_debut_reelle: '2026-04-30', date_fin_reelle: '2026-04-30', duree_reelle_minutes: 60, nb_reouvertures: 1 },
]

function exportInterventionsCSV(data) {
  const headers = ['ID', 'Titre', 'Type', 'Statut', 'Priorité', 'Équipement', 'Bâtiment', 'Technicien', 'Date planifiée', 'Date début', 'Date fin', 'Durée (min)', 'Réouvertures']
  const rows = data.map(ot => [
    ot.id, ot.titre, ot.type, ot.statut, ot.priorite,
    ot.equipement, ot.batiment, ot.technicien || 'Non assigné',
    ot.date_planifiee, ot.date_debut_reelle, ot.date_fin_reelle,
    ot.duree_reelle_minutes, ot.nb_reouvertures
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
  // eslint-disable-next-line no-unused-vars
  const { t } = useTranslation()

  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBatiment, setFilterBatiment] = useState('')
  const [filterTechnicien, setFilterTechnicien] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const filtered = mockOTs.filter(ot => {
    const matchStatut = filterStatut ? ot.statut === filterStatut : true
    const matchType = filterType ? ot.type === filterType : true
    const matchBat = filterBatiment ? mockBatiments.find(b => b.id === filterBatiment)?.nom === ot.batiment : true
    const matchTech = filterTechnicien ? mockTechniciens.find(t => t.id === filterTechnicien)?.nom === ot.technicien : true
    const matchDebut = dateDebut ? new Date(ot.date_planifiee) >= new Date(dateDebut) : true
    const matchFin = dateFin ? new Date(ot.date_planifiee) <= new Date(dateFin) : true
    return matchStatut && matchType && matchBat && matchTech && matchDebut && matchFin
  })

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
                // GET /exports/interventions?format=pdf&statut=...&type=...&batiment_id=...
                window.alert('Export PDF : disponible une fois le backend J9 connecté.\nEndpoint : GET /exports/interventions?format=pdf')
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
            {mockBatiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
          <select value={filterTechnicien} onChange={e => setFilterTechnicien(e.target.value)}>
            <option value="">Tous les techniciens</option>
            {mockTechniciens.map(tech => <option key={tech.id} value={tech.id}>{tech.nom}</option>)}
          </select>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} title="Date début" />
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} title="Date fin" />
        </div>

        {/* Aperçu du tableau */}
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
                    <td>{ot.equipement}</td>
                    <td>{ot.batiment}</td>
                    <td>{ot.technicien || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td>{ot.date_planifiee || '—'}</td>
                    <td>{ot.duree_reelle_minutes || '—'}</td>
                    <td className="stats-td-center">{ot.nb_reouvertures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section export KPI — redirige vers le Dashboard */}
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