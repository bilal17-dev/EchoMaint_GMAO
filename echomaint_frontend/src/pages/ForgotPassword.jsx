import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import immeuble from '../assets/immeuble.png'
import logo from '../assets/logo.png'
import { forgotPassword } from '../api/auth.api'
import './Login.css'
import './ForgotPassword.css'

const SLIDE_ICONS = ['ti-settings', 'ti-calendar', 'ti-users', 'ti-chart-bar']

export default function ForgotPassword() {
  const { t, i18n } = useTranslation()
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      setError(t('auth.serverError'))
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

        {/* Partie gauche — même carousel que Login */}
        <div className="login-left" style={{ backgroundImage: `url(${immeuble})` }}>
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

          {!sent ? (
            <>
              <h1 className="login-title">{t('auth.forgotTitle')}</h1>
              <p className="login-subtitle">{t('auth.forgotSubtitle')}</p>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label>{t('auth.forgotEmailLabel')}</label>
                  <div className="input-wrapper">
                    <i className="ti ti-mail input-icon" aria-hidden="true" />
                    <input
                      type="email"
                      placeholder={t('auth.forgotEmailPlaceholder')}
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      required
                    />
                  </div>
                </div>

                {/* Options — même layout que Login */}
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

                  <Link to="/login" className="forgot">
                    <i className="ti ti-arrow-left" /> {t('auth.forgotBackToLogin')}
                  </Link>
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
                    ? <><i className="ti ti-loader-2 login-btn-spinner" /> {t('auth.forgotSending')}</>
                    : <><i className="ti ti-send" /> {t('auth.forgotSendLink')}</>
                  }
                </button>
              </form>
            </>
          ) : (
            <div className="fp-success">
              <div className="fp-success-icon">
                <i className="ti ti-mail-check" />
              </div>
              <h2 className="fp-success-title">{t('auth.forgotEmailSentTitle')}</h2>
              <p className="fp-success-text">
                {t('auth.forgotEmailSentText', { email })}
              </p>
              <p className="fp-success-hint">{t('auth.forgotCheckSpam')}</p>
              <Link to="/login" className="login-btn fp-back-btn">
                <i className="ti ti-arrow-left" /> {t('auth.forgotBackToLogin')}
              </Link>
            </div>
          )}

          <p className="login-footer">{t('auth.footer')}</p>
        </div>

      </div>
    </div>
  )
}
