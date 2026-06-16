import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import './Dashboard.css'

const kpiData = [
  { label: 'Taux de panne', value: '5,32%', subtitle: 'Global', icon: 'ti-chart-line', color: '#8B5CF6', bg: '#F5F3FF', bar: '#8B5CF6' },
  { label: 'MTTR', value: '2,45 h', subtitle: 'Global', icon: 'ti-clock', color: '#2563EB', bg: '#EFF6FF', bar: '#2563EB' },
  { label: 'Interventions ouvertes', value: '24', subtitle: 'Total', icon: 'ti-folder-open', color: '#22C55E', bg: '#F0FDF4', bar: '#22C55E' },
  { label: 'Interventions en cours', value: '16', subtitle: 'Total', icon: 'ti-refresh', color: '#F59E0B', bg: '#FFFBEB', bar: '#F59E0B' },
  { label: 'Interventions clôturées', value: '98', subtitle: 'Total', icon: 'ti-circle-check', color: '#22C55E', bg: '#F0FDF4', bar: '#22C55E' },
  { label: 'Interventions en retard', value: '7', subtitle: 'Total', icon: 'ti-alert-circle', color: '#ef4444', bg: '#FEF2F2', bar: '#ef4444' },
]

const equipData = [
  { name: 'Climatiseur Central', value: 8.6 },
  { name: 'Groupe Électrogène', value: 6.4 },
  { name: 'Ascenseur', value: 4.8 },
  { name: 'Pompe à Eau', value: 3.7 },
  { name: 'Compresseur', value: 2.1 },
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
  { month: 'Mars', ouvertes: 22, enCours: 55, cloturees: 80 },
  { month: 'Avr.', ouvertes: 25, enCours: 48, cloturees: 75 },
  { month: 'Mai', ouvertes: 19, enCours: 42, cloturees: 70 },
  { month: 'Juin', ouvertes: 21, enCours: 50, cloturees: 82 },
  { month: 'Juil.', ouvertes: 17, enCours: 45, cloturees: 78 },
  { month: 'Août', ouvertes: 23, enCours: 38, cloturees: 85 },
  { month: 'Sept.', ouvertes: 20, enCours: 52, cloturees: 90 },
  { month: 'Oct.', ouvertes: 24, enCours: 60, cloturees: 92 },
  { month: 'Nov.', ouvertes: 22, enCours: 65, cloturees: 88 },
  { month: 'Déc.', ouvertes: 20, enCours: 62, cloturees: 100 },
]

const tooltipStyle = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  fontSize: '13px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
}

export default function Dashboard() {
  return (
    <div className="dashboard">

      {/* KPI */}
      <div className="dashboard-kpi">
        {kpiData.map((kpi, i) => (
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

        {/* Taux de panne par équipement */}
        <div className="dashboard-chart">
          <div className="chart-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap">
                <i className="ti ti-building" aria-hidden="true" />
              </div>
              <div>
                <p className="chart-title">Taux de panne par équipement</p>
              </div>
            </div>
            <div className="chart-filter">
              <span>12 derniers mois</span>
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

        {/* Taux de panne par bâtiment */}
        <div className="dashboard-chart">
          <div className="chart-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap">
                <i className="ti ti-building" aria-hidden="true" />
              </div>
              <div>
                <p className="chart-title">Taux de panne par bâtiment</p>
              </div>
            </div>
            <div className="chart-filter">
              <span>12 derniers mois</span>
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
              <i className="ti ti-building" aria-hidden="true" />
            </div>
            <div>
              <p className="chart-title">Évolution des interventions</p>
            </div>
          </div>
          <div className="chart-filter">
            <span>12 derniers mois</span>
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
              formatter={(value) => {
                const labels = { ouvertes: 'Ouvertes', enCours: 'En cours', cloturees: 'Clôturées' }
                return <span style={{ color: '#64748B', fontSize: '12px' }}>{labels[value]}</span>
              }}
            />
            <Area type="monotone" dataKey="ouvertes" stroke="#22C55E" strokeWidth={2} fill="url(#greenGrad)" dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#22C55E' }} />
            <Area type="monotone" dataKey="enCours" stroke="#F59E0B" strokeWidth={2} fill="url(#orangeGrad)" dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#F59E0B' }} />
            <Area type="monotone" dataKey="cloturees" stroke="#2563EB" strokeWidth={2} fill="url(#blueGrad)" dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#2563EB' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}