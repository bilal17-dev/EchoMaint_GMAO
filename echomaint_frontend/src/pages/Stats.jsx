import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './Stats.css'
import { getInterventions } from '../api/interventions.api'
import { getBatiments } from '../api/batiments.api'
import { getTechniciens } from '../api/utilisateurs.api'
import { getKpiResume } from '../api/stats.api'

const STATUTS = ['planifiee', 'assignee', 'en_cours', 'terminee', 'annulee']
const TYPES   = ['preventif', 'curatif']

const API_URL = import.meta.env.VITE_API_URL

async function exportAvecToken(url, nomFichier, errMsg, networkErrMsg) {
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
    window.alert(networkErrMsg)
  }
}

export default function Stats() {
  const { t } = useTranslation()

  const [interventions,    setInterventions]    = useState([])
  const [batiments,        setBatiments]        = useState([])
  const [techniciens,      setTechniciens]      = useState([])
  const [kpiResume,        setKpiResume]        = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [erreur,           setErreur]           = useState('')

  const [periode,          setPeriode]          = useState('30')

  const [filterStatut,     setFilterStatut]     = useState('')
  const [filterType,       setFilterType]       = useState('')
  const [filterBatiment,   setFilterBatiment]   = useState('')
  const [filterTechnicien, setFilterTechnicien] = useState('')
  const [dateDebut,        setDateDebut]        = useState('')
  const [dateFin,          setDateFin]          = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { chargerDonnees() }, [periode])

  const chargerDonnees = async () => {
    setLoading(true); setErreur('')
    try {
      const [resI, resB, resT, resKpi] = await Promise.all([
        getInterventions(),
        getBatiments(),
        getTechniciens(),
        getKpiResume({ periode }),
      ])
      setInterventions(Array.isArray(resI?.data) ? resI.data : [])
      setBatiments(Array.isArray(resB?.data) ? resB.data : [])
      setTechniciens(Array.isArray(resT?.data) ? resT.data : [])
      setKpiResume(resKpi?.data ?? null)
    } catch (error) {
      console.error('Erreur chargement stats:', error)
      setErreur(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const filtered = interventions.filter(ot => {
    if (filterStatut     && ot.statut        !== filterStatut)     return false
    if (filterType       && ot.type          !== filterType)       return false
    if (filterBatiment   && ot.batiment_id   !== filterBatiment)   return false
    if (filterTechnicien && ot.technicien_id !== filterTechnicien) return false
    if (dateDebut && new Date(ot.date_planifiee) < new Date(dateDebut)) return false
    if (dateFin   && new Date(ot.date_planifiee) > new Date(dateFin))   return false
    return true
  })

  const buildExportParams = (format) => {
    const p = new URLSearchParams({ format })
    if (filterStatut)     p.set('statut',               filterStatut)
    if (filterType)       p.set('type',                 filterType)
    if (filterBatiment)   p.set('batiment_id',          filterBatiment)
    if (filterTechnicien) p.set('technicien_id',        filterTechnicien)
    if (dateDebut)        p.set('date_planifiee_debut', dateDebut)
    if (dateFin)          p.set('date_planifiee_fin',   dateFin)
    return p.toString()
  }

  const buildKpiParams = (format) => {
    const p = new URLSearchParams({ format, periode })
    if (filterBatiment) p.set('batiment_id', filterBatiment)
    return p.toString()
  }

  const doExport = (url, filename) =>
    exportAvecToken(url, filename, t('common.error'), t('common.error'))

  if (loading) return (
    <div className="stats">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>{t('stats.loading')}</p>
    </div>
  )

  if (erreur) return (
    <div className="stats">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{erreur}</p>
    </div>
  )

  return (
    <div className="stats">

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('layout.stats.title')}</h1>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: '3px' }}>{t('layout.stats.subtitle')}</p>
        </div>
      </div>

      {/* ── Résumé KPI ───────────────────────────────────────────────────────── */}
      <div className="stats-section stats-kpi-resume">
        <div className="stats-kpi-resume-header">
          <div>
            <h2>{t('stats.kpiResume')}</h2>
            <p>{t('stats.kpiDesc')}</p>
          </div>
          <select
            value={periode}
            onChange={e => setPeriode(e.target.value)}
            className="stats-select-periode"
          >
            <option value="7">{t('common.periods.7')}</option>
            <option value="30">{t('common.periods.30')}</option>
            <option value="90">{t('common.periods.90')}</option>
          </select>
        </div>

        {kpiResume ? (
          <div className="stats-kpi-grid">
            <div className="stats-kpi-card">
              <span className="stats-kpi-val">{kpiResume.nb_interventions_periode}</span>
              <span className="stats-kpi-lbl">{t('stats.kpiCards.interventionsCloturees')}</span>
            </div>
            <div className="stats-kpi-card">
              <span className="stats-kpi-val stats-kpi-val--warn">{kpiResume.ot_en_retard}</span>
              <span className="stats-kpi-lbl">{t('stats.kpiCards.otEnRetard')}</span>
            </div>
            <div className="stats-kpi-card">
              <span className="stats-kpi-val stats-kpi-val--blue">{kpiResume.taux_preventif} %</span>
              <span className="stats-kpi-lbl">{t('stats.kpiCards.tauxPreventif')}</span>
            </div>
            <div className="stats-kpi-card">
              <span className="stats-kpi-val">{kpiResume.mttr_heures != null ? `${kpiResume.mttr_heures} h` : '—'}</span>
              <span className="stats-kpi-lbl">{t('stats.kpiCards.mttrMoyen')}</span>
            </div>
            <div className="stats-kpi-card">
              <span className="stats-kpi-val stats-kpi-val--purple">{kpiResume.nb_reouvertures_periode}</span>
              <span className="stats-kpi-lbl">{t('stats.kpiCards.reouvertures')}</span>
            </div>
          </div>
        ) : (
          <p className="stats-kpi-indisponible">{t('stats.kpiIndisponible')}</p>
        )}
      </div>

      {/* ── Export Interventions ─────────────────────────────────────────────── */}
      <div className="stats-section">
        <div className="stats-section-header">
          <div>
            <h2>{t('stats.exportInterventionsTitle')}</h2>
            <p>
              {t('stats.exportInterventionsDesc')}
              {filtered.length !== interventions.length && (
                <strong> {filtered.length} OT {t('stats.otMatchFilters')}.</strong>
              )}
            </p>
          </div>
          <div className="stats-export-btns">
            <button
              className="btn-export"
              onClick={() => doExport(
                `${API_URL}/exports/interventions?${buildExportParams('csv')}`,
                `echomaint_interventions_${new Date().toISOString().split('T')[0]}.csv`
              )}
            >
              <i className="ti ti-file-type-csv" />
              {t('stats.exportCsvOT')} ({filtered.length} OT)
            </button>
            <button
              className="btn-export btn-export-pdf"
              onClick={() => doExport(
                `${API_URL}/exports/interventions?${buildExportParams('pdf')}`,
                `echomaint_interventions_${new Date().toISOString().split('T')[0]}.pdf`
              )}
            >
              <i className="ti ti-file-type-pdf" />
              {t('stats.exportPdfOT')}
            </button>
          </div>
        </div>

        <div className="stats-filters">
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">{t('interventions.allStatuts')}</option>
            {STATUTS.map(s => <option key={s} value={s}>{t(`interventions.statuts.${s}`)}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">{t('interventions.allTypes')}</option>
            {TYPES.map(tp => <option key={tp} value={tp}>{t(`interventions.types.${tp}`)}</option>)}
          </select>
          <select value={filterBatiment} onChange={e => setFilterBatiment(e.target.value)}>
            <option value="">{t('interventions.allBatiments')}</option>
            {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
          <select value={filterTechnicien} onChange={e => setFilterTechnicien(e.target.value)}>
            <option value="">{t('interventions.allTechniciens')}</option>
            {techniciens.map(tech => <option key={tech.id} value={tech.id}>{tech.prenom} {tech.nom}</option>)}
          </select>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} title={t('interventions.dateFrom')} />
          <input type="date" value={dateFin}   onChange={e => setDateFin(e.target.value)}   title={t('interventions.dateTo')} />
        </div>

        {filtered.length === 0 ? (
          <div className="stats-empty">
            <i className="ti ti-clipboard-off" />
            <p>{t('stats.empty')}</p>
          </div>
        ) : (
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>{t('stats.table.titre')}</th>
                  <th>{t('stats.table.type')}</th>
                  <th>{t('stats.table.statut')}</th>
                  <th>{t('stats.table.priorite')}</th>
                  <th>{t('stats.table.equipement')}</th>
                  <th>{t('stats.table.batiment')}</th>
                  <th>{t('stats.table.technicien')}</th>
                  <th>{t('stats.table.datePlanifiee')}</th>
                  <th>{t('stats.table.duree')}</th>
                  <th>{t('stats.table.reouvertures')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ot => (
                  <tr key={ot.id}>
                    <td className="stats-td-titre">{ot.titre}</td>
                    <td>
                      <span className={`stats-chip ${ot.type === 'preventif' ? 'chip-prev' : 'chip-cur'}`}>
                        {t(`interventions.types.${ot.type}`)}
                      </span>
                    </td>
                    <td>
                      <span className={`stats-chip stats-chip-${ot.statut}`}>
                        {t(`interventions.statuts.${ot.statut}`)}
                      </span>
                    </td>
                    <td>{ot.priorite ? t(`interventions.priorites.${ot.priorite}`) : '—'}</td>
                    <td>{ot.equipement_nom || '—'}</td>
                    <td>{ot.batiment_nom   || '—'}</td>
                    <td>
                      {ot.technicien_nom
                        ? ot.technicien_nom.trim() || '—'
                        : <span style={{ color: '#94a3b8' }}>—</span>
                      }
                    </td>
                    <td>{ot.date_planifiee ? new Date(ot.date_planifiee).toLocaleDateString() : '—'}</td>
                    <td className="stats-td-center">{ot.duree_reelle_minutes || '—'}</td>
                    <td className="stats-td-center">{ot.nb_reouvertures ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Export KPI ──────────────────────────────────────────────────────── */}
      <div className="stats-section stats-section-kpi">
        <div className="stats-section-header">
          <div>
            <h2>{t('stats.exportKpiTitle')}</h2>
            <p>
              {t('stats.exportKpiDesc')} ({t(`common.periods.${periode}`)}
              {filterBatiment ? `, ${t('stats.batimentFiltre')}` : ''})
            </p>
          </div>
          <div className="stats-export-btns">
            <button
              className="btn-export"
              onClick={() => doExport(
                `${API_URL}/exports/kpi?${buildKpiParams('csv')}`,
                `echomaint_kpi_${new Date().toISOString().split('T')[0]}.csv`
              )}
            >
              <i className="ti ti-file-type-csv" />
              {t('stats.exportKpiCsv')}
            </button>
            <button
              className="btn-export btn-export-pdf"
              onClick={() => doExport(
                `${API_URL}/exports/kpi?${buildKpiParams('pdf')}`,
                `echomaint_kpi_${new Date().toISOString().split('T')[0]}.pdf`
              )}
            >
              <i className="ti ti-file-type-pdf" />
              {t('stats.exportKpiPdf')}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
