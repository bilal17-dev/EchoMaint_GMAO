import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import './Dashboard.css'

const mockBatiments = [
  { id: '1', nom: 'Siège Social DGS Africa' },
  { id: '2', nom: 'Tour Almadies' },
  { id: '3', nom: 'Entrepôt Mbao' },
  { id: '4', nom: 'Immeuble Plateau' },
]

// Mock KPI — à remplacer par GET /kpi/resume?batiment_id=&periode=
const mockKPI = {
  mttr_minutes: 147,
  taux_preventif: 62,
  taux_curatif: 38,
  ot_en_retard: 7,
  nb_interventions_periode: 138,
  nb_equipements_en_panne: 4,
  nb_reouvertures_periode: 3,
  interventions_par_statut: {
    a_planifier: 12,
    assignee: 8,
    en_cours: 16,
    terminee: 98,
    annulee: 4,
  }
}

const equipData = [
  { name: 'Climatiseur Central', value: 8.6 },
  { name: 'Groupe Électrogène',  value: 6.4 },
  { name: 'Ascenseur',           value: 4.8 },
  { name: 'Pompe à Eau',         value: 3.7 },
  { name: 'Compresseur',         value: 2.1 },
]

const batimentData = [
  { name: 'Bâtiment A', value: 7.2 },
  { name: 'Bâtiment B', value: 5.6 },
  { name: 'Bâtiment C', value: 4.1 },
  { name: 'Bâtiment D', value: 3.3 },
  { name: 'Bâtiment E', value: 2.4 },
]

const evolutionData = [
  { month: 'Janv.', ouvertes: 20, enCours: 40, cloturees: 65 },
  { month: 'Févr.', ouvertes: 18, enCours: 35, cloturees: 58 },
  { month: 'Mars',  ouvertes: 22, enCours: 55, cloturees: 80 },
  { month: 'Avr.',  ouvertes: 25, enCours: 48, cloturees: 75 },
  { month: 'Mai',   ouvertes: 19, enCours: 42, cloturees: 70 },
  { month: 'Juin',  ouvertes: 21, enCours: 50, cloturees: 82 },
  { month: 'Juil.', ouvertes: 17, enCours: 45, cloturees: 78 },
  { month: 'Août',  ouvertes: 23, enCours: 38, cloturees: 85 },
  { month: 'Sept.', ouvertes: 20, enCours: 52, cloturees: 90 },
  { month: 'Oct.',  ouvertes: 24, enCours: 60, cloturees: 92 },
  { month: 'Nov.',  ouvertes: 22, enCours: 65, cloturees: 88 },
  { month: 'Déc.',  ouvertes: 20, enCours: 62, cloturees: 100 },
]

const tooltipStyle = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  fontSize: '13px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
}

