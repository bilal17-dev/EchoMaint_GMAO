import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import immeuble from '../assets/immeuble.png'
import logo from '../assets/logo.png'
import './Login.css'
import './ForgotPassword.css'

export default function ForgotPassword() {
  const { t, i18n } = useTranslation()
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const changeLang = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('echomaint_langue', lng)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      // Appel API réel à brancher ici
      // await requestPasswordReset(email)
      await new Promise(r => setTimeout(r, 800))
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page" style={{ backgroundImage: `url(${immeuble})` }}>
      <div className="login-page-overlay" />

      <div className="login-card fp-card">

        {/* Partie gauche */}
        <div className="login-left" style={{ backgroundImage: `url(${immeuble})` }}>
          <div className="login-left-overlay" />
          <div className="fp-left-content">
            <div className="fp-left-icon">
              <i className="ti ti-lock-open" />
            </div>
            <h2 className="fp-left-title">Réinitialisation<br />du mot de passe</h2>
            <p className="fp-left-text">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe en toute sécurité.
            </p>
          </div>
        </div>

        {/* Partie droite */}
        <div className="login-right">

          <div className="login-logo">
            <img src={logo} alt="EchoMaint" className="logo-img" />
          </div>

          {!sent ? (
            <>
              <h1 className="login-title">Mot de passe oublié ?</h1>
              <p className="login-subtitle">
                Pas d'inquiétude. Saisissez votre email et nous vous enverrons un lien de réinitialisation.
              </p>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label>Adresse email</label>
                  <div className="input-wrapper">
                    <i className="ti ti-mail input-icon" aria-hidden="true" />
                    <input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && <p className="login-error">{error}</p>}

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading
                    ? <><i className="ti ti-loader-2 login-btn-spinner" /> Envoi en cours…</>
                    : <><i className="ti ti-send" /> Envoyer le lien</>
                  }
                </button>
              </form>

              <div className="form-options" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
                <div className="login-lang-inline">
                  <i className="ti ti-world" />
                  <button
                    type="button"
                    className={`login-lang-btn ${i18n.language?.startsWith('fr') ? 'login-lang-btn--active' : ''}`}
                    onClick={() => changeLang('fr')}
                  >FR</button>
                  <span className="login-lang-sep">·</span>
                  <button
                    type="button"
                    className={`login-lang-btn ${i18n.language?.startsWith('en') ? 'login-lang-btn--active' : ''}`}
                    onClick={() => changeLang('en')}
                  >EN</button>
                </div>
                <Link to="/login" className="forgot">
                  <i className="ti ti-arrow-left" /> Retour à la connexion
                </Link>
              </div>
            </>
          ) : (
            <div className="fp-success">
              <div className="fp-success-icon">
                <i className="ti ti-mail-check" />
              </div>
              <h2 className="fp-success-title">Email envoyé !</h2>
              <p className="fp-success-text">
                Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email avec les instructions de réinitialisation dans quelques minutes.
              </p>
              <p className="fp-success-hint">Pensez à vérifier vos spams si vous ne le trouvez pas.</p>
              <Link to="/login" className="login-btn fp-back-btn">
                <i className="ti ti-arrow-left" /> Retour à la connexion
              </Link>
            </div>
          )}

          <p className="login-footer">{t('auth.footer')}</p>
        </div>

      </div>
    </div>
  )
}
