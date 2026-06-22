import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import './Dashboard.css'

// On importe les vraies fonctions connectées au backend
import { getKpiResume, getKpiParEquipement, getKpiEvolution } from '../api/stats.api'
import { getBatiments } from '../api/batiments.api'

const tooltipStyle = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  fontSize: '13px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
}

/**
 * Exporte les KPI affichés en fichier CSV téléchargeable directement
 * depuis les données déjà chargées dans le navigateur
 */
function exportKpiCSV(kpi, periode, batiment) {
  const rows = [
    ['Indicateur', 'Valeur'],
    ['MTTR (minutes)', kpi.mttr_minutes ?? '—'],
    ['MTTR (heures)', kpi.mttr_heures ?? '—'],
    ['Taux préventif (%)', kpi.taux_preventif],
    ['Taux curatif (%)', kpi.taux_curatif],
    ['OT en retard', kpi.ot_en_retard],
    ['Interventions sur la période', kpi.nb_interventions_periode],
    ['Équipements en panne', kpi.nb_equipements_en_panne],
    ['Réouvertures sur la période', kpi.nb_reouvertures_periode],
    ['', ''],
    ['Période', periode],
    ['Bâtiment', batiment || 'Tous'],
    ['Généré le', new Date().toLocaleDateString('fr-FR')],
  ]

  const csv = rows.map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `echomaint_kpi_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Dashboard() {
  const { t } = useTranslation()

  const [periode, setPeriode] = useState('30')
  const [filterBatiment, setFilterBatiment] = useState('')

  const [batiments, setBatiments] = useState([])
  const [kpi, setKpi] = useState(null)

  // Nouveaux états pour les graphiques
  const [equipData, setEquipData] = useState([])
  const [batimentData, setBatimentData] = useState([])
  const [evolutionData, setEvolutionData] = useState([])

  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  // ─── Chargement de la liste des bâtiments (une seule fois) ──────────────────
  useEffect(() => {
    getBatiments()
      .then(res => setBatiments(res.data))
      .catch(err => console.error('Erreur chargement bâtiments:', err))
  }, [])

  // ─── Chargement des KPI principaux à chaque changement de filtre ────────────
  useEffect(() => {
    chargerKpi()
  }, [periode, filterBatiment])

  // ─── Chargement des graphiques une seule fois au démarrage ──────────────────
  // Ces deux endpoints ne dépendent pas des filtres periode/batiment,
  // donc on les charge une seule fois avec un tableau vide []
  useEffect(() => {
    chargerGraphiques()
  }, [])

  const chargerKpi = async () => {
    setLoading(true)
    setErreur('')
    try {
      const params = { periode }
      if (filterBatiment) params.batiment_id = filterBatiment

      const res = await getKpiResume(params)
      setKpi(res.data)
    } catch (error) {
      console.error('Erreur de chargement des KPI:', error)
      setErreur('Impossible de charger le tableau de bord. Vérifiez que le serveur backend est démarré.')
    } finally {
      setLoading(false)
    }
  }

  const chargerGraphiques = async () => {
    try {
      // On lance les deux requêtes en parallèle pour gagner du temps
      const [resEquipement, resEvolution] = await Promise.all([
        getKpiParEquipement(),
        getKpiEvolution()
      ])

      // resEquipement.data contient { par_equipement: [...], par_batiment: [...] }
      setEquipData(resEquipement.data.par_equipement)
      setBatimentData(resEquipement.data.par_batiment)

      // resEvolution.data est directement le tableau des 12 mois
      setEvolutionData(resEvolution.data)
    } catch (error) {
      // Si ça échoue, on n'affiche pas d'erreur bloquante :
      // les graphiques restent vides mais le reste du dashboard fonctionne
      console.error('Erreur de chargement des graphiques:', error)
    }
  }

  const batimentNom = batiments.find(b => b.id === filterBatiment)?.nom || ''

  // ─── Affichage pendant le chargement ────────────────────────────────────────
  if (loading) {
    return (
      <div className="dashboard">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          Chargement du tableau de bord...
        </p>
      </div>
    )
  }

  // ─── Affichage en cas d'erreur ───────────────────────────────────────────────
  if (erreur || !kpi) {
    return (
      <div className="dashboard">
        <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
          {erreur || 'Aucune donnée disponible.'}
        </p>
      </div>
    )
  }

  // ─── Construction des cartes KPI à partir des vraies données du backend ─────
  const kpiCards = [
    {
      label: t('dashboard.mttr'),
      value: kpi.mttr_heures !== null ? `${kpi.mttr_heures} h` : '—',
      subtitle: t('dashboard.global'),
      icon: 'ti-clock', color: '#2563EB', bg: '#EFF6FF', bar: '#2563EB'
    },
    {
      label: 'Taux préventif',
      value: `${kpi.taux_preventif}%`,
      subtitle: t('dashboard.global'),
      icon: 'ti-calendar-check', color: '#22C55E', bg: '#F0FDF4', bar: '#22C55E'
    },
    {
      label: 'Taux curatif',
      value: `${kpi.taux_curatif}%`,
      subtitle: t('dashboard.global'),
      icon: 'ti-tool', color: '#F59E0B', bg: '#FFFBEB', bar: '#F59E0B'
    },
    {
      label: 'Interventions sur la période',
      value: kpi.nb_interventions_periode,
      subtitle: t('dashboard.total'),
      icon: 'ti-folder-open', color: '#8B5CF6', bg: '#F5F3FF', bar: '#8B5CF6'
    },
    {
      label: t('dashboard.late'),
      value: kpi.ot_en_retard,
      subtitle: t('dashboard.total'),
      icon: 'ti-alert-circle', color: '#ef4444', bg: '#FEF2F2', bar: '#ef4444'
    },
    {
      label: 'Équipements en panne',
      value: kpi.nb_equipements_en_panne,
      subtitle: t('dashboard.total'),
      icon: 'ti-alert-triangle', color: '#ef4444', bg: '#FEF2F2', bar: '#ef4444'
    },
    {
      label: 'Réouvertures',
      value: kpi.nb_reouvertures_periode,
      subtitle: 'Sur la période',
      icon: 'ti-rotate', color: '#F59E0B', bg: '#FFFBEB', bar: '#F59E0B'
    },
  ]

  return (
    <div className="dashboard">

      {/* Filtres + Export KPI */}
      <div className="dashboard-filters">
        <div className="dashboard-filters-left">
          <select
            value={periode}
            onChange={e => setPeriode(e.target.value)}
            className="dashboard-select"
          >
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </select>

          <select
            value={filterBatiment}
            onChange={e => setFilterBatiment(e.target.value)}
            className="dashboard-select"
          >
            <option value="">Tous les bâtiments</option>
            {batiments.map(b => (
              <option key={b.id} value={b.id}>{b.nom}</option>
            ))}
          </select>
        </div>

        {/* Export KPI — RG-EXPORT-01 : admin uniquement (géré via AdminRoute) */}
        <div className="dashboard-exports">
          <button
            className="btn-export"
            onClick={() => exportKpiCSV(kpi, periode, batimentNom)}
            title="Exporter le tableau de bord en CSV"
          >
            <i className="ti ti-file-type-csv" aria-hidden="true" />
            Export CSV
          </button>
          <button
            className="btn-export btn-export-pdf"
            onClick={() => {
              const url = `${import.meta.env.VITE_API_URL}/exports/kpi?format=pdf&periode=${periode}${filterBatiment ? `&batiment_id=${filterBatiment}` : ''}`
              window.open(url, '_blank')
            }}
            title="Exporter le tableau de bord en PDF"
          >
            <i className="ti ti-file-type-pdf" aria-hidden="true" />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="dashboard-kpi">
        {kpiCards.map((carte, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-card-top">
              <div className="kpi-icon" style={{ background: carte.bg }}>
                <i className={`ti ${carte.icon}`} style={{ color: carte.color }} aria-hidden="true" />
              </div>
              <div className="kpi-info">
                <p className="kpi-label">{carte.label}</p>
                <p className="kpi-value">{carte.value}</p>
                <p className="kpi-subtitle">{carte.subtitle}</p>
              </div>
            </div>
            <div className="kpi-bar" style={{ background: carte.bar }} />
          </div>
        ))}
      </div>

      {/* Bar charts — n'apparaissent que si on a des données réelles */}
      {(equipData.length > 0 || batimentData.length > 0) && (
        <div className="dashboard-charts-row">
          <div className="dashboard-chart">
            <div className="chart-header">
              <div className="chart-header-left">
                <div className="chart-icon-wrap">
                  <i className="ti ti-cpu" aria-hidden="true" />
                </div>
                <div>
                  <p className="chart-title">{t('dashboard.failureRateByEquipment')}</p>
                </div>
              </div>
              <div className="chart-filter">
                <span>{t('dashboard.last12months')}</span>
                <i className="ti ti-chevron-down" aria-hidden="true" />
              </div>
            </div>

            {equipData.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                Aucune donnée disponible
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={equipData} layout="vertical" margin={{ top: 0, right: 40, left: 120, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={115} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}%`, 'Taux de panne']} />
                  <Bar dataKey="value" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="dashboard-chart">
            <div className="chart-header">
              <div className="chart-header-left">
                <div className="chart-icon-wrap">
                  <i className="ti ti-building" aria-hidden="true" />
                </div>
                <div>
                  <p className="chart-title">{t('dashboard.failureRateByBuilding')}</p>
                </div>
              </div>
              <div className="chart-filter">
                <span>{t('dashboard.last12months')}</span>
                <i className="ti ti-chevron-down" aria-hidden="true" />
              </div>
            </div>

            {batimentData.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                Aucune donnée disponible
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={batimentData} layout="vertical" margin={{ top: 0, right: 40, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={75} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}%`, 'Taux de panne']} />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Évolution des interventions */}
      {evolutionData.length > 0 && (
        <div className="dashboard-chart">
          <div className="chart-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap">
                <i className="ti ti-chart-line" aria-hidden="true" />
              </div>
              <div>
                <p className="chart-title">{t('dashboard.evolutionTitle')}</p>
              </div>
            </div>
            <div className="chart-filter">
              <span>{t('dashboard.last12months')}</span>
              <i className="ti ti-chevron-down" aria-hidden="true" />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={evolutionData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={value => {
                  const labels = { ouvertes: t('dashboard.legend.open'), enCours: t('dashboard.legend.inProgress'), cloturees: t('dashboard.legend.closed') }
                  return <span style={{ color: '#64748B', fontSize: '12px' }}>{labels[value]}</span>
                }}
              />
              <Area type="monotone" dataKey="ouvertes"  stroke="#22C55E" strokeWidth={2} fill="url(#greenGrad)"  dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#22C55E' }} />
              <Area type="monotone" dataKey="enCours"   stroke="#F59E0B" strokeWidth={2} fill="url(#orangeGrad)" dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#F59E0B' }} />
              <Area type="monotone" dataKey="cloturees" stroke="#2563EB" strokeWidth={2} fill="url(#blueGrad)"   dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#2563EB' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  )
}