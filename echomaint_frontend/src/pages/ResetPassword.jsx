import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import immeuble from '../assets/immeuble.png'
import logo from '../assets/logo.png'
import { resetPassword } from '../api/auth.api'
import './Login.css'

const SLIDE_ICONS = ['ti-shield-lock', 'ti-eye-off', 'ti-refresh']

const SLIDES = [
  {
    title: 'Sécurisez votre compte',
    text: 'Utilisez un mot de passe unique et difficile à deviner pour protéger vos données EchoMaint.',
  },
  {
    title: 'Gardez-le confidentiel',
    text: 'Ne partagez jamais votre mot de passe, même avec un collègue ou un administrateur.',
  },
  {
    title: 'Mise à jour régulière',
    text: 'Changez votre mot de passe régulièrement pour maintenir un haut niveau de sécurité.',
  },
]

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [motDePasse,       setMotDePasse]       = useState('')
  const [confirmation,     setConfirmation]     = useState('')
  const [showMotDePasse,   setShowMotDePasse]   = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [success,          setSuccess]          = useState(false)
  const [currentSlide,     setCurrentSlide]     = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (motDePasse.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (motDePasse !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    if (!token) {
      setError('Lien invalide. Veuillez refaire une demande de réinitialisation.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, motDePasse)
      setSuccess(true)
      setTimeout(() => navigate('/'), 3000)
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data?.message || 'Lien expiré ou invalide.')
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div
        className="login-page-bg"
        style={{ backgroundImage: `url(${immeuble})` }}
      />
      <div className="login-page-overlay" />

      <div className="login-card">

        {/* Partie gauche */}
        <div
          className="login-left"
          style={{ backgroundImage: `url(${immeuble})` }}
        >
          <div className="login-left-overlay" />

          <div className="carousel">
            <div className="carousel-card">
              <div className="carousel-header">
                <i
                  className={`ti ${SLIDE_ICONS[currentSlide]}`}
                  style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)' }}
                  aria-hidden="true"
                />
                <p className="carousel-title">{SLIDES[currentSlide].title}</p>
              </div>
              <p className="carousel-text">{SLIDES[currentSlide].text}</p>
            </div>

            <div className="carousel-dots">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  className={`dot ${i === currentSlide ? 'dot-active' : ''}`}
                  onClick={() => setCurrentSlide(i)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Partie droite */}
        <div className="login-right">

          <div className="login-logo">
            <img src={logo} alt="EchoMaint" className="logo-img" />
          </div>

          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <i className="ti ti-circle-check" style={{ fontSize: 32, color: '#fff' }} />
              </div>
              <h2 className="login-title" style={{ marginBottom: 8 }}>Mot de passe modifié !</h2>
              <p className="login-subtitle">
                Votre mot de passe a été mis à jour avec succès.
                Vous allez être redirigé automatiquement…
              </p>
              <Link to="/" className="login-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, textDecoration: 'none' }}>
                <i className="ti ti-arrow-left" /> Aller à l'accueil
              </Link>
            </div>
          ) : (
            <>
              <h1 className="login-title">Nouveau mot de passe</h1>
              <p className="login-subtitle">Saisissez et confirmez votre nouveau mot de passe.</p>

              {!token && (
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: '8px', padding: '10px 14px',
                  color: '#DC2626', fontSize: '13px', marginBottom: '16px',
                }}>
                  Lien invalide. Veuillez refaire une demande depuis{' '}
                  <Link to="/forgot-password" style={{ color: '#DC2626', fontWeight: 600 }}>
                    Mot de passe oublié
                  </Link>.
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form">

                <div className="form-group">
                  <label>Nouveau mot de passe</label>
                  <div className="input-wrapper">
                    <i className="ti ti-lock input-icon" aria-hidden="true" />
                    <input
                      type={showMotDePasse ? 'text' : 'password'}
                      placeholder="Min. 6 caractères"
                      value={motDePasse}
                      onChange={e => { setMotDePasse(e.target.value); setError('') }}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowMotDePasse(v => !v)}
                    >
                      <i className={`ti ${showMotDePasse ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirmer le mot de passe</label>
                  <div className="input-wrapper">
                    <i className="ti ti-lock-check input-icon" aria-hidden="true" />
                    <input
                      type={showConfirmation ? 'text' : 'password'}
                      placeholder="Répétez votre mot de passe"
                      value={confirmation}
                      onChange={e => { setConfirmation(e.target.value); setError('') }}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmation(v => !v)}
                    >
                      <i className={`ti ${showConfirmation ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: '8px', padding: '10px 14px',
                    color: '#DC2626', fontSize: '13px', marginBottom: '12px',
                  }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="login-btn" disabled={loading || !token}>
                  {loading
                    ? <><i className="ti ti-loader-2 login-btn-spinner" /> Mise à jour…</>
                    : <><i className="ti ti-check" /> Enregistrer le mot de passe</>
                  }
                </button>
              </form>

              <div className="form-options" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Link to="/login" className="forgot">
                  <i className="ti ti-arrow-left" /> Retour à la connexion
                </Link>
              </div>
            </>
          )}

          <p className="login-footer">© 2026 EchoMaint GMAO</p>
        </div>

      </div>
    </div>
  )
}
