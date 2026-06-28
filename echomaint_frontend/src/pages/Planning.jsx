import { useState, useEffect, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Planning.css'

import { getPlanning } from '../api/planning.api'
import { getBatiments } from '../api/batiments.api'
import { getTechniciens } from '../api/utilisateurs.api'
import { replanifier } from '../api/interventions.api'

const STATUT_CHIP = {
  planifiee: 'chip-planifiee',
  assignee:  'chip-assignee',
  en_cours:  'chip-en-cours',
  terminee:  'chip-terminee',
  annulee:   'chip-annulee',
}

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function Planning() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('echomaint_user') || '{}')

  const DAYS = [
    t('planning.days.mon'), t('planning.days.tue'), t('planning.days.wed'),
    t('planning.days.thu'), t('planning.days.fri'), t('planning.days.sat'), t('planning.days.sun'),
  ]
  const MONTHS = MONTH_KEYS.map(k => t(`planning.months.${k}`))

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())

  const [filterBatiment, setFilterBatiment] = useState('')
  const [filterTechnicien, setFilterTechnicien] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [planningOTs, setPlanningOTs] = useState([])
  const [batiments, setBatiments] = useState([])
  const [techniciens, setTechniciens] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  const [planPage, setPlanPage] = useState(1)
  const PLAN_PER_PAGE = 5

  const [otReplanifier,      setOtReplanifier]      = useState(null)
  const [nouvelleDate,       setNouvelleDate]       = useState('')
  const [erreurReplanif,     setErreurReplanif]     = useState('')
  const [submittingReplanif, setSubmittingReplanif] = useState(false)

  useEffect(() => {
    Promise.all([getBatiments(), getTechniciens()])
      .then(([resBat, resTech]) => {
        setBatiments(Array.isArray(resBat)  ? resBat  : (resBat.data  ?? []))
        setTechniciens(Array.isArray(resTech) ? resTech : (resTech.data ?? []))
      })
      .catch(err => console.error('Erreur chargement filtres:', err))
  }, [])

  const chargerPlanning = async () => {
    setLoading(true)
    setErreur('')
    try {
      const dateDebut = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
      const dateFin   = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${getDaysInMonth(viewYear, viewMonth)}`

      const params = { date_debut: dateDebut, date_fin: dateFin }
      if (filterBatiment)   params.batiment_id   = filterBatiment
      if (filterTechnicien) params.technicien_id = filterTechnicien
      if (filterStatut)     params.statut        = filterStatut

      const res = await getPlanning(params)
      setPlanningOTs(Array.isArray(res) ? res : (res.data ?? []))
    } catch (error) {
      console.error('Erreur de chargement du planning:', error)
      setErreur(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    chargerPlanning()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, filterBatiment, filterTechnicien, filterStatut])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDay(1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDay(1)
  }

  const otsByDay = useMemo(() => {
    const map = {}
    planningOTs.forEach(ot => {
      const d = new Date(ot.date_planifiee)
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(ot)
      }
    })
    return map
  }, [planningOTs, viewYear, viewMonth])

  const selectedDayOTs = otsByDay[selectedDay] || []

  const monthOTs = useMemo(() =>
    [...planningOTs].sort((a, b) => new Date(a.date_planifiee) - new Date(b.date_planifiee))
  , [planningOTs])

  // Pagination de la liste mensuelle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPlanPage(1) }, [viewYear, viewMonth])
  const planTotalPages = Math.max(1, Math.ceil(monthOTs.length / PLAN_PER_PAGE))
  const planPaginated  = monthOTs.slice((planPage - 1) * PLAN_PER_PAGE, planPage * PLAN_PER_PAGE)

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const isToday = (day) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()

  const peutReplanifier = (ot) => {
    if (!['planifiee', 'assignee'].includes(ot.statut)) return false
    if (user.role === 'admin') return true
    return user.role === 'technicien' && ot.technicien_id === user.id
  }

  const fermerModalReplanif = () => {
    setOtReplanifier(null)
    setNouvelleDate('')
    setErreurReplanif('')
  }

  const ouvrirModalReplanif = (ot, e) => {
    e.stopPropagation()
    setOtReplanifier(ot)
    setNouvelleDate(ot.date_planifiee ? ot.date_planifiee.substring(0, 10) : '')
    setErreurReplanif('')
  }

  const handleReplanifier = async () => {
    if (!nouvelleDate) {
      setErreurReplanif(t('planning.rescheduleRequired'))
      return
    }
    setSubmittingReplanif(true)
    setErreurReplanif('')
    try {
      await replanifier(otReplanifier.id, nouvelleDate)
      fermerModalReplanif()
      await chargerPlanning()
    } catch (error) {
      setErreurReplanif(error.response?.data?.message || t('common.error'))
    } finally {
      setSubmittingReplanif(false)
    }
  }

  return (
    <div className="planning">

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('layout.planning.title')}</h1>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: '3px' }}>{t('layout.planning.subtitle')}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="planning-filters-toolbar">
        {(() => {
          const n = [filterBatiment, filterTechnicien, filterStatut].filter(Boolean).length
          return (
            <button
              className={`btn-filter-mobile${n > 0 ? ' has-active' : ''}`}
              onClick={() => setShowFilters(v => !v)}
            >
              <i className="ti ti-filter" />
              {t('common.filters')}
              {n > 0 && <span className="filter-mobile-badge">{n}</span>}
            </button>
          )
        })()}
      </div>
      <div className={`planning-filters${showFilters ? ' is-open' : ''}`}>
        <select value={filterBatiment} onChange={e => setFilterBatiment(e.target.value)}>
          <option value="">{t('interventions.allBatiments')}</option>
          {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </select>

        {user?.role === 'admin' && (
          <select value={filterTechnicien} onChange={e => setFilterTechnicien(e.target.value)}>
            <option value="">{t('interventions.allTechniciens')}</option>
            {techniciens.map(tech => <option key={tech.id} value={tech.id}>{tech.prenom} {tech.nom}</option>)}
          </select>
        )}

        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">{t('interventions.allStatuts')}</option>
          {Object.keys(STATUT_CHIP).map(val => (
            <option key={val} value={val}>{t(`interventions.statuts.${val}`)}</option>
          ))}
        </select>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', padding: '1rem', color: '#64748B', fontSize: '13px' }}>
          {t('planning.loading')}
        </p>
      )}

      {erreur && (
        <p style={{ textAlign: 'center', padding: '1rem', color: '#ef4444', fontSize: '13px' }}>
          {erreur}
        </p>
      )}

      <div className="planning-layout">

        {/* Calendrier */}
        <div className="calendar-card">
          <div className="calendar-nav">
            <button className="cal-nav-btn" onClick={prevMonth}>
              <i className="ti ti-chevron-left" aria-hidden="true" />
            </button>
            <h2>{MONTHS[viewMonth]} {viewYear}</h2>
            <button className="cal-nav-btn" onClick={nextMonth}>
              <i className="ti ti-chevron-right" aria-hidden="true" />
            </button>
          </div>

          <div className="calendar-grid">
            {DAYS.map(d => (
              <div key={d} className="cal-day-header">{d}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="cal-day cal-day-empty" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dayOTs = otsByDay[day] || []
              return (
                <div
                  key={day}
                  className={[
                    'cal-day',
                    selectedDay === day ? 'cal-day-selected' : '',
                    isToday(day) ? 'cal-day-today' : '',
                    dayOTs.length > 0 ? 'cal-day-has-ot' : ''
                  ].join(' ')}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="cal-day-num">{day}</span>
                  {dayOTs.length > 0 && (
                    <>
                      <div className="cal-day-dots">
                        {dayOTs.slice(0, 4).map(ot => (
                          <span
                            key={ot.id}
                            className={`cal-dot ${ot.type === 'preventif' ? 'dot-preventif' : 'dot-curatif'}`}
                          />
                        ))}
                        {dayOTs.length > 4 && (
                          <span className="cal-dot-more">+{dayOTs.length - 4}</span>
                        )}
                      </div>
                      <span className="cal-day-count">{dayOTs.length}</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="calendar-legend">
            <span className="legend-item">
              <span className="cal-dot dot-preventif" /> {t('interventions.types.preventif')}
            </span>
            <span className="legend-item">
              <span className="cal-dot dot-curatif" /> {t('interventions.types.curatif')}
            </span>
          </div>
        </div>

        {/* Panel du jour sélectionné */}
        <div className="planning-day-panel">
          <h3 className="day-panel-title">
            <i className="ti ti-calendar-event" aria-hidden="true" />
            {selectedDay} {MONTHS[viewMonth]} {viewYear}
          </h3>

          {selectedDayOTs.length === 0 ? (
            <div className="day-panel-empty">
              <i className="ti ti-calendar-off" aria-hidden="true" />
              <p>{t('planning.noEventsDay')}</p>
            </div>
          ) : (
            <div className="day-panel-list">
              {selectedDayOTs.map(ot => (
                <div
                  key={ot.id}
                  className="planning-ot-card"
                  data-type={ot.type}
                  onClick={() => navigate(`/interventions/${ot.id}`)}
                >
                  <div className="planning-ot-top">
                    <p className="planning-ot-titre">{ot.titre}</p>
                    <span className={`planning-chip ${STATUT_CHIP[ot.statut] || ''}`}>
                      {t(`interventions.statuts.${ot.statut}`)}
                    </span>
                  </div>
                  <p className="planning-ot-meta">
                    <i className="ti ti-settings" aria-hidden="true" /> {ot.equipement_nom}
                    {' · '}
                    <i className="ti ti-building" aria-hidden="true" /> {ot.batiment_nom}
                  </p>
                  {ot.technicien_nom ? (
                    <p className="planning-ot-tech">
                      <i className="ti ti-user" aria-hidden="true" />
                      {ot.technicien_prenom} {ot.technicien_nom}
                    </p>
                  ) : (
                    <p className="planning-ot-tech planning-ot-unassigned">
                      <i className="ti ti-user-off" aria-hidden="true" /> {t('planning.unassigned')}
                    </p>
                  )}
                  <div className="planning-ot-footer">
                    <span className={`planning-chip-type ${ot.type === 'preventif' ? 'chip-type-prev' : 'chip-type-cur'}`}>
                      {t(`interventions.types.${ot.type}`)}
                    </span>
                    {peutReplanifier(ot) && (
                      <button
                        className="btn-replanifier"
                        onClick={e => ouvrirModalReplanif(ot, e)}
                        title={t('planning.reschedule')}
                      >
                        <i className="ti ti-calendar-event" aria-hidden="true" />
                        {t('planning.reschedule')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Liste mensuelle paginée */}
      <div className="planning-month-section">
        <div className="planning-month-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0 }}>
              {t('planning.allInterventionsMonth')} — {MONTHS[viewMonth]} {viewYear}
            </h3>
            <span className="month-count">{monthOTs.length}</span>
          </div>
          {monthOTs.length > 0 && (
            <span className="plan-page-info-header">
              {Math.min((planPage - 1) * PLAN_PER_PAGE + 1, monthOTs.length)}–{Math.min(planPage * PLAN_PER_PAGE, monthOTs.length)} / {monthOTs.length}
            </span>
          )}
        </div>

        {monthOTs.length === 0 ? (
          <p className="planning-month-empty">{t('planning.noEventsMonth')}</p>
        ) : (
          <>
            <div className="planning-month-list">
              {planPaginated.map((ot, idx) => {
                const prevOt = planPaginated[idx - 1]
                const currentDay = new Date(ot.date_planifiee).getDate()
                const prevDay    = prevOt ? new Date(prevOt.date_planifiee).getDate() : null
                const isFirstOfDay = prevDay !== currentDay

                return (
                  <Fragment key={ot.id}>
                    {isFirstOfDay && (
                      <div className="plan-day-separator">
                        <span>{currentDay} {MONTHS[viewMonth]}</span>
                      </div>
                    )}
                    <div
                      className="planning-list-item"
                      data-type={ot.type}
                      onClick={() => navigate(`/interventions/${ot.id}`)}
                    >
                      <div className="planning-list-info">
                        <p className="planning-list-titre">{ot.titre}</p>
                        <p className="planning-list-meta">
                          {ot.equipement_nom} · {ot.batiment_nom}
                          {ot.technicien_nom
                            ? ` · ${ot.technicien_prenom || ''} ${ot.technicien_nom}`
                            : ` · ${t('planning.unassigned')}`}
                        </p>
                      </div>

                      <div className="planning-list-badges">
                        <span className={`planning-chip-type ${ot.type === 'preventif' ? 'chip-type-prev' : 'chip-type-cur'}`}>
                          {t(`interventions.types.${ot.type}`)}
                        </span>
                        <span className={`planning-chip ${STATUT_CHIP[ot.statut] || ''}`}>
                          {t(`interventions.statuts.${ot.statut}`)}
                        </span>
                        {peutReplanifier(ot) && (
                          <button
                            className="btn-replanifier btn-replanifier--sm"
                            onClick={e => ouvrirModalReplanif(ot, e)}
                            title={t('planning.reschedule')}
                          >
                            <i className="ti ti-calendar-event" aria-hidden="true" />
                            {t('planning.reschedule')}
                          </button>
                        )}
                      </div>
                    </div>
                  </Fragment>
                )
              })}
            </div>

            {planTotalPages > 1 && (
              <div className="plan-pagination">
                <button
                  className="plan-page-btn"
                  onClick={() => setPlanPage(p => p - 1)}
                  disabled={planPage === 1}
                >
                  <i className="ti ti-chevron-left" />
                </button>

                {Array.from({ length: planTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === planTotalPages || Math.abs(p - planPage) <= 1)
                  .map((p, i, arr) => (
                    <Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="plan-page-ellipsis">…</span>
                      )}
                      <button
                        className={`plan-page-btn${p === planPage ? ' active' : ''}`}
                        onClick={() => setPlanPage(p)}
                      >
                        {p}
                      </button>
                    </Fragment>
                  ))
                }

                <button
                  className="plan-page-btn"
                  onClick={() => setPlanPage(p => p + 1)}
                  disabled={planPage === planTotalPages}
                >
                  <i className="ti ti-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de replanification */}
      {otReplanifier && (
        <div className="modal-overlay" onClick={fermerModalReplanif}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2>{t('planning.rescheduleTitle')}</h2>
              <button className="modal-close-btn" onClick={fermerModalReplanif} aria-label={t('common.close')}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="modal-body">
              <div className="replanif-info">
                <p className="replanif-titre">{otReplanifier.titre}</p>
                <p className="replanif-meta">
                  <i className="ti ti-settings" aria-hidden="true" /> {otReplanifier.equipement_nom}
                  {' · '}
                  <i className="ti ti-building" aria-hidden="true" /> {otReplanifier.batiment_nom}
                </p>
                {otReplanifier.date_planifiee && (
                  <p className="replanif-date-actuelle">
                    {t('planning.currentDate')} :{' '}
                    <strong>
                      {new Date(otReplanifier.date_planifiee).toLocaleDateString()}
                    </strong>
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="replanif-date">
                  {t('planning.newDate')}{' '}
                  <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="replanif-date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={nouvelleDate}
                  onChange={e => setNouvelleDate(e.target.value)}
                />
              </div>

              {erreurReplanif && (
                <p className="erreur">{erreurReplanif}</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={fermerModalReplanif}>
                {t('common.cancel')}
              </button>
              <button
                className="btn-primary"
                onClick={handleReplanifier}
                disabled={submittingReplanif}
              >
                {submittingReplanif ? t('common.saving') : t('common.confirm')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
