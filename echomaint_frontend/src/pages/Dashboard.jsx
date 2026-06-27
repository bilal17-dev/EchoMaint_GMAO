import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import './Dashboard.css'

import { useAuth } from '../hooks/useAuth'
import { getKpiResume, getClientDashboard, getTechnicienDashboard } from '../api/stats.api'
import { getBatiments } from '../api/batiments.api'
import { getDemandes } from '../api/demandes.api'
import { getEquipements } from '../api/equipements.api'

const STATUT_COLORS = {
  planifiee: '#2563EB',
  assignee:  '#F97316',
  en_cours:  '#8B5CF6',
  terminee:  '#22C55E',
  annulee:   '#94a3b8',
}

const RATIO_COLORS  = ['#2563EB', '#F59E0B']

const OT_STATUT_COLORS = {
  planifiee: { color: '#6366f1', bg: '#EEF2FF' },
  assignee:  { color: '#f59e0b', bg: '#FFFBEB' },
  en_cours:  { color: '#8b5cf6', bg: '#F5F3FF' },
  terminee:  { color: '#10b981', bg: '#F0FDF4' },
  annulee:   { color: '#6b7280', bg: '#F9FAFB' },
}

const OT_PRIORITE_COLORS = {
  urgente: { color: '#ef4444', bg: '#FEF2F2' },
  haute:   { color: '#f59e0b', bg: '#FFFBEB' },
  normale: { color: '#6b7280', bg: '#F1F5F9' },
  basse:   { color: '#10b981', bg: '#F0FDF4' },
}

const tooltipStyle = {
  background: '#fff', border: '1px solid #E2E8F0',
  borderRadius: '12px', fontSize: '13px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
}

