import { useState, useEffect } from 'react'
import './Stats.css'
import { getInterventions } from '../api/interventions.api'
import { getBatiments } from '../api/batiments.api'
import { getTechniciens } from '../api/utilisateurs.api'

const STATUTS = ['planifiee', 'assignee', 'en_cours', 'terminee', 'annulee']
const STATUT_LABELS = {
  planifiee: 'Planifiée', assignee: 'Assignée', en_cours: 'En cours',
  terminee: 'Terminée', annulee: 'Annulée',
}
const TYPES = ['preventif', 'curatif']

function exportInterventionsCSV(data) {
  const headers = ['ID', 'Titre', 'Type', 'Statut', 'Priorité', 'Équipement', 'Bâtiment', 'Technicien', 'Date planifiée', 'Durée (min)']
  const rows = data.map(ot => [
    ot.id,
    `"${(ot.titre || '').replace(/"/g, '""')}"`,
    ot.type,
    ot.statut,
    ot.priorite,
    ot.equipement_nom || '—',
    ot.batiment_nom || '—',
    ot.technicien_nom ? `${ot.technicien_prenom || ''} ${ot.technicien_nom}`.trim() : 'Non assigné',
    ot.date_planifiee ? new Date(ot.date_planifiee).toLocaleDateString('fr-FR') : '—',
    ot.duree_reelle_minutes || '—',
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

async function exportAvecToken(url, nomFichier) {
  try {
    const token = localStorage.getItem('echomaint_token')
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      window.alert(err.message || 'Erreur lors de l\'export.')
      return
    }
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = nomFichier
    a.click()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.alert('Erreur réseau lors de l\'export.')
  }
}

export default function Stats() {
  const [interventions,   setInterventions]   = useState([])
  const [batiments,       setBatiments]       = useState([])
  const [techniciens,     setTechniciens]     = useState([])
  const [loading,         setLoading]         = useState(true)
  const [erreur,          setErreur]          = useState('')

  const [filterStatut,    setFilterStatut]    = useState('')
  const [filterType,      setFilterType]      = useState('')
  const [filterBatiment,  setFilterBatiment]  = useState('')
  const [filterTechnicien,setFilterTechnicien]= useState('')
  const [dateDebut,       setDateDebut]       = useState('')
  const [dateFin,         setDateFin]         = useState('')

  useEffect(() => { chargerDonnees() }, [])

  const chargerDonnees = async () => {
    setLoading(true); setErreur('')
    try {
      const [resI, resB, resT] = await Promise.all([
        getInterventions(),
        getBatiments(),
        getTechniciens()
      ])
      setInterventions(Array.isArray(resI?.data) ? resI.data : [])
      setBatiments(Array.isArray(resB?.data) ? resB.data : [])
      setTechniciens(Array.isArray(resT?.data) ? resT.data : [])
    } catch (error) {
      console.error('Erreur chargement stats:', error)
      setErreur('Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = interventions.filter(ot => {
    if (filterStatut    && ot.statut       !== filterStatut)    return false
    if (filterType      && ot.type         !== filterType)      return false
    if (filterBatiment  && ot.batiment_id  !== filterBatiment)  return false
    if (filterTechnicien&& ot.technicien_id!== filterTechnicien)return false
    if (dateDebut && new Date(ot.date_planifiee) < new Date(dateDebut)) return false
    if (dateFin   && new Date(ot.date_planifiee) > new Date(dateFin))   return false
    return true
  })

  const buildExportParams = (format) => {
    const p = new URLSearchParams({ format })
    if (filterStatut)     p.set('statut',              filterStatut)
    if (filterType)       p.set('type',                filterType)
    if (filterBatiment)   p.set('batiment_id',         filterBatiment)
    if (filterTechnicien) p.set('technicien_id',       filterTechnicien)
    if (dateDebut)        p.set('date_planifiee_debut', dateDebut)
    if (dateFin)          p.set('date_planifiee_fin',   dateFin)
    return p.toString()
  }

  if (loading) return (
    <div className="stats">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Chargement des données...</p>
    </div>
  )

  if (erreur) return (
    <div className="stats">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{erreur}</p>
    </div>
  )

  return (
    <div className="stats">

      {/* ── Export Interventions ── */}
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
              <i className="ti ti-file-type-csv" />
              Export CSV ({filtered.length} OT)
            </button>
            <button
              className="btn-export btn-export-pdf"
              onClick={() => exportAvecToken(
                `http://localhost:5000/api/v1/exports/interventions?${buildExportParams('pdf')}`,
                `echomaint_interventions_${new Date().toISOString().split('T')[0]}.pdf`
              )}
            >
              <i className="ti ti-file-type-pdf" />
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
            {techniciens.map(t => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
          </select>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} title="Date début" />
          <input type="date" value={dateFin}   onChange={e => setDateFin(e.target.value)}   title="Date fin" />
        </div>

        {/* Tableau */}
        {filtered.length === 0 ? (
          <div className="stats-empty">
            <i className="ti ti-clipboard-off" />
            <p>Aucune intervention trouvée avec ces filtres.</p>
          </div>
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
                    <td>{ot.batiment_nom   || '—'}</td>
                    <td>
                      {ot.technicien_nom
                        ? `${ot.technicien_prenom || ''} ${ot.technicien_nom}`.trim()
                        : <span style={{ color: '#94a3b8' }}>—</span>
                      }
                    </td>
                    <td>{ot.date_planifiee ? new Date(ot.date_planifiee).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="stats-td-center">{ot.duree_reelle_minutes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Export KPI ── */}
      <div className="stats-section stats-section-kpi">
        <div className="stats-section-header">
          <div>
            <h2>Export — Tableau de bord KPI</h2>
            <p>Téléchargez l'état détaillé des indicateurs de performance au format CSV ou PDF.</p>
          </div>
          <div className="stats-export-btns">
            <button
              className="btn-export"
              onClick={() => exportAvecToken(
                'http://localhost:5000/api/v1/exports/kpi?format=csv&periode=30',
                `echomaint_kpi_${new Date().toISOString().split('T')[0]}.csv`
              )}
            >
              <i className="ti ti-file-type-csv" />
              Export KPI CSV
            </button>
            <button
              className="btn-export btn-export-pdf"
              onClick={() => exportAvecToken(
                'http://localhost:5000/api/v1/exports/kpi?format=pdf&periode=30',
                `echomaint_kpi_${new Date().toISOString().split('T')[0]}.pdf`
              )}
            >
              <i className="ti ti-file-type-pdf" />
              Export KPI PDF
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}