// Export CSV côté client (RG-EXPORT-01 : admin uniquement, géré via route AdminRoute)
function exportKpiCSV(kpi, periode, batiment) {
  const rows = [
    ['Indicateur', 'Valeur'],
    ['MTTR (minutes)', kpi.mttr_minutes],
    ['MTTR (heures)', (kpi.mttr_minutes / 60).toFixed(2)],
    ['Taux préventif (%)', kpi.taux_preventif],
    ['Taux curatif (%)', kpi.taux_curatif],
    ['OT en retard', kpi.ot_en_retard],
    ['Interventions sur la période', kpi.nb_interventions_periode],
    ['Équipements en panne', kpi.nb_equipements_en_panne],
    ['Réouvertures sur la période', kpi.nb_reouvertures_periode],
    ['', ''],
    ['Statut', 'Nombre'],
    ['À planifier', kpi.interventions_par_statut.a_planifier],
    ['Assignées', kpi.interventions_par_statut.assignee],
    ['En cours', kpi.interventions_par_statut.en_cours],
    ['Terminées', kpi.interventions_par_statut.terminee],
    ['Annulées', kpi.interventions_par_statut.annulee],
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
  const [periode, setPeriode] = useState('30j')
  const [filterBatiment, setFilterBatiment] = useState('')

  // En mode réel : useEffect → GET /kpi/resume?batiment_id=filterBatiment&periode=periode
  const kpi = mockKPI

  const kpiCards = [
    { label: t('dashboard.mttr'), value: `${(kpi.mttr_minutes / 60).toFixed(2)} h`, subtitle: t('dashboard.global'), icon: 'ti-clock', color: '#2563EB', bg: '#EFF6FF', bar: '#2563EB' },
    { label: 'Taux préventif', value: `${kpi.taux_preventif}%`, subtitle: t('dashboard.global'), icon: 'ti-calendar-check', color: '#22C55E', bg: '#F0FDF4', bar: '#22C55E' },
    { label: 'Taux curatif', value: `${kpi.taux_curatif}%`, subtitle: t('dashboard.global'), icon: 'ti-tool', color: '#F59E0B', bg: '#FFFBEB', bar: '#F59E0B' },
    { label: t('dashboard.openInterventions'), value: kpi.interventions_par_statut.a_planifier + kpi.interventions_par_statut.assignee, subtitle: t('dashboard.total'), icon: 'ti-folder-open', color: '#8B5CF6', bg: '#F5F3FF', bar: '#8B5CF6' },
    { label: t('dashboard.inProgress'), value: kpi.interventions_par_statut.en_cours, subtitle: t('dashboard.total'), icon: 'ti-refresh', color: '#F59E0B', bg: '#FFFBEB', bar: '#F59E0B' },
    { label: t('dashboard.closed'), value: kpi.interventions_par_statut.terminee, subtitle: t('dashboard.total'), icon: 'ti-circle-check', color: '#22C55E', bg: '#F0FDF4', bar: '#22C55E' },
    { label: t('dashboard.late'), value: kpi.ot_en_retard, subtitle: t('dashboard.total'), icon: 'ti-alert-circle', color: '#ef4444', bg: '#FEF2F2', bar: '#ef4444' },
    { label: 'Équipements en panne', value: kpi.nb_equipements_en_panne, subtitle: t('dashboard.total'), icon: 'ti-alert-triangle', color: '#ef4444', bg: '#FEF2F2', bar: '#ef4444' },
    { label: 'Réouvertures', value: kpi.nb_reouvertures_periode, subtitle: 'Sur la période', icon: 'ti-rotate', color: '#F59E0B', bg: '#FFFBEB', bar: '#F59E0B' },
  ]

  const batimentNom = mockBatiments.find(b => b.id === filterBatiment)?.nom || ''

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
            <option value="7j">7 derniers jours</option>
            <option value="30j">30 derniers jours</option>
            <option value="90j">90 derniers jours</option>
          </select>

          <select
            value={filterBatiment}
            onChange={e => setFilterBatiment(e.target.value)}
            className="dashboard-select"
          >
            <option value="">Tous les bâtiments</option>
            {mockBatiments.map(b => (
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
              // --- À activer une fois le backend prêt ---
              // window.open(`/api/exports/kpi?format=pdf&batiment_id=${filterBatiment}&periode=${periode}`)
              window.alert('Export PDF : disponible une fois le backend J9 connecté.\nEndpoint : GET /exports/kpi?format=pdf')
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
        {kpiCards.map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-card-top">
              <div className="kpi-icon" style={{ background: kpi.bg }}>
                <i className={`ti ${kpi.icon}`} style={{ color: kpi.color }} aria-hidden="true" />
              </div>
              <div className="kpi-info">
                <p className="kpi-label">{kpi.label}</p>
                <p className="kpi-value">{kpi.value}</p>
                <p className="kpi-subtitle">{kpi.subtitle}</p>
              </div>
            </div>
            <div className="kpi-bar" style={{ background: kpi.bar }} />
          </div>
        ))}
      </div>

      {/* Bar charts */}
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
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={equipData} layout="vertical" margin={{ top: 0, right: 40, left: 120, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 10]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={115} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}%`, 'Taux de panne']} />
              <Bar dataKey="value" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
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
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={batimentData} layout="vertical" margin={{ top: 0, right: 40, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 10]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={75} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}%`, 'Taux de panne']} />
              <Bar dataKey="value" fill="#8B5CF6" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Évolution des interventions */}
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

    </div>
  )
}