async function exportAvecToken(url, nomFichier, errMsg) {
  try {
    const token = localStorage.getItem('echomaint_token')
    const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      window.alert(err.message || errMsg)
      return
    }
    const blob      = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a         = document.createElement('a')
    a.href          = objectUrl
    a.download      = nomFichier
    a.click()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.alert(errMsg)
  }
}

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
    ['Généré le', new Date().toLocaleDateString()],
  ]
  const csv  = rows.map(r => r.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
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

function BadgeDI({ statut }) {
  const { t } = useTranslation()
  const map = {
    ouverte: { key: 'dashboard.badgeDI.pending', color: '#F59E0B', bg: '#FFFBEB' },
    traitee: { key: 'dashboard.badgeDI.traitee', color: '#22C55E', bg: '#F0FDF4' },
    rejetee: { key: 'dashboard.badgeDI.rejetee', color: '#ef4444', bg: '#FEF2F2' },
  }
  const s = map[statut] || { key: null, color: '#94a3b8', bg: '#F8FAFC' }
  return <span className="badge-statut" style={{ color: s.color, background: s.bg }}>{s.key ? t(s.key) : statut}</span>
}

function BadgeEquipement({ statut }) {
  const { t } = useTranslation()
  const map = {
    actif:        { color: '#22C55E', bg: '#F0FDF4' },
    en_panne:     { color: '#ef4444', bg: '#FEF2F2' },
    hors_service: { color: '#94a3b8', bg: '#F8FAFC' },
  }
  const s = map[statut] || { color: '#94a3b8', bg: '#F8FAFC' }
  return <span className="badge-statut" style={{ color: s.color, background: s.bg }}>{t(`equipements.statuts.${statut}`)}</span>
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
  const [refreshing,     setRefreshing]     = useState(false)
  const [erreur,         setErreur]         = useState('')
  const [showImprimer,   setShowImprimer]   = useState(false)
  const imprimerRef = useRef(null)

  useEffect(() => {
    getBatiments()
      .then(res => setBatiments(res.data ?? []))
      .catch(err => console.error('Bâtiments:', err))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (imprimerRef.current && !imprimerRef.current.contains(e.target)) setShowImprimer(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { charger() }, [periode, filterBatiment])

  const charger = async (manuel = false) => {
    if (manuel) setRefreshing(true)
    else        setLoading(true)
    setErreur('')
    try {
      const params = { periode }
      if (filterBatiment) params.batiment_id = filterBatiment

      const [resKpi, resDI, resEquip] = await Promise.all([
        getKpiResume(params),
        getDemandes(),
        getEquipements({ statut: 'en_panne', limit: 5, ...(filterBatiment ? { batiment_id: filterBatiment } : {}) }),
      ])

      setKpi(resKpi.data)
      const toutesLesDI = Array.isArray(resDI) ? resDI : (resDI.data ?? [])
      setDiEnAttente(toutesLesDI.filter(d => d.statut === 'ouverte').slice(0, 5))
      setEquipEnPanne(Array.isArray(resEquip) ? resEquip : (resEquip.data ?? []))
    } catch (err) {
      console.error('Dashboard admin:', err)
      setErreur(t('common.error'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const batimentNom = batiments.find(b => b.id === filterBatiment)?.nom || ''

  const donutStatuts = kpi
    ? Object.entries(kpi.interventions_par_statut ?? {})
        .map(([key, val]) => ({ name: t(`interventions.statuts.${key}`), value: val, key }))
        .filter(d => d.value > 0)
    : []

  const donutRatio = kpi
    ? [
        { name: t('interventions.types.preventif'), value: kpi.taux_preventif ?? 0 },
        { name: t('interventions.types.curatif'),   value: kpi.taux_curatif   ?? 0 },
      ].filter(d => d.value > 0)
    : []

  const kpiCards = kpi ? [
    {
      label: t('dashboard.otEnRetard'), value: kpi.ot_en_retard,
      subtitle: t('dashboard.otEnRetardSub'),
      icon: 'ti-alert-circle', color: '#DC2626', bg: '#FEF2F2', bar: '#DC2626',
    },
    {
      label: t('dashboard.equipEnPanneKpi'), value: kpi.nb_equipements_en_panne,
      subtitle: t('dashboard.equipEnPanneKpiSub'),
      icon: 'ti-alert-triangle', color: '#D97706', bg: '#FFF8EC', bar: '#D97706',
    },
    {
      label: t('dashboard.tauxDispo'),
      value: kpi.taux_curatif != null ? `${(100 - kpi.taux_curatif).toFixed(1)} %` : '—',
      subtitle: t('dashboard.tauxDispoSub'),
      icon: 'ti-shield-check', color: '#359349', bg: '#EDFAF1', bar: '#359349',
    },
    {
      label: t('dashboard.mttrGlobal'),
      value: kpi.mttr_heures != null ? `${kpi.mttr_heures} h` : '—',
      subtitle: t('dashboard.mttrSub'),
      icon: 'ti-clock', color: '#123658', bg: '#EEF4FF', bar: '#123658',
    },
    {
      label: t('dashboard.reouvertures'), value: kpi.nb_reouvertures_periode ?? 0,
      subtitle: t('dashboard.reouverturesSub', { n: kpi.periode_jours }),
      icon: 'ti-refresh-alert', color: '#7C3AED', bg: '#F3EEFF', bar: '#7C3AED',
    },
  ] : []

  if (loading) return <div className="dashboard"><p className="dashboard-message">{t('dashboard.loading')}</p></div>
  if (erreur || !kpi) return <div className="dashboard"><p className="dashboard-message dashboard-message--error">{erreur || t('dashboard.noData')}</p></div>

  return (
    <div className="dashboard">

      {/* En-tête de page */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <div className="dashboard-header-actions">
          <button
            className="btn-refresh-icon"
            onClick={() => charger(true)}
            disabled={refreshing}
            title={refreshing ? t('dashboard.refreshing') : t('dashboard.refresh')}
          >
            <i className={`ti ${refreshing ? 'ti-loader-2 spin' : 'ti-refresh'}`} />
          </button>
          <div className="imprimer-wrap" ref={imprimerRef}>
            <button className="btn-imprimer" onClick={() => setShowImprimer(v => !v)}>
              <i className="ti ti-printer" />
              Imprimer
            </button>
            {showImprimer && (
              <div className="imprimer-dropdown">
                <button className="imprimer-item" onClick={() => {
                  exportKpiCSV(kpi, periode, batimentNom)
                  setShowImprimer(false)
                }}>
                  <i className="ti ti-file-type-csv" />{t('dashboard.exportCsv')}
                </button>
                <button className="imprimer-item" onClick={() => {
                  const url = `${import.meta.env.VITE_API_URL}/exports/kpi?format=pdf&periode=${periode}${filterBatiment ? `&batiment_id=${filterBatiment}` : ''}`
                  exportAvecToken(url, `echomaint_kpi_${new Date().toISOString().split('T')[0]}.pdf`, t('common.error'))
                  setShowImprimer(false)
                }}>
                  <i className="ti ti-file-type-pdf" />{t('dashboard.exportPdf')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barre de filtres — carte blanche style UpFix */}
      <div className="dashboard-filter-card">
        <div className="dashboard-filter-group">
          <span className="filter-label-sm">Période</span>
          <select value={periode} onChange={e => setPeriode(e.target.value)} className="dashboard-select">
            <option value="7">{t('common.periods.7')}</option>
            <option value="30">{t('common.periods.30')}</option>
            <option value="90">{t('common.periods.90')}</option>
          </select>
        </div>
        <div className="dashboard-filter-group">
          <span className="filter-label-sm">Bâtiment</span>
          <select value={filterBatiment} onChange={e => setFilterBatiment(e.target.value)} className="dashboard-select">
            <option value="">{t('dashboard.filter.allBuildings')}</option>
            {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
        </div>
      </div>

      <div className="dashboard-kpi dashboard-kpi--5col">
        {kpiCards.map((c, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-card-inner">
              <div className="kpi-icon-left" style={{ background: c.bg }}>
                <i className={`ti ${c.icon}`} style={{ color: c.color }} />
              </div>
              <div className="kpi-text">
                <p className="kpi-label">{c.label}</p>
                <p className="kpi-value">{c.value}</p>
                <p className="kpi-sublabel">{c.subtitle}</p>
              </div>
            </div>
            <div className="kpi-bar" style={{ background: c.bar }} />
          </div>
        ))}
      </div>

      <div className="dashboard-charts-row">
        <div className="dashboard-chart">
          <div className="chart-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap"><i className="ti ti-chart-donut" /></div>
              <div>
                <p className="chart-title">{t('dashboard.otByStatus')}</p>
                <p className="chart-subtitle">{t('dashboard.selectedPeriod')}</p>
              </div>
            </div>
          </div>
          {!kpi?.interventions_par_statut
            ? <p className="chart-empty chart-empty--unavailable">{t('dashboard.unavailable')}</p>
            : donutStatuts.length === 0
            ? <p className="chart-empty">{t('dashboard.noOT')}</p>
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
                <p className="chart-title">{t('dashboard.prevCurRatio')}</p>
                <p className="chart-subtitle">{t('dashboard.closedPeriod')}</p>
              </div>
            </div>
          </div>
          {donutRatio.length === 0
            ? <p className="chart-empty">{t('dashboard.noClosedOT')}</p>
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

      <div className="dashboard-lists-row">
        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap" style={{ background: '#FEF2F2' }}>
                <i className="ti ti-inbox" style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p className="chart-title">{t('dashboard.pendingDI')}</p>
                <p className="chart-subtitle">{t('dashboard.pendingDISub')}</p>
              </div>
            </div>
            <a href="/demandes-intervention" className="list-card-voir-tout">
              {t('dashboard.seeAll')} <i className="ti ti-arrow-right" />
            </a>
          </div>
          {diEnAttente.length === 0
            ? <p className="chart-empty">{t('dashboard.noPendingDI')}</p>
            : (
              <table className="dashboard-table">
                <thead><tr>
                  <th>{t('dashboard.table.ref')}</th>
                  <th>{t('dashboard.table.equipment')}</th>
                  <th>{t('dashboard.table.objet')}</th>
                  <th>{t('dashboard.table.priorite')}</th>
                  <th>{t('dashboard.table.date')}</th>
                  <th>{t('dashboard.table.statut')}</th>
                </tr></thead>
                <tbody>
                  {diEnAttente.map(di => (
                    <tr key={di.id}>
                      <td className="table-ref" data-label={t('dashboard.table.ref')}>#{di.id}</td>
                      <td data-label={t('dashboard.table.equipment')}>{di.equipement?.nom ?? '—'}</td>
                      <td className="table-titre" data-label={t('dashboard.table.objet')}>{di.titre}</td>
                      <td data-label={t('dashboard.table.priorite')}><span className={`badge-priorite badge-priorite--${di.priorite}`}>{di.priorite}</span></td>
                      <td className="table-date" data-label={t('dashboard.table.date')}>{new Date(di.created_at).toLocaleDateString()}</td>
                      <td data-label={t('dashboard.table.statut')}><BadgeDI statut={di.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap" style={{ background: '#FFFBEB' }}>
                <i className="ti ti-tool" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <p className="chart-title">{t('dashboard.equipEnPanne')}</p>
                <p className="chart-subtitle">{t('dashboard.equipEnPanneSub')}</p>
              </div>
            </div>
            <a href="/equipements?statut=en_panne" className="list-card-voir-tout">
              {t('dashboard.seeAll')} <i className="ti ti-arrow-right" />
            </a>
          </div>
          {equipEnPanne.length === 0
            ? <p className="chart-empty" style={{ color: '#22C55E' }}><i className="ti ti-circle-check" /> {t('dashboard.noEquipEnPanne')}</p>
            : (
              <table className="dashboard-table">
                <thead><tr>
                  <th>{t('dashboard.table.equipment')}</th>
                  <th>{t('dashboard.table.ref')}</th>
                  <th>{t('dashboard.table.batiment')}</th>
                  <th>{t('dashboard.table.statut')}</th>
                </tr></thead>
                <tbody>
                  {equipEnPanne.map(eq => (
                    <tr key={eq.id}>
                      <td className="table-titre" data-label={t('dashboard.table.equipment')}>{eq.nom}</td>
                      <td className="table-ref" data-label={t('dashboard.table.ref')}>{eq.reference}</td>
                      <td data-label={t('dashboard.table.batiment')}>{eq.batiment?.nom ?? '—'}</td>
                      <td data-label={t('dashboard.table.statut')}><BadgeEquipement statut={eq.statut} /></td>
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
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [data,           setData]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [erreur,         setErreur]         = useState('')
  const [periode,        setPeriode]        = useState('30')
  const [filterBatiment, setFilterBatiment] = useState('')
  const [batiments,      setBatiments]      = useState([])

  const charger = async () => {
    setLoading(true)
    setErreur('')
    try {
      const params = { periode }
      if (filterBatiment) params.batiment_id = filterBatiment
      const res = await getClientDashboard(params)
      setData(res.data)
      if (res.data.batiments?.length > 0) setBatiments(res.data.batiments)
    } catch (err) {
      console.error('Dashboard client:', err)
      setErreur(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { charger() }, [periode, filterBatiment])

  if (loading) return <div className="dashboard"><p className="dashboard-message">{t('dashboard.loading')}</p></div>
  if (erreur || !data) return <div className="dashboard"><p className="dashboard-message dashboard-message--error">{erreur || t('dashboard.noData')}</p></div>

  const donutParc = [
    { name: t('equipements.statuts.actif'),        value: data.repartition_equipements.actif,        color: '#10b981' },
    { name: t('equipements.statuts.en_panne'),     value: data.repartition_equipements.en_panne,      color: '#ef4444' },
    { name: t('equipements.statuts.hors_service'), value: data.repartition_equipements.hors_service,  color: '#f59e0b' },
  ].filter(d => d.value > 0)

  const donutDI = [
    { name: t('dashboard.badgeDI.pending'), value: data.repartition_demandes.ouverte,  color: '#3b82f6' },
    { name: t('dashboard.badgeDI.traitee'), value: data.repartition_demandes.traitee,  color: '#10b981' },
    { name: t('dashboard.badgeDI.rejetee'), value: data.repartition_demandes.rejetee,  color: '#94a3b8' },
  ].filter(d => d.value > 0)

  const kpiAll = [
    {
      label: t('dashboard.client.myEquipments'), value: data.nb_equipements,
      subtitle: t('dashboard.client.allBuildings'),
      icon: 'ti-settings', color: '#3b82f6', bg: '#EFF6FF', bar: '#3b82f6',
    },
    {
      label: t('dashboard.equipEnPanneKpi'), value: data.nb_equipements_en_panne,
      subtitle: data.nb_equipements_en_panne > 0 ? t('dashboard.client.interventionRequired') : t('dashboard.client.allOperational'),
      icon: 'ti-alert-triangle',
      color: data.nb_equipements_en_panne > 0 ? '#ef4444' : '#10b981',
      bg:    data.nb_equipements_en_panne > 0 ? '#FEF2F2' : '#F0FDF4',
      bar:   data.nb_equipements_en_panne > 0 ? '#ef4444' : '#10b981',
    },
    {
      label: t('dashboard.client.pendingDemands'), value: data.nb_demandes_en_attente,
      subtitle: t('dashboard.client.inProgress'),
      icon: 'ti-clock', color: '#f59e0b', bg: '#FFFBEB', bar: '#f59e0b',
    },
    {
      label: t('dashboard.client.myInterventions'), value: data.nb_interventions_en_cours,
      subtitle: t('dashboard.client.onYourEquipments'),
      icon: 'ti-tools', color: '#8b5cf6', bg: '#F5F3FF', bar: '#8b5cf6',
    },
    {
      label: t('dashboard.client.terminatedPeriod'), value: data.nb_interventions_terminees_mois,
      subtitle: t('common.periods.' + periode),
      icon: 'ti-circle-check', color: '#10b981', bg: '#F0FDF4', bar: '#10b981',
    },
  ]

  return (
    <div className="dashboard">

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      <div className="dashboard-filters">
        <div className="dashboard-filters-left">
          <select value={periode} onChange={e => setPeriode(e.target.value)} className="dashboard-select">
            <option value="7">{t('common.periods.7')}</option>
            <option value="30">{t('common.periods.30')}</option>
            <option value="90">{t('common.periods.90')}</option>
          </select>
          <select value={filterBatiment} onChange={e => setFilterBatiment(e.target.value)} className="dashboard-select">
            <option value="">{t('dashboard.filter.allBuildings')}</option>
            {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
        </div>
      </div>

      <div className="dashboard-kpi dashboard-kpi--5col">
        {kpiAll.map((c, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-card-inner">
              <div className="kpi-icon-left" style={{ background: c.bg }}>
                <i className={`ti ${c.icon}`} style={{ color: c.color }} />
              </div>
              <div className="kpi-text">
                <p className="kpi-label">{c.label}</p>
                <p className="kpi-value" style={{ color: c.color }}>{c.value}</p>
                <p className="kpi-sublabel">{c.subtitle}</p>
              </div>
            </div>
            <div className="kpi-bar" style={{ background: c.bar }} />
          </div>
        ))}
      </div>

      <div className="dashboard-charts-row">
        <div className="dashboard-chart">
          <div className="chart-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap"><i className="ti ti-chart-donut" /></div>
              <div>
                <p className="chart-title">{t('dashboard.client.parcTitle')}</p>
                <p className="chart-subtitle">{t('dashboard.client.parcSubtitle')}</p>
              </div>
            </div>
          </div>
          {donutParc.length === 0
            ? <p className="chart-empty">{t('dashboard.client.noEquipements')}</p>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={donutParc} cx="50%" cy="45%" innerRadius={60} outerRadius={95}
                       paddingAngle={3} dataKey="value" labelLine={false} label={DonutLabel}>
                    {donutParc.map((d, i) => <Cell key={i} fill={d.color} />)}
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
              <div className="chart-icon-wrap" style={{ background: '#EFF6FF' }}>
                <i className="ti ti-file-text" style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <p className="chart-title">{t('dashboard.client.myDI')}</p>
                <p className="chart-subtitle">{t('common.periods.' + periode)}</p>
              </div>
            </div>
          </div>
          {donutDI.length === 0
            ? <p className="chart-empty">{t('dashboard.client.noDIPeriod')}</p>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={donutDI} cx="50%" cy="45%" innerRadius={60} outerRadius={95}
                       paddingAngle={3} dataKey="value" labelLine={false} label={DonutLabel}>
                    {donutDI.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ color: '#64748B', fontSize: '12px' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      <div className="dashboard-client-lists">

        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap"><i className="ti ti-file-text" /></div>
              <div>
                <p className="chart-title">{t('dashboard.client.lastDI')}</p>
                <p className="chart-subtitle">{t('dashboard.client.lastDISub')}</p>
              </div>
            </div>
            <button className="list-card-voir-tout" onClick={() => navigate('/demandes-intervention')}>
              {t('dashboard.seeAll')} <i className="ti ti-arrow-right" />
            </button>
          </div>

          {data.dernieres_demandes.length === 0 ? (
            <div className="chart-empty chart-empty--action">
              <i className="ti ti-inbox" style={{ fontSize: '2rem', color: '#CBD5E1' }} />
              <p>{t('dashboard.client.noDI')}</p>
              <button className="btn-nouvelle-di btn-nouvelle-di--sm" onClick={() => navigate('/demandes-intervention')}>
                <i className="ti ti-plus" /> {t('dashboard.client.newDemand')}
              </button>
            </div>
          ) : (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>{t('dashboard.table.ref')}</th>
                  <th>{t('dashboard.table.objet')}</th>
                  <th>{t('dashboard.table.equipment')}</th>
                  <th>{t('dashboard.table.statut')}</th>
                  <th>{t('dashboard.table.date')}</th>
                </tr>
              </thead>
              <tbody>
                {data.dernieres_demandes.map(di => (
                  <tr key={di.id}>
                    <td className="table-ref" data-label={t('dashboard.table.ref')}>{di.id.slice(0, 8).toUpperCase()}</td>
                    <td className="table-titre" data-label={t('dashboard.table.objet')}>{di.titre}</td>
                    <td data-label={t('dashboard.table.equipment')}>{di.equipement_nom ?? '—'}</td>
                    <td data-label={t('dashboard.table.statut')}><BadgeDI statut={di.statut} /></td>
                    <td className="table-date" data-label={t('dashboard.table.date')}>
                      {new Date(di.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap" style={{ background: '#FEF2F2' }}>
                <i className="ti ti-alert-triangle" style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p className="chart-title">{t('dashboard.client.criticalEquipments')}</p>
                <p className="chart-subtitle">{t('dashboard.client.criticalEquipmentsSub')}</p>
              </div>
            </div>
            {data.equipements_en_panne.length > 0 && (
              <button className="list-card-voir-tout" onClick={() => navigate('/equipements?statut=en_panne')}>
                {t('dashboard.seeAll')} <i className="ti ti-arrow-right" />
              </button>
            )}
          </div>

          {data.equipements_en_panne.length === 0 ? (
            <div className="chart-empty">
              <i className="ti ti-circle-check" style={{ fontSize: '2rem', color: '#10b981' }} />
              <p style={{ color: '#10b981', fontWeight: 600 }}>
                ✓ {t('dashboard.client.allEquipmentsOk')}
              </p>
            </div>
          ) : (
            <ul className="equip-panne-list">
              {data.equipements_en_panne.map(eq => (
                <li key={eq.id} className="equip-panne-item">
                  <div className="equip-panne-icon"><i className="ti ti-cpu" /></div>
                  <div className="equip-panne-info">
                    <span className="equip-panne-nom">{eq.nom}</span>
                    <span className="equip-panne-ref">
                      {eq.reference ? `${eq.reference} · ` : ''}{eq.batiment_nom ?? '—'}
                    </span>
                  </div>
                  <span className="badge-statut" style={{ color: '#ef4444', background: '#FEF2F2' }}>
                    {t('dashboard.client.enPanne')}
                  </span>
                  <button className="btn-di-equip" onClick={() => navigate('/demandes-intervention')} title={t('dashboard.client.newDemand')}>
                    <i className="ti ti-plus" /> DI
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Graphique annuel technicien ─────────────────────────────────────────────
const MOIS_LABELS_TECH = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

function TooltipAnnuelTech({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const disponibles = payload.find(p => p.dataKey === 'disponibles')?.value ?? 0
  const clotures    = payload.find(p => p.dataKey === 'clotures')?.value ?? 0
  const reportes    = payload[0]?.payload?.reportes ?? 0
  const idx         = MOIS_LABELS_TECH.indexOf(label)
  const moisSuivant = idx >= 0 && idx < 11 ? MOIS_LABELS_TECH[idx + 1] : null
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minWidth: 180 }}>
      <p style={{ fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#123658', margin: '2px 0' }}>● {disponibles} disponible{disponibles !== 1 ? 's' : ''}</p>
      <p style={{ color: '#359349', margin: '2px 0' }}>● {clotures} clôturé{clotures !== 1 ? 's' : ''}</p>
      {moisSuivant && reportes > 0 && (
        <p style={{ color: '#94a3b8', marginTop: 6, fontSize: 12 }}>{reportes} reporté{reportes !== 1 ? 's' : ''} en {moisSuivant}</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VUE TECHNICIEN
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardTechnicien() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur,  setErreur]  = useState(null)
  const [periode, setPeriode] = useState('30')

  const chargerTech = (p) => {
    setLoading(true)
    setErreur(null)
    getTechnicienDashboard({ periode: p })
      .then(res => setData(res.data))
      .catch(() => setErreur(t('common.error')))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { chargerTech(periode) }, [periode])

  if (loading) return <div className="dashboard-message">{t('dashboard.loading')}</div>
  if (erreur)  return <div className="dashboard-message dashboard-message--error">{erreur}</div>
  if (!data)   return null

  const kpi4 = [
    {
      label:    t('dashboard.tech.todayOT'), value: data.nb_ot_planifies_aujourd_hui,
      subtitle: t('dashboard.tech.todayOTSub'),
      icon: 'ti-calendar', color: '#123658', bg: '#EEF4FF', bar: '#123658',
    },
    {
      label:    t('dashboard.tech.inProgress'), value: data.nb_ot_en_cours,
      subtitle: t('dashboard.tech.inProgressSub'),
      icon: 'ti-tools', color: '#7C3AED', bg: '#F3EEFF', bar: '#7C3AED',
    },
    {
      label:    t('dashboard.tech.terminatedPeriod'), value: data.nb_ot_termines_mois,
      subtitle: t('common.periods.' + periode),
      icon: 'ti-circle-check', color: '#359349', bg: '#EDFAF1', bar: '#359349',
    },
  ]

  const tauxColor  = data.taux_cloture >= 80 ? '#10b981' : data.taux_cloture >= 50 ? '#f59e0b' : '#ef4444'
  const tauxBg     = data.taux_cloture >= 80 ? '#F0FDF4' : data.taux_cloture >= 50 ? '#FFFBEB' : '#FEF2F2'
  const moisActuel = new Date().getMonth() + 1 // 1 = Janvier, 12 = Décembre

  return (
    <div className="dashboard">

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      <div className="dashboard-filters">
        <div className="dashboard-filters-left">
          <select value={periode} onChange={e => setPeriode(e.target.value)} className="dashboard-select">
            <option value="7">{t('common.periods.7')}</option>
            <option value="30">{t('common.periods.30')}</option>
            <option value="90">{t('common.periods.90')}</option>
          </select>
        </div>
      </div>

      <div className="dashboard-kpi dashboard-kpi--5col">

        {kpi4.map((c, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-card-inner">
              <div className="kpi-icon-left" style={{ background: c.bg }}>
                <i className={`ti ${c.icon}`} style={{ color: c.color }} />
              </div>
              <div className="kpi-text">
                <p className="kpi-label">{c.label}</p>
                <p className="kpi-value" style={{ color: c.color }}>{c.value}</p>
                <p className="kpi-sublabel">{c.subtitle}</p>
              </div>
            </div>
            <div className="kpi-bar" style={{ background: c.bar }} />
          </div>
        ))}

        <div className="kpi-card">
          <div className="kpi-card-inner">
            <div className="kpi-icon-left" style={{ background: '#FFF8EC' }}>
              <i className="ti ti-percentage" style={{ color: '#D97706' }} />
            </div>
            <div className="kpi-text">
              <p className="kpi-label">{t('dashboard.tech.tauxCloture')}</p>
              <p className="kpi-value">{data.taux_cloture} %</p>
              <p className="kpi-sublabel">{t('dashboard.tech.tauxClotureSub')}</p>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-inner">
            <div className="kpi-icon-left" style={{ background: '#FEF2F2' }}>
              <i className="ti ti-clock-exclamation" style={{ color: '#DC2626' }} />
            </div>
            <div className="kpi-text">
              <p className="kpi-label">{t('dashboard.otEnRetard')}</p>
              <p className="kpi-value">{data.nb_ot_en_retard}</p>
              <p className="kpi-sublabel">
                {data.nb_ot_en_retard > 0 ? t('dashboard.otEnRetardSub') : t('dashboard.tech.noLate')}
              </p>
            </div>
          </div>
          <div className="kpi-bar" style={{ background: '#DC2626' }} />
        </div>


      </div>

      <div className="dashboard-lists-row">

        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap"><i className="ti ti-calendar-event" /></div>
              <div>
                <p className="chart-title">{t('dashboard.tech.todayTitle')}</p>
                <p className="chart-subtitle">{t('dashboard.tech.todaySubtitle')}</p>
              </div>
            </div>
            {data.ot_aujourd_hui.length > 0 && (
              <button className="list-card-voir-tout" onClick={() => navigate('/interventions')}>
                {t('dashboard.tech.seeAll')} <i className="ti ti-arrow-right" />
              </button>
            )}
          </div>

          {data.ot_aujourd_hui.length === 0 ? (
            <div className="chart-empty">
              <i className="ti ti-circle-check" style={{ fontSize: '2rem', color: '#10b981' }} />
              <p style={{ color: '#10b981', fontWeight: 600 }}>✓ {t('dashboard.tech.noTodayOT')}</p>
            </div>
          ) : (
            <div className="ot-list">
              {data.ot_aujourd_hui.map(ot => {
                const sc = OT_STATUT_COLORS[ot.statut]  || OT_STATUT_COLORS.planifiee
                const pc = OT_PRIORITE_COLORS[ot.priorite] || OT_PRIORITE_COLORS.normale
                return (
                  <div key={ot.id} className="ot-item" onClick={() => navigate(`/interventions/${ot.id}`)}>
                    <span className="badge-statut" style={{ color: sc.color, background: sc.bg }}>
                      {t(`interventions.statuts.${ot.statut}`)}
                    </span>
                    <div className="ot-item-info">
                      <p className="ot-item-titre">{ot.titre}</p>
                      <p className="ot-item-meta">{ot.equipement_nom} · {ot.batiment_nom}</p>
                    </div>
                    <span className="badge-priorite" style={{ color: pc.color, background: pc.bg }}>
                      {ot.priorite || 'normale'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="dashboard-list-card">
          <div className="list-card-header">
            <div className="chart-header-left">
              <div className="chart-icon-wrap" style={{ background: '#EEF2FF' }}>
                <i className="ti ti-calendar-stats" style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p className="chart-title">{t('dashboard.tech.nextOTTitle')}</p>
                <p className="chart-subtitle">{t('dashboard.tech.nextOTSub')}</p>
              </div>
            </div>
          </div>

          {data.prochains_ot.length === 0 ? (
            <div className="chart-empty">
              <i className="ti ti-calendar-off" style={{ fontSize: '2rem', color: '#CBD5E1' }} />
              <p>{t('dashboard.tech.noNextOT')}</p>
            </div>
          ) : (
            <>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>{t('dashboard.table.date')}</th>
                    <th>{t('dashboard.table.equipment')}</th>
                    <th>{t('dashboard.table.type')}</th>
                    <th>{t('dashboard.table.priorite')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.prochains_ot.map(ot => {
                    const pc = OT_PRIORITE_COLORS[ot.priorite] || OT_PRIORITE_COLORS.normale
                    return (
                      <tr key={ot.id} onClick={() => navigate(`/interventions/${ot.id}`)} style={{ cursor: 'pointer' }}>
                        <td className="table-date" data-label={t('dashboard.table.date')}>
                          {ot.date_planifiee ? new Date(ot.date_planifiee).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                        </td>
                        <td data-label={t('dashboard.table.equipment')}>{ot.equipement_nom}</td>
                        <td data-label={t('dashboard.table.type')} style={{ textTransform: 'capitalize' }}>{ot.type}</td>
                        <td data-label={t('dashboard.table.priorite')}>
                          <span className="badge-priorite" style={{ color: pc.color, background: pc.bg }}>{ot.priorite || '—'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <button className="list-card-voir-tout" onClick={() => navigate('/planning')} style={{ alignSelf: 'flex-end', marginTop: 'auto' }}>
                {t('dashboard.tech.seeMyPlanning')} <i className="ti ti-arrow-right" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="dashboard-chart">
        <div className="chart-header">
          <div className="chart-header-left">
            <div className="chart-icon-wrap" style={{ background: '#EBF4FF' }}>
              <i className="ti ti-chart-bar" style={{ color: '#123658' }} />
            </div>
            <div>
              <p className="chart-title">Mes interventions — {new Date().getFullYear()}</p>
              <p className="chart-subtitle">OT disponibles vs clôturés par mois</p>
            </div>
          </div>
        </div>
        {data.activite_annuelle.every(m => m.disponibles === 0 && m.clotures === 0) ? (
          <div className="chart-empty">
            <i className="ti ti-calendar-off" style={{ fontSize: '2rem', color: '#CBD5E1' }} />
            <p>Aucune intervention assignée cette année</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data.activite_annuelle}
              margin={{ top: 10, right: 16, bottom: 0, left: -20 }}
              barGap={3}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipAnnuelTech />} />
              <Legend
                iconType="circle"
                iconSize={10}
                formatter={v => <span style={{ color: '#64748B', fontSize: '12px' }}>{v}</span>}
              />
              <Bar dataKey="disponibles" name="OT disponibles ce mois" fill="#123658" radius={[4, 4, 0, 0]}>
                {data.activite_annuelle.map((_, idx) => (
                  <Cell key={idx} fill="#123658" opacity={idx + 1 > moisActuel ? 0.2 : 1} />
                ))}
              </Bar>
              <Bar dataKey="clotures" name="OT clôturés" fill="#359349" radius={[4, 4, 0, 0]}>
                {data.activite_annuelle.map((_, idx) => (
                  <Cell key={idx} fill="#359349" opacity={idx + 1 > moisActuel ? 0.2 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTEUR DE RÔLE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()

  if (!user) return null

  if (user.role === 'admin')      return <DashboardAdmin />
  if (user.role === 'technicien') return <DashboardTechnicien />
  if (user.role === 'client')     return <DashboardClient />

  return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
      {t('common.error')}: {user.role}
    </div>
  )
}
