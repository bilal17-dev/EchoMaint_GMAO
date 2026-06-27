import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import immeuble from '../assets/immeuble.png'
import logo from '../assets/logo.png'
import { login } from '../api/auth.api'
import { saveSession } from '../store/auth.store'
import './Login.css'

const SLIDE_ICONS = ['ti-settings', 'ti-calendar', 'ti-users', 'ti-chart-bar']

export default function Login() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    { title: t('auth.slides.0.title'), text: t('auth.slides.0.text') },
    { title: t('auth.slides.1.title'), text: t('auth.slides.1.text') },
    { title: t('auth.slides.2.title'), text: t('auth.slides.2.text') },
    { title: t('auth.slides.3.title'), text: t('auth.slides.3.text') },
  ]

  const changeLang = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('echomaint_langue', lng)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await login(email, password)
      saveSession(data)
      navigate('/dashboard')
    } catch (err) {
      // 401 = identifiants incorrects, sinon erreur serveur générique
      if (err.response?.status === 401) {
        setError(t('auth.invalidCredentials'))
      } else {
        setError(t('auth.serverError'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="login-page"
      style={{ backgroundImage: `url(${immeuble})` }}
    >
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
                <p className="carousel-title">{slides[currentSlide].title}</p>
              </div>
              <p className="carousel-text">{slides[currentSlide].text}</p>
            </div>

            <div className="carousel-dots">
              {slides.map((_, i) => (
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

          <h1 className="login-title">{t('auth.welcome')}</h1>
          <p className="login-subtitle">{t('auth.subtitle')}</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>{t('auth.email')}</label>
              <div className="input-wrapper">
                <i className="ti ti-mail input-icon" aria-hidden="true" />
                <input
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('auth.password')}</label>
              <div className="input-wrapper">
                <i className="ti ti-lock input-icon" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i
                    className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            {/* Options — langue + Mot de passe oublié */}
            <div className="form-options">
              <button
                type="button"
                className="login-lang-toggle"
                onClick={() => changeLang(i18n.language?.startsWith('fr') ? 'en' : 'fr')}
                title={i18n.language?.startsWith('fr') ? 'Switch to English' : 'Passer en français'}
              >
                <i className="ti ti-world" aria-hidden="true" />
                <span className="login-lang-flag">
                  {i18n.language?.startsWith('fr') ? '🇫🇷' : '🇬🇧'}
                </span>
                <span className="login-lang-code">
                  {i18n.language?.startsWith('fr') ? 'FR' : 'EN'}
                </span>
              </button>

              <Link to="/forgot-password" className="forgot">{t('auth.forgotPassword')}</Link>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#DC2626',
                fontSize: '13px',
                marginBottom: '12px'
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading
                ? <><i className="ti ti-loader-2 login-btn-spinner" /> {t('auth.loggingIn')}</>
                : t('auth.login')
              }
            </button>
          </form>

          <p className="login-footer">{t('auth.footer')}</p>
        </div>

      </div>
    </div>
  )
}
