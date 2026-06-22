import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Planning.css'

// On remplace mockPlanningOTs, mockBatiments et mockTechniciens
// par les vraies fonctions connectées au backend
import { getPlanning } from '../api/planning.api'
import { getBatiments } from '../api/batiments.api'
import { getTechniciens } from '../api/utilisateurs.api'

const STATUT_CHIP = {
  planifiee: 'chip-planifiee',
  assignee:  'chip-assignee',
  en_cours:  'chip-en-cours',
  terminee:  'chip-terminee',
  annulee:   'chip-annulee',
}

const STATUT_LABELS = {
  planifiee: 'Planifiée',
  assignee:  'Assignée',
  en_cours:  'En cours',
  terminee:  'Terminée',
  annulee:   'Annulée',
}

const TYPE_LABELS = { preventif: 'Préventif', curatif: 'Curatif' }

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

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
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())

  // Filtres
  const [filterBatiment, setFilterBatiment] = useState('')
  const [filterTechnicien, setFilterTechnicien] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  // Données chargées depuis le backend
  const [planningOTs, setPlanningOTs] = useState([])
  const [batiments, setBatiments] = useState([])
  const [techniciens, setTechniciens] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  // ─── Chargement des bâtiments et techniciens (une seule fois) ────────────
  useEffect(() => {
    Promise.all([getBatiments(), getTechniciens()])
      .then(([resBat, resTech]) => {
        setBatiments(resBat.data)
        setTechniciens(resTech.data)
      })
      .catch(err => console.error('Erreur chargement filtres:', err))
  }, [])

  // ─── Chargement du planning à chaque changement de mois ou de filtre ─────
  // Le backend reçoit la période via date_debut et date_fin
  useEffect(() => {
    chargerPlanning()
  }, [viewYear, viewMonth, filterBatiment, filterTechnicien, filterStatut])

  const chargerPlanning = async () => {
    setLoading(true)
    setErreur('')
    try {
      // On construit la période du mois affiché (du 1er au dernier jour)
      const dateDebut = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
      const dateFin = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${getDaysInMonth(viewYear, viewMonth)}`

      const params = { date_debut: dateDebut, date_fin: dateFin }
      if (filterBatiment) params.batiment_id = filterBatiment
      if (filterTechnicien) params.technicien_id = filterTechnicien
      if (filterStatut) params.statut = filterStatut

      const res = await getPlanning(params)
      setPlanningOTs(res.data)
    } catch (error) {
      console.error('Erreur de chargement du planning:', error)
      setErreur('Impossible de charger le planning.')
    } finally {
      setLoading(false)
    }
  }

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

  // Groupe les OT par jour pour colorier le calendrier
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

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const isToday = (day) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()

  return (
    <div className="planning">

      {/* Filtres */}
      <div className="planning-filters">
        <select value={filterBatiment} onChange={e => setFilterBatiment(e.target.value)}>
          <option value="">Tous les bâtiments</option>
          {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </select>

        {/* Le filtre technicien n'est visible que pour les admins
            RG-PLAN-01 : un technicien ne voit que ses propres OT (géré côté backend) */}
        {user?.role === 'admin' && (
          <select value={filterTechnicien} onChange={e => setFilterTechnicien(e.target.value)}>
            <option value="">Tous les techniciens</option>
            {techniciens.map(tech => <option key={tech.id} value={tech.id}>{tech.prenom} {tech.nom}</option>)}
          </select>
        )}

        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Affichage pendant le chargement */}
      {loading && (
        <p style={{ textAlign: 'center', padding: '1rem', color: '#64748B', fontSize: '13px' }}>
          Chargement du planning...
        </p>
      )}

      {erreur && (
        <p style={{ textAlign: 'center', padding: '1rem', color: '#ef4444', fontSize: '13px' }}>
          {erreur}
        </p>
      )}

      {/* Layout principal : calendrier + panel jour */}
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
                    <div className="cal-day-dots">
                      {dayOTs.slice(0, 3).map(ot => (
                        <span
                          key={ot.id}
                          className={`cal-dot ${ot.type === 'preventif' ? 'dot-preventif' : 'dot-curatif'}`}
                        />
                      ))}
                      {dayOTs.length > 3 && (
                        <span className="cal-dot-more">+{dayOTs.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="calendar-legend">
            <span className="legend-item"><span className="cal-dot dot-preventif" /> Préventif</span>
            <span className="legend-item"><span className="cal-dot dot-curatif" /> Curatif</span>
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
              <p>Aucune intervention ce jour</p>
            </div>
          ) : (
            <div className="day-panel-list">
              {selectedDayOTs.map(ot => (
                <div
                  key={ot.id}
                  className="planning-ot-card"
                  onClick={() => navigate(`/interventions/${ot.id}`)}
                >
                  <div className="planning-ot-top">
                    <p className="planning-ot-titre">{ot.titre}</p>
                    <span className={`planning-chip ${STATUT_CHIP[ot.statut] || ''}`}>
                      {STATUT_LABELS[ot.statut]}
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
                      <i className="ti ti-user-off" aria-hidden="true" /> Non assigné
                    </p>
                  )}
                  <span className={`planning-chip-type ${ot.type === 'preventif' ? 'chip-type-prev' : 'chip-type-cur'}`}>
                    {TYPE_LABELS[ot.type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Liste complète du mois */}
      <div className="planning-month-section">
        <h3>
          Toutes les interventions — {MONTHS[viewMonth]} {viewYear}
          <span className="month-count">{monthOTs.length}</span>
        </h3>

        {monthOTs.length === 0 ? (
          <p className="planning-month-empty">Aucune intervention ce mois-ci.</p>
        ) : (
          <div className="planning-month-list">
            {monthOTs.map(ot => (
              <div
                key={ot.id}
                className="planning-list-item"
                onClick={() => navigate(`/interventions/${ot.id}`)}
              >
                <div className="planning-list-date">
                  <span className="planning-list-day">
                    {new Date(ot.date_planifiee).getDate()}
                  </span>
                  <span className="planning-list-monthname">
                    {MONTHS[viewMonth].substring(0, 3)}
                  </span>
                </div>

                <div className="planning-list-info">
                  <p className="planning-list-titre">{ot.titre}</p>
                  <p className="planning-list-meta">
                    {ot.equipement_nom} · {ot.batiment_nom}
                    {ot.technicien_nom
                      ? ` · ${ot.technicien_prenom || ''} ${ot.technicien_nom}`
                      : ' · Non assigné'}
                  </p>
                </div>

                <div className="planning-list-badges">
                  <span className={`planning-chip-type ${ot.type === 'preventif' ? 'chip-type-prev' : 'chip-type-cur'}`}>
                    {TYPE_LABELS[ot.type]}
                  </span>
                  <span className={`planning-chip ${STATUT_CHIP[ot.statut] || ''}`}>
                    {STATUT_LABELS[ot.statut]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}