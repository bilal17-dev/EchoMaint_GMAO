import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import './Dashboard.css'

import { useAuth } from '../hooks/useAuth'
import { getKpiResume } from '../api/stats.api'
import { getBatiments } from '../api/batiments.api'
import { getDemandes } from '../api/demandes.api'       // ← nom réel du fichier
import { getEquipements } from '../api/equipements.api'
// ─── Constantes ──────────────────────────────────────────────────────────────
const STATUT_COLORS = {
  planifiee: '#94a3b8',
  assignee:  '#2563EB',
  en_cours:  '#F59E0B',
  terminee:  '#22C55E',
  annulee:   '#ef4444',
}

const STATUT_LABELS = {
  planifiee: 'Planifiée',
  assignee:  'Assignée',
  en_cours:  'En cours',
  terminee:  'Terminée',
  annulee:   'Annulée',
}

const RATIO_COLORS  = ['#2563EB', '#F59E0B']

const tooltipStyle = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  fontSize: '13px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function exportKpiCSV(kpi, periode, batimentNom) {
  const rows = [
    ['Indicateur', 'Valeur'],
    ['MTTR (minutes)', kpi.mttr_minutes ?? '—'],
    ['MTTR (heures)',  kpi.mttr_heures  ?? '—'],
    ['Taux préventif (%)', kpi.taux_preventif],
    ['Taux curatif (%)',   kpi.taux_curatif],
    ['OT en retard',       kpi.ot_en_retard],
    ['Interventions sur la période', kpi.nb_interventions_periode],
    ['Équipements en panne', kpi.nb_equipements_en_panne],
    ['Réouvertures sur la période', kpi.nb_reouvertures_periode],
    [''],
    ['Période',   periode + ' jours'],
    ['Bâtiment',  batimentNom || 'Tous'],
    ['Généré le', new Date().toLocaleDateString('fr-FR')],
  ]
  const csv  = rows.map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `echomaint_kpi_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const RADIAN = Math.PI / 180
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
          fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Badges réutilisables ─────────────────────────────────────────────────────
function BadgeDI({ statut }) {
  const map = {
    ouverte: { label: 'En attente', color: '#F59E0B', bg: '#FFFBEB' },
    traitee: { label: 'Traitée',    color: '#22C55E', bg: '#F0FDF4' },
    rejetee: { label: 'Rejetée',    color: '#ef4444', bg: '#FEF2F2' },
  }
  const s = map[statut] || { label: statut, color: '#94a3b8', bg: '#F8FAFC' }
  return <span className="badge-statut" style={{ color: s.color, background: s.bg }}>{s.label}</span>
}

function BadgeEquipement({ statut }) {
  const map = {
    actif:        { label: 'Actif',        color: '#22C55E', bg: '#F0FDF4' },
    en_panne:     { label: 'En panne',     color: '#ef4444', bg: '#FEF2F2' },
    hors_service: { label: 'Hors service', color: '#94a3b8', bg: '#F8FAFC' },
  }
  const s = map[statut] || { label: statut, color: '#94a3b8', bg: '#F8FAFC' }
  return <span className="badge-statut" style={{ color: s.color, background: s.bg }}>{s.label}</span>
}

// ═══════════════════════════════════════════════════════════════════════════════
// VUE ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardAdmin() {
  const { t } = useTranslation()

  const [periode,        setPeriode]        = useState('30')
  const [filterBatiment, setFilterBatiment] = useState('')
  const [batiments,      setBatiments]      = useState([])
  const [kpi,            setKpi]            = useState(null)
  const [diEnAttente,    setDiEnAttente]    = useState([])
  const [equipEnPanne,   setEquipEnPanne]   = useState([])
  const [loading,        setLoading]        = useState(true)
  const [erreur,         setErreur]         = useState('')

  useEffect(() => {
    getBatiments()
      .then(res => setBatiments(res.data ?? []))
      .catch(err => console.error('Bâtiments:', err))
  }, [])

  useEffect(() => { charger() }, [periode, filterBatiment])

  const charger = async () => {
    setLoading(true)
    setErreur('')
    try {
      const params = { periode }
      if (filterBatiment) params.batiment_id = filterBatiment

      const [resKpi, resDI, resEquip] = await Promise.all([
        getKpiResume(params),
        getDemandes(),                                    // ← pas de filtre params pour l'instant
        getEquipements({ statut: 'en_panne', limit: 5, ...(filterBatiment ? { batiment_id: filterBatiment } : {}) }),
      ])

      // Tes API retournent directement .data (pas { data: ... })
      setKpi(resKpi.data)
      // getDemandes retourne { data: [...] } ou directement un tableau selon le backend
      // filtre côté frontend les DI ouvertes et prend les 5 premières
      const toutesLesDI = Array.isArray(resDI) ? resDI : (resDI.data ?? [])
      setDiEnAttente(toutesLesDI.filter(d => d.statut === 'ouverte').slice(0, 5))
      const tousLesEquip = Array.isArray(resEquip) ? resEquip : (resEquip.data ?? [])
      setEquipEnPanne(tousLesEquip)
    } catch (err) {
      console.error('Dashboard admin:', err)
      setErreur('Impossible de charger le tableau de bord.')
    } finally {
      setLoading(false)
    }
 }

  const batimentNom = batiments.find(b => b.id === filterBatiment)?.nom || ''

  const donutStatuts = kpi
    ? Object.entries(kpi.interventions_par_statut ?? {})
        .map(([key, val]) => ({ name: STATUT_LABELS[key] ?? key, value: val, key }))
        .filter(d => d.value > 0)
    : []

  const donutRatio = kpi
    ? [
        { name: 'Préventif', value: kpi.taux_preventif ?? 0 },
        { name: 'Curatif',   value: kpi.taux_curatif   ?? 0 },
      ].filter(d => d.value > 0)
    : []

  const kpiCards = kpi ? [
    {
      label: 'OT en retard',
      value: kpi.ot_en_retard,
      subtitle: 'Dépassement de date planifiée',
      icon: 'ti-alert-circle', color: '#ef4444', bg: '#FEF2F2', bar: '#ef4444',
    },
    {
      label: 'Équipements en panne',
      value: kpi.nb_equipements_en_panne,
      subtitle: 'Statut en_panne actuel',
      icon: 'ti-alert-triangle', color: '#F59E0B', bg: '#FFFBEB', bar: '#F59E0B',
    },
    {
      label: 'Taux de disponibilité',
      value: kpi.taux_curatif != null ? `${(100 - kpi.taux_curatif).toFixed(1)} %` : '—',
      subtitle: 'Ratio OT préventifs terminés',
      icon: 'ti-shield-check', color: '#22C55E', bg: '#F0FDF4', bar: '#22C55E',
    },
    {
      label: 'MTTR global',
      value: kpi.mttr_heures != null ? `${kpi.mttr_heures} h` : '—',
      subtitle: 'Temps moyen de réparation',
      icon: 'ti-clock', color: '#2563EB', bg: '#EFF6FF', bar: '#2563EB',
    },
  ] : []

  if (loading) return <div className="dashboard"><p className="dashboard-message">Chargement…</p></div>
  if (erreur || !kpi) return <div className="dashboard"><p className="dashboard-message dashboard-message--error">{erreur || 'Aucune donnée.'}</p></div>

  return (
    <div className="dashboard">

      {/* Filtres + exports */}
      <div className="dashboard-filters">
        <div className="dashboard-filters-left">
          <select value={periode} onChange={e => setPeriode(e.target.value)} className="dashboard-select">
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </select>
          <select value={filterBatiment} onChange={e => setFilterBatiment(e.target.value)} className="dashboard-select">
            <option value="">Tous les bâtiments</option>
            {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
        </div>
        <div className="dashboard-exports">
          <button className="btn-export" onClick={() => exportKpiCSV(kpi, periode, batimentNom)}>
            <i className="ti ti-file-type-csv" /> Export CSV
          </button>
          <button className="btn-export btn-export-pdf" onClick={() => {
            const url = `${import.meta.env.VITE_API_URL}/exports/kpi?format=pdf&periode=${periode}${filterBatiment ? `&batiment_id=${filterBatiment}` : ''}`
            window.open(url, '_blank')
          }}>
            <i className="ti ti-file-type-pdf" /> Export PDF
          </button>
        </div>
      </div>

      {/* 4 KPI scalaires */}
      <div className="dashboard-kpi dashboard-kpi--4col">
        {kpiCards.map((c, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-card-top">
              <div className="kpi-icon" style={{ background: c.bg }}>
                <i className={`ti ${c.icon}`} style={{ color: c.color }} />
              </div>
              <div className="kpi-info">
                <p className="kpi-label">{c.label}</p>
                <p className="kpi-value">{c.value}</p>
                <p className="kpi-subtitle">{c.subtitle}</p>
              </div>
            </div>
            <div className="kpi-bar" style={{ background: c.bar }} />
          </div>
        ))}
      </div>

      {/* 2 donuts */}
      <div className="dashboard-charts-row">
        <div className="dashboard-chart">
          <div className="chart-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap"><i className="ti ti-chart-donut" /></div>
              <div>
                <p className="chart-title">Répartition des OT par statut</p>
                <p className="chart-subtitle">Sur la période sélectionnée</p>
              </div>
            </div>
          </div>
          {donutStatuts.length === 0
            ? <p className="chart-empty">Aucun OT sur cette période</p>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={donutStatuts} cx="50%" cy="45%" innerRadius={60} outerRadius={95}
                       paddingAngle={3} dataKey="value" labelLine={false} label={DonutLabel}>
                    {donutStatuts.map((e, i) => <Cell key={i} fill={STATUT_COLORS[e.key] ?? '#94a3b8'} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ color: '#64748B', fontSize: '12px' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="dashboard-chart">
          <div className="chart-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap" style={{ background: '#FFFBEB' }}>
                <i className="ti ti-chart-pie" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <p className="chart-title">Ratio préventif / curatif</p>
                <p className="chart-subtitle">OT terminés sur la période</p>
              </div>
            </div>
          </div>
          {donutRatio.length === 0
            ? <p className="chart-empty">Aucun OT terminé sur cette période</p>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={donutRatio} cx="50%" cy="45%" innerRadius={60} outerRadius={95}
                       paddingAngle={3} dataKey="value" labelLine={false} label={DonutLabel}>
                    {donutRatio.map((_, i) => <Cell key={i} fill={RATIO_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} %`, n]} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ color: '#64748B', fontSize: '12px' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* 2 listes */}
      <div className="dashboard-lists-row">
        {/* DI en attente */}
        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap" style={{ background: '#FEF2F2' }}>
                <i className="ti ti-inbox" style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p className="chart-title">Demandes en attente</p>
                <p className="chart-subtitle">5 dernières DI non traitées</p>
              </div>
            </div>
            <a href="/demandes-intervention" className="list-card-voir-tout">
              Voir tout <i className="ti ti-arrow-right" />
            </a>
          </div>
          {diEnAttente.length === 0
            ? <p className="chart-empty">Aucune demande en attente</p>
            : (
              <table className="dashboard-table">
                <thead><tr><th>Réf.</th><th>Équipement</th><th>Objet</th><th>Priorité</th><th>Date</th><th>Statut</th></tr></thead>
                <tbody>
                  {diEnAttente.map(di => (
                    <tr key={di.id}>
                      <td className="table-ref">#{di.id}</td>
                      <td>{di.equipement?.nom ?? '—'}</td>
                      <td className="table-titre">{di.titre}</td>
                      <td><span className={`badge-priorite badge-priorite--${di.priorite}`}>{di.priorite}</span></td>
                      <td className="table-date">{new Date(di.created_at).toLocaleDateString('fr-FR')}</td>
                      <td><BadgeDI statut={di.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* Équipements en panne */}
        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap" style={{ background: '#FFFBEB' }}>
                <i className="ti ti-tool" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <p className="chart-title">Équipements en panne</p>
                <p className="chart-subtitle">Flux temps réel</p>
              </div>
            </div>
            <a href="/equipements?statut=en_panne" className="list-card-voir-tout">
              Voir tout <i className="ti ti-arrow-right" />
            </a>
          </div>
          {equipEnPanne.length === 0
            ? <p className="chart-empty" style={{ color: '#22C55E' }}><i className="ti ti-circle-check" /> Aucun équipement en panne</p>
            : (
              <table className="dashboard-table">
                <thead><tr><th>Équipement</th><th>Réf.</th><th>Bâtiment</th><th>Statut</th></tr></thead>
                <tbody>
                  {equipEnPanne.map(eq => (
                    <tr key={eq.id}>
                      <td className="table-titre">{eq.nom}</td>
                      <td className="table-ref">{eq.reference}</td>
                      <td>{eq.batiment?.nom ?? '—'}</td>
                      <td><BadgeEquipement statut={eq.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VUE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardClient() {
  const { user } = useAuth()

  const [mesDI,          setMesDI]          = useState([])
  const [mesEquipements, setMesEquipements] = useState([])
  const [loading,        setLoading]        = useState(true)
  const [erreur,         setErreur]         = useState('')

  

  const charger = async () => {
    setLoading(true)
    setErreur('')
    try {
      const [resDI, resEquip] = await Promise.all([
        getDemandes(),
        getEquipements({ statut: 'en_panne', limit: 5 }),
      ])

      const toutesLesDI = Array.isArray(resDI) ? resDI : (resDI.data ?? [])
      setMesDI(toutesLesDI.slice(0, 5))

      const tousLesEquip = Array.isArray(resEquip) ? resEquip : (resEquip.data ?? [])
      setMesEquipements(tousLesEquip)
    } catch (err) {
      console.error('Dashboard client:', err)
      setErreur('Impossible de charger votre tableau de bord.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { charger() }, [])

  if (loading) return <div className="dashboard"><p className="dashboard-message">Chargement…</p></div>
  if (erreur)  return <div className="dashboard"><p className="dashboard-message dashboard-message--error">{erreur}</p></div>

  const diEnAttente     = mesDI.filter(d => d.statut === 'ouverte').length
  const diEnCours       = mesDI.filter(d => d.statut === 'traitee').length
  const equipIndisponibles = mesEquipements.length

  const kpiCards = [
    { label: 'Demandes en attente',     value: diEnAttente,     subtitle: 'En attente de validation admin', icon: 'ti-hourglass',       color: '#F59E0B', bg: '#FFFBEB', bar: '#F59E0B' },
    { label: 'Demandes en cours',       value: diEnCours,       subtitle: 'OT créé, intervention en cours', icon: 'ti-progress',        color: '#2563EB', bg: '#EFF6FF', bar: '#2563EB' },
    { label: 'Équipements indisponibles',value: equipIndisponibles,subtitle: 'En panne actuellement',       icon: 'ti-alert-triangle',  color: '#ef4444', bg: '#FEF2F2', bar: '#ef4444' },
  ]

  return (
    <div className="dashboard">

      {/* Bandeau de bienvenue */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h2 className="dashboard-welcome-title">Bonjour, {user?.prenom} {user?.nom} 👋</h2>
          <p className="dashboard-welcome-sub">Voici un résumé de l'état de vos équipements et de vos demandes d'intervention.</p>
        </div>
        <a href="/demandes-intervention/new" className="btn-nouvelle-di">
          <i className="ti ti-plus" /> Nouvelle demande
        </a>
      </div>

      {/* 3 KPI */}
      <div className="dashboard-kpi dashboard-kpi--3col">
        {kpiCards.map((c, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-card-top">
              <div className="kpi-icon" style={{ background: c.bg }}>
                <i className={`ti ${c.icon}`} style={{ color: c.color }} />
              </div>
              <div className="kpi-info">
                <p className="kpi-label">{c.label}</p>
                <p className="kpi-value">{c.value}</p>
                <p className="kpi-subtitle">{c.subtitle}</p>
              </div>
            </div>
            <div className="kpi-bar" style={{ background: c.bar }} />
          </div>
        ))}
      </div>

      {/* 2 listes */}
      <div className="dashboard-lists-row">

        {/* Mes dernières DI */}
        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap"><i className="ti ti-file-text" /></div>
              <div>
                <p className="chart-title">Mes dernières demandes</p>
                <p className="chart-subtitle">5 demandes les plus récentes</p>
              </div>
            </div>
            <a href="/demandes-intervention" className="list-card-voir-tout">
              Voir tout <i className="ti ti-arrow-right" />
            </a>
          </div>
          {mesDI.length === 0
            ? (
              <div className="chart-empty chart-empty--action">
                <i className="ti ti-inbox" style={{ fontSize: '2rem', color: '#CBD5E1' }} />
                <p>Aucune demande pour le moment.</p>
                <a href="/demandes-intervention/new" className="btn-nouvelle-di btn-nouvelle-di--sm">Soumettre une demande</a>
              </div>
            ) : (
              <table className="dashboard-table">
                <thead><tr><th>Réf.</th><th>Équipement</th><th>Objet</th><th>Statut</th><th>Date</th></tr></thead>
                <tbody>
                  {mesDI.map(di => (
                    <tr key={di.id}>
                      <td className="table-ref">#{di.id}</td>
                      <td>{di.equipement?.nom ?? '—'}</td>
                      <td className="table-titre">{di.titre}</td>
                      <td><BadgeDI statut={di.statut} /></td>
                      <td className="table-date">{new Date(di.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* Équipements critiques */}
        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap" style={{ background: '#FEF2F2' }}>
                <i className="ti ti-alert-triangle" style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p className="chart-title">Équipements critiques</p>
                <p className="chart-subtitle">Actuellement en panne</p>
              </div>
            </div>
            <a href="/equipements?statut=en_panne" className="list-card-voir-tout">
              Voir tout <i className="ti ti-arrow-right" />
            </a>
          </div>
          {mesEquipements.length === 0
            ? (
              <div className="chart-empty">
                <i className="ti ti-circle-check" style={{ fontSize: '2rem', color: '#22C55E' }} />
                <p style={{ color: '#22C55E', fontWeight: 600 }}>Tous vos équipements sont opérationnels</p>
              </div>
            ) : (
              <ul className="equip-panne-list">
                {mesEquipements.map(eq => (
                  <li key={eq.id} className="equip-panne-item">
                    <div className="equip-panne-icon"><i className="ti ti-cpu" /></div>
                    <div className="equip-panne-info">
                      <span className="equip-panne-nom">{eq.nom}</span>
                      <span className="equip-panne-ref">{eq.reference} · {eq.batiment?.nom ?? '—'}</span>
                    </div>
                    <span className="badge-statut" style={{ color: '#ef4444', background: '#FEF2F2' }}>En panne</span>
                  </li>
                ))}
              </ul>
            )}
        </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VUE TECHNICIEN (placeholder — à implémenter au prochain sprint)
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardTechnicien() {
  const { user } = useAuth()
  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h2 className="dashboard-welcome-title">Bonjour, {user?.prenom} {user?.nom} 👋</h2>
          <p className="dashboard-welcome-sub">Votre tableau de bord technicien arrive bientôt.</p>
        </div>
        <a href="/interventions" className="btn-nouvelle-di">
          <i className="ti ti-list-check" /> Mes interventions
        </a>
      </div>
      <div className="dashboard-placeholder">
        <i className="ti ti-tools" style={{ fontSize: '3rem', color: '#CBD5E1' }} />
        <p>Le tableau de bord technicien sera disponible prochainement.</p>
        <a href="/interventions" className="btn-nouvelle-di btn-nouvelle-di--sm">Consulter mes OT</a>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTEUR DE RÔLE — export par défaut
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth()

  if (!user) return null

  if (user.role === 'admin')      return <DashboardAdmin />
  if (user.role === 'technicien') return <DashboardTechnicien />
  if (user.role === 'client')     return <DashboardClient />

  return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
      Rôle inconnu : {user.role}
    </div>
  )
}