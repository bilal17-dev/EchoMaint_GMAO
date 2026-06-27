import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import immeuble from '../assets/immeuble.png'
import logo from '../assets/logo.png'
import { resetPassword } from '../api/auth.api'
import './Login.css'
import './ForgotPassword.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  // Lecture du token depuis l'URL : /reset-password?token=XXXXX
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [motDePasse,        setMotDePasse]        = useState('')
  const [confirmation,      setConfirmation]      = useState('')
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState('')
  const [success,           setSuccess]           = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation côté client
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
      // Envoie le token (depuis l'URL) et le nouveau mot de passe au backend
      await resetPassword(token, motDePasse)
      setSuccess(true)
      // Redirige vers /login après 2 secondes
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      // 400 = token expiré ou invalide
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
    <div className="login-page" style={{ backgroundImage: `url(${immeuble})` }}>
      <div className="login-page-overlay" />

      <div className="login-card fp-card">

        {/* Partie gauche */}
        <div className="login-left" style={{ backgroundImage: `url(${immeuble})` }}>
          <div className="login-left-overlay" />
          <div className="fp-left-content">
            <div className="fp-left-icon">
              <i className="ti ti-lock-check" />
            </div>
            <h2 className="fp-left-title">Nouveau<br />mot de passe</h2>
            <p className="fp-left-text">
              Choisissez un mot de passe sécurisé d'au moins 6 caractères pour protéger votre compte EchoMaint.
            </p>
          </div>
        </div>

        {/* Partie droite */}
        <div className="login-right">

          <div className="login-logo">
            <img src={logo} alt="EchoMaint" className="logo-img" />
          </div>

          {success ? (
            /* Écran de succès — redirige automatiquement vers /login */
            <div className="fp-success">
              <div className="fp-success-icon">
                <i className="ti ti-circle-check" />
              </div>
              <h2 className="fp-success-title">Mot de passe modifié !</h2>
              <p className="fp-success-text">
                Votre mot de passe a été mis à jour avec succès.
                Vous allez être redirigé vers la page de connexion…
              </p>
              <Link to="/login" className="login-btn fp-back-btn">
                <i className="ti ti-arrow-left" /> Aller à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="login-title">Nouveau mot de passe</h1>
              <p className="login-subtitle">
                Saisissez et confirmez votre nouveau mot de passe.
              </p>

              {/* Avertissement si le token est absent de l'URL */}
              {!token && (
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: '8px', padding: '10px 14px',
                  color: '#DC2626', fontSize: '13px', marginBottom: '16px'
                }}>
                  Lien invalide. Veuillez refaire une demande depuis{' '}
                  <Link to="/forgot-password" style={{ color: '#DC2626', fontWeight: 600 }}>
                    Mot de passe oublié
                  </Link>.
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form">

                {/* Champ nouveau mot de passe */}
                <div className="form-group">
                  <label>Nouveau mot de passe</label>
                  <div className="input-wrapper">
                    <i className="ti ti-lock input-icon" aria-hidden="true" />
                    <input
                      type="password"
                      placeholder="Min. 6 caractères"
                      value={motDePasse}
                      onChange={e => { setMotDePasse(e.target.value); setError('') }}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Champ confirmation */}
                <div className="form-group">
                  <label>Confirmer le mot de passe</label>
                  <div className="input-wrapper">
                    <i className="ti ti-lock-check input-icon" aria-hidden="true" />
                    <input
                      type="password"
                      placeholder="Répétez votre mot de passe"
                      value={confirmation}
                      onChange={e => { setConfirmation(e.target.value); setError('') }}
                      required
                    />
                  </div>
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div style={{
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: '8px', padding: '10px 14px',
                    color: '#DC2626', fontSize: '13px', marginBottom: '12px'
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
