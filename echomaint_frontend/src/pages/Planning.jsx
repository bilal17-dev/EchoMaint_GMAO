import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getUser } from '../store/auth.store'
import './Planning.css'

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

// Mocks — à remplacer par GET /planning?...
const mockPlanningOTs = [
  { id: 'ot1', titre: 'Révision filtre climatiseur', type: 'preventif', statut: 'terminee', priorite: 'basse', date_planifiee: '2026-06-01', equipement: { nom: 'Climatiseur Hall A' }, batiment: { id: '1', nom: 'Siège Social DGS Africa' }, technicien: { id: 't1', prenom: 'Modou', nom: 'Diop' } },
  { id: 'ot2', titre: 'Panne démarrage groupe', type: 'curatif', statut: 'en_cours', priorite: 'haute', date_planifiee: '2026-06-15', equipement: { nom: 'Groupe Électrogène' }, batiment: { id: '1', nom: 'Siège Social DGS Africa' }, technicien: { id: 't2', prenom: 'Awa', nom: 'Ndiaye' } },
  { id: 'ot3', titre: 'Contrôle ascenseur', type: 'preventif', statut: 'assignee', priorite: 'moyenne', date_planifiee: '2026-06-20', equipement: { nom: 'Ascenseur Tour A' }, batiment: { id: '2', nom: 'Tour Almadies' }, technicien: { id: 't1', prenom: 'Modou', nom: 'Diop' } },
  { id: 'ot4', titre: 'Fuite pompe à eau', type: 'curatif', statut: 'a_planifier', priorite: 'haute', date_planifiee: '2026-06-22', equipement: { nom: 'Pompe à Eau' }, batiment: { id: '3', nom: 'Entrepôt Mbao' }, technicien: null },
  { id: 'ot5', titre: 'Maintenance onduleur', type: 'preventif', statut: 'terminee', priorite: 'basse', date_planifiee: '2026-06-10', equipement: { nom: 'Onduleur' }, batiment: { id: '4', nom: 'Immeuble Plateau' }, technicien: { id: 't1', prenom: 'Modou', nom: 'Diop' } },
  { id: 'ot6', titre: 'Vérification compresseur', type: 'preventif', statut: 'planifiee', priorite: 'moyenne', date_planifiee: '2026-07-05', equipement: { nom: 'Compresseur' }, batiment: { id: '3', nom: 'Entrepôt Mbao' }, technicien: { id: 't2', prenom: 'Awa', nom: 'Ndiaye' } },
  { id: 'ot7', titre: 'Révision groupe électrogène', type: 'preventif', statut: 'planifiee', priorite: 'haute', date_planifiee: '2026-07-12', equipement: { nom: 'Groupe Électrogène' }, batiment: { id: '1', nom: 'Siège Social DGS Africa' }, technicien: { id: 't1', prenom: 'Modou', nom: 'Diop' } },
  { id: 'ot8', titre: 'Inspection pompe secondaire', type: 'preventif', statut: 'planifiee', priorite: 'basse', date_planifiee: '2026-06-20', equipement: { nom: 'Pompe Secondaire' }, batiment: { id: '2', nom: 'Tour Almadies' }, technicien: { id: 't2', prenom: 'Awa', nom: 'Ndiaye' } },
]

const STATUT_CHIP = {
  a_planifier: 'chip-a-planifier',
  planifiee:   'chip-planifiee',
  assignee:    'chip-assignee',
  en_cours:    'chip-en-cours',
  terminee:    'chip-terminee',
  annulee:     'chip-annulee',
}

const STATUT_LABELS = {
  a_planifier: 'À planifier',
  planifiee: 'Planifiée',
  assignee: 'Assignée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
}

const TYPE_LABELS = { preventif: 'Préventif', curatif: 'Curatif' }

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}
// eslint-disable-next-line no-unused-vars
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Planning() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = getUser()

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [filterBatiment, setFilterBatiment] = useState('')
  const [filterTechnicien, setFilterTechnicien] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

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

  // RG-PLAN-01 : technicien voit uniquement ses OT
  const filteredOTs = useMemo(() => {
    return mockPlanningOTs.filter(ot => {
      if (user?.role === 'technicien' && ot.technicien?.id !== user?.id) return false
      if (filterBatiment && ot.batiment?.id !== filterBatiment) return false
      if (filterTechnicien && ot.technicien?.id !== filterTechnicien) return false
      if (filterStatut && ot.statut !== filterStatut) return false
      return true
    })
  }, [filterBatiment, filterTechnicien, filterStatut, user])

  const otsByDay = useMemo(() => {
    const map = {}
    filteredOTs.forEach(ot => {
      const d = new Date(ot.date_planifiee)
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(ot)
      }
    })
    return map
  }, [filteredOTs, viewYear, viewMonth])

  const selectedDayOTs = otsByDay[selectedDay] || []

  const monthOTs = useMemo(() => filteredOTs
    .filter(ot => {
      const d = new Date(ot.date_planifiee)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth
    })
    .sort((a, b) => new Date(a.date_planifiee) - new Date(b.date_planifiee))
  , [filteredOTs, viewYear, viewMonth])

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
          {mockBatiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </select>

        {user?.role === 'admin' && (
          <select value={filterTechnicien} onChange={e => setFilterTechnicien(e.target.value)}>
            <option value="">Tous les techniciens</option>
            {mockTechniciens.map(tech => <option key={tech.id} value={tech.id}>{tech.nom}</option>)}
          </select>
        )}

        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

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
            <span className="legend-item">
              <span className="cal-dot dot-preventif" /> Préventif
            </span>
            <span className="legend-item">
              <span className="cal-dot dot-curatif" /> Curatif
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
              <p>{t('planning.noEvents')}</p>
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
                    <i className="ti ti-settings" aria-hidden="true" /> {ot.equipement?.nom}
                    {' · '}
                    <i className="ti ti-building" aria-hidden="true" /> {ot.batiment?.nom}
                  </p>
                  {ot.technicien ? (
                    <p className="planning-ot-tech">
                      <i className="ti ti-user" aria-hidden="true" />
                      {ot.technicien.prenom} {ot.technicien.nom}
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
          <p className="planning-month-empty">{t('planning.noEvents')}</p>
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
                    {ot.equipement?.nom} · {ot.batiment?.nom}
                    {ot.technicien ? ` · ${ot.technicien.prenom} ${ot.technicien.nom}` : ' · Non assigné'}
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