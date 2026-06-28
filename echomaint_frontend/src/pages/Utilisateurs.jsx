import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './Utilisateurs.css'
import { getUtilisateurs, createUtilisateur, updateUtilisateur, updateStatutUtilisateur } from '../api/utilisateurs.api'
import { createClient, getClient, updateClient } from '../api/clients.api'
import Pagination from '../components/Pagination'

const ITEMS_PER_PAGE = 10

const ROLE_COLORS = {
  admin:      { bg: '#F5F3FF', color: '#8B5CF6' },
  technicien: { bg: '#EFF6FF', color: '#2563EB' },
  client:     { bg: '#F0FDF4', color: '#22C55E' },
}

const ROLES = ['admin', 'technicien', 'client']

const emptyForm = {
  nom: '', prenom: '', email: '', role: 'technicien', password: '',
  entreprise_nom: '', entreprise_adresse: '', entreprise_telephone: '', entreprise_email_contact: '',
}

export default function Utilisateurs() {
  const { t } = useTranslation()

  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreurChargement, setErreurChargement] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [erreurs, setErreurs] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const [page, setPage] = useState(1)

  const [userEnEdition,  setUserEnEdition]  = useState(null)
  const [editForm,       setEditForm]       = useState({
    nom: '', prenom: '', email: '', role: '', actif: true,
    entreprise_nom: '', entreprise_adresse: '', entreprise_telephone: '', entreprise_email_contact: '',
  })
  const [erreurEdit,     setErreurEdit]     = useState('')
  const [confirmerRole,  setConfirmerRole]  = useState(false)

  const chargerUtilisateurs = async () => {
    setLoading(true)
    setErreurChargement('')
    try {
      const res = await getUtilisateurs()
      setUtilisateurs(Array.isArray(res) ? res : (res?.data ?? []))
    } catch (error) {
      console.error('Erreur utilisateurs:', error)
      setErreurChargement(t('utilisateurs.loadError'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { chargerUtilisateurs() }, [])

  const filtered = utilisateurs.filter(u => {
    const matchSearch = `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole ? u.role === filterRole : true
    return matchSearch && matchRole
  })

  // Remet la pagination à la première page quand les filtres changent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, [search, filterRole])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleToggleActif = async (id, actifActuel) => {
    try {
      await updateStatutUtilisateur(id, !actifActuel)
      await chargerUtilisateurs()
    } catch (error) {
      window.alert(error.response?.data?.message || t('common.error'))
    }
  }

  const handleCreer = async () => {
    const errs = []
    if (!form.prenom)                              errs.push(t('utilisateurs.errors.firstName'))
    if (!form.nom)                                 errs.push(t('utilisateurs.errors.lastName'))
    if (!form.email)                               errs.push(t('utilisateurs.errors.email'))
    if (!form.password || form.password.length < 6) errs.push(t('utilisateurs.errors.passwordMin'))
    if (form.role === 'client' && !form.entreprise_nom) errs.push(t('utilisateurs.errors.companyName'))
    if (errs.length) { setErreurs(errs); return }

    setSubmitting(true)
    setErreurs([])

    try {
      let id_client = null

      if (form.role === 'client') {
        const resClient = await createClient({
          nom:       form.entreprise_nom,
          email_contact: form.entreprise_email_contact || null,
          adresse:   form.entreprise_adresse || null,
          telephone: form.entreprise_telephone || null,
        })
        id_client = (resClient?.data ?? resClient)?.id ?? null
      }

      const payload = {
        nom: form.nom, prenom: form.prenom, email: form.email,
        password: form.password, role: form.role, id_client,
      }

      await createUtilisateur(payload)
      setModal(null)
      setForm(emptyForm)
      await chargerUtilisateurs()
      setPage(1)
    } catch (error) {
      setErreurs([error.response?.data?.message || t('common.error')])
    } finally {
      setSubmitting(false)
    }
  }

  const ouvrirModal = () => {
    setForm(emptyForm)
    setErreurs([])
    setModal('creer')
  }

  const ouvrirModifier = async (u) => {
    setUserEnEdition(u)
    const base = { nom: u.nom, prenom: u.prenom, email: u.email, role: u.role, actif: Boolean(u.actif),
      entreprise_nom: '', entreprise_adresse: '', entreprise_telephone: '', entreprise_email_contact: '' }
    if (u.role === 'client' && u.id_client) {
      try {
        const res = await getClient(u.id_client)
        const c = res?.data ?? res
        base.entreprise_nom            = c?.nom             ?? ''
        base.entreprise_adresse        = c?.adresse         ?? ''
        base.entreprise_telephone      = c?.telephone       ?? ''
        base.entreprise_email_contact  = c?.email_contact   ?? ''
      } catch { /* client non trouvé — on laisse les champs vides */ }
    }
    setEditForm(base)
    setErreurEdit('')
    setConfirmerRole(false)
    setModal('modifier')
  }

  const fermerModifier = () => {
    setModal(null)
    setUserEnEdition(null)
    setErreurEdit('')
    setConfirmerRole(false)
  }

  const handleModifier = async () => {
    if (!editForm.nom || !editForm.prenom || !editForm.email) {
      setErreurEdit(t('utilisateurs.errors.required'))
      return
    }

    if (editForm.role !== userEnEdition.role && !confirmerRole) {
      setConfirmerRole(true)
      return
    }

    setSubmitting(true)
    setErreurEdit('')

    try {
      await updateUtilisateur(userEnEdition.id, {
        nom: editForm.nom, prenom: editForm.prenom, email: editForm.email,
        role: editForm.role, actif: editForm.actif,
      })
      if (editForm.role === 'client' && userEnEdition.id_client) {
        await updateClient(userEnEdition.id_client, {
          nom:           editForm.entreprise_nom           || undefined,
          adresse:       editForm.entreprise_adresse       || undefined,
          telephone:     editForm.entreprise_telephone     || undefined,
          email_contact: editForm.entreprise_email_contact || undefined,
        })
      }
      fermerModifier()
      await chargerUtilisateurs()
      setPage(1)
    } catch (error) {
      setErreurEdit(error.response?.data?.message || t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="utilisateurs">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>{t('utilisateurs.loading')}</p>
    </div>
  )

  if (erreurChargement) return (
    <div className="utilisateurs">
      <p style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{erreurChargement}</p>
    </div>
  )

  return (
    <div className="utilisateurs">

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('layout.utilisateurs.title')}</h1>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: '3px' }}>{t('layout.utilisateurs.subtitle')}</p>
        </div>
      </div>

      {/* Header */}
      <div className="utilisateurs-header">
        <div className="utilisateurs-filters">
          <div className="search-box">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder={t('utilisateurs.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">{t('utilisateurs.allRoles')}</option>
            {ROLES.map(r => <option key={r} value={r}>{t(`utilisateurs.roles.${r}`)}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={ouvrirModal}>
          <i className="ti ti-plus" /> {t('utilisateurs.new')}
        </button>
      </div>

      {/* Stats */}
      <div className="utilisateurs-stats">
        {ROLES.map(role => (
          <div key={role} className="stat-card">
            <div className="stat-icon" style={{ background: ROLE_COLORS[role].bg }}>
              <i
                className={`ti ${role === 'admin' ? 'ti-shield' : role === 'technicien' ? 'ti-tool' : 'ti-user'}`}
                style={{ color: ROLE_COLORS[role].color }}
              />
            </div>
            <div>
              <p className="stat-label">{t(`utilisateurs.rolesCounts.${role}s`)}</p>
              <p className="stat-value">{utilisateurs.filter(u => u.role === role).length}</p>
            </div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF2F2' }}>
            <i className="ti ti-user-off" style={{ color: '#EF4444' }} />
          </div>
          <div>
            <p className="stat-label">{t('utilisateurs.disabled')}</p>
            <p className="stat-value">{utilisateurs.filter(u => !u.actif).length}</p>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="utilisateurs-table-wrap">
        <table className="utilisateurs-table">
          <thead>
            <tr>
              <th>{t('utilisateurs.table.user')}</th>
              <th>{t('utilisateurs.table.email')}</th>
              <th>{t('utilisateurs.table.role')}</th>
              <th>{t('utilisateurs.table.statut')}</th>
              <th>{t('utilisateurs.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">{t('utilisateurs.empty')}</td></tr>
            ) : paginated.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar" style={{ background: ROLE_COLORS[u.role]?.bg, color: ROLE_COLORS[u.role]?.color }}>
                      {u.prenom?.[0]}{u.nom?.[0]}
                    </div>
                    <p className="user-nom">{u.prenom} {u.nom}</p>
                  </div>
                </td>
                <td className="user-email" data-label={t('utilisateurs.table.email')}>{u.email}</td>
                <td data-label={t('utilisateurs.table.role')}>
                  <span className="badge" style={{ background: ROLE_COLORS[u.role]?.bg, color: ROLE_COLORS[u.role]?.color }}>
                    {t(`utilisateurs.roles.${u.role}`) ?? u.role}
                  </span>
                </td>
                <td data-label={t('utilisateurs.table.statut')}>
                  <span className={`statut-badge ${u.actif ? 'actif' : 'inactif'}`}>
                    {u.actif ? t('utilisateurs.statuts.actif') : t('utilisateurs.statuts.inactif')}
                  </span>
                </td>
                <td data-label={t('utilisateurs.table.actions')}>
                  <div className="table-actions">
                    <button className="btn-toggle btn-modifier" onClick={() => ouvrirModifier(u)}>
                      <i className="ti ti-pencil" />
                      {t('utilisateurs.modify')}
                    </button>
                    <button
                      className={`btn-toggle ${u.actif ? 'btn-desactiver' : 'btn-activer'}`}
                      onClick={() => handleToggleActif(u.id, u.actif)}
                    >
                      <i className={`ti ${u.actif ? 'ti-user-off' : 'ti-user-check'}`} />
                      {u.actif ? t('utilisateurs.deactivate') : t('utilisateurs.activate')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={filtered.length} itemsPerPage={ITEMS_PER_PAGE} onChange={setPage} />

      {/* Modal création */}
      {modal === 'creer' && (
        <div className="modal-overlay" onClick={() => { setModal(null); setErreurs([]) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('utilisateurs.new')}</h2>
              <button className="modal-close-btn" onClick={() => { setModal(null); setErreurs([]) }}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-section-label">{t('utilisateurs.loginInfo')}</p>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('utilisateurs.firstName')} <span className="required">*</span></label>
                  <input type="text" placeholder="Ex: Mamadou" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>{t('utilisateurs.lastName')} <span className="required">*</span></label>
                  <input type="text" placeholder="Ex: Diallo" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input type="email" placeholder="Ex: mamadou@echomaint.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('utilisateurs.role')}</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{t(`utilisateurs.roles.${r}`)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('utilisateurs.password')} <span className="required">*</span></label>
                  <input type="password" placeholder={t('utilisateurs.passwordMin')} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>

              {form.role === 'client' && (
                <div className="modal-section-entreprise">
                  <p className="modal-section-label">
                    <i className="ti ti-building" /> {t('utilisateurs.clientCompany')}
                  </p>

                  <div className="form-group">
                    <label>{t('utilisateurs.companyName')} <span className="required">*</span></label>
                    <input type="text" placeholder="Ex: DGS Africa" value={form.entreprise_nom} onChange={e => setForm(f => ({ ...f, entreprise_nom: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>{t('utilisateurs.companyEmail')}</label>
                    <input type="email" placeholder="Ex: contact@dgsafrica.com" value={form.entreprise_email_contact} onChange={e => setForm(f => ({ ...f, entreprise_email_contact: e.target.value }))} />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('utilisateurs.phone')}</label>
                      <input type="text" placeholder="Ex: 338001234" value={form.entreprise_telephone} onChange={e => setForm(f => ({ ...f, entreprise_telephone: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>{t('utilisateurs.address')}</label>
                      <input type="text" placeholder="Ex: Route de Ngor, Dakar" value={form.entreprise_adresse} onChange={e => setForm(f => ({ ...f, entreprise_adresse: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}

              {erreurs.map((e, i) => <p key={i} className="erreur">{e}</p>)}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => { setModal(null); setErreurs([]) }}>
                {t('common.cancel')}
              </button>
              <button className="btn-primary" onClick={handleCreer} disabled={submitting}>
                {submitting ? t('utilisateurs.creating') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modification */}
      {modal === 'modifier' && userEnEdition && (
        <div className="modal-overlay" onClick={fermerModifier}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2>{t('utilisateurs.editTitle')}</h2>
              <button className="modal-close-btn" onClick={fermerModifier} aria-label={t('common.close')}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-section-label">{t('utilisateurs.sectionIdentity')}</p>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('utilisateurs.firstName')} <span className="required">*</span></label>
                  <input type="text" value={editForm.prenom} onChange={e => { setEditForm(f => ({ ...f, prenom: e.target.value })); setConfirmerRole(false) }} />
                </div>
                <div className="form-group">
                  <label>{t('utilisateurs.lastName')} <span className="required">*</span></label>
                  <input type="text" value={editForm.nom} onChange={e => { setEditForm(f => ({ ...f, nom: e.target.value })); setConfirmerRole(false) }} />
                </div>
              </div>

              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input type="email" value={editForm.email} onChange={e => { setEditForm(f => ({ ...f, email: e.target.value })); setConfirmerRole(false) }} />
              </div>

              <p className="modal-section-label" style={{ marginTop: '0.25rem' }}>{t('utilisateurs.sectionAccess')}</p>

              <div className="form-group">
                <label>{t('utilisateurs.role')}</label>
                <select value={editForm.role} onChange={e => { setEditForm(f => ({ ...f, role: e.target.value })); setConfirmerRole(false) }}>
                  {ROLES.map(r => <option key={r} value={r}>{t(`utilisateurs.roles.${r}`)}</option>)}
                </select>
              </div>

              <div className="toggle-row">
                <span className="toggle-row-label">
                  <i className="ti ti-power" style={{ marginRight: 6, color: editForm.actif ? '#22C55E' : '#94a3b8' }} />
                  {editForm.actif ? t('utilisateurs.accountActive') : t('utilisateurs.accountDisabled')}
                </span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={editForm.actif} onChange={e => setEditForm(f => ({ ...f, actif: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Section entreprise — visible si le rôle est client */}
              {editForm.role === 'client' && (
                <div className="modal-section-entreprise">
                  <p className="modal-section-label">
                    <i className="ti ti-building" /> {t('utilisateurs.clientCompany')}
                  </p>
                  <div className="form-group">
                    <label>{t('utilisateurs.companyName')} <span className="required">*</span></label>
                    <input type="text" placeholder="Ex: DGS Africa" value={editForm.entreprise_nom} onChange={e => setEditForm(f => ({ ...f, entreprise_nom: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>{t('utilisateurs.companyEmail')}</label>
                    <input type="email" placeholder="Ex: contact@dgsafrica.com" value={editForm.entreprise_email_contact} onChange={e => setEditForm(f => ({ ...f, entreprise_email_contact: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('utilisateurs.phone')}</label>
                      <input type="text" placeholder="Ex: 338001234" value={editForm.entreprise_telephone} onChange={e => setEditForm(f => ({ ...f, entreprise_telephone: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>{t('utilisateurs.address')}</label>
                      <input type="text" placeholder="Ex: Route de Ngor, Dakar" value={editForm.entreprise_adresse} onChange={e => setEditForm(f => ({ ...f, entreprise_adresse: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}

              {confirmerRole && (
                <div className="confirm-role-banner">
                  <p>
                    <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
                    {t('utilisateurs.confirmRoleChange')}{' '}
                    <strong>{userEnEdition.prenom} {userEnEdition.nom}</strong>{' '}→{' '}
                    <strong>{t(`utilisateurs.roles.${editForm.role}`)}</strong> ?
                  </p>
                  <div className="confirm-role-actions">
                    <button className="btn-confirm-role" onClick={handleModifier} disabled={submitting}>
                      {submitting ? t('utilisateurs.saving') : t('utilisateurs.confirmRole')}
                    </button>
                    <button className="btn-cancel-role" onClick={() => { setConfirmerRole(false); setEditForm(f => ({ ...f, role: userEnEdition.role })) }}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {erreurEdit && <p className="erreur">{erreurEdit}</p>}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={fermerModifier}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleModifier} disabled={submitting}>
                {submitting ? t('utilisateurs.saving') : t('common.save')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
