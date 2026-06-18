import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import immeuble from '../assets/immeuble.png'
import logo from '../assets/logo.png'
import { login } from '../api/auth.api'
import { saveSession } from '../store/auth.store'
import './Login.css'

const slides = [
  {
    title: 'Gestion centralisée des équipements',
    text: "Suivez l'état, l'historique et la localisation de tous vos équipements depuis une seule plateforme."
  },
  {
    title: 'Maintenance préventive automatisée',
    text: "Planifiez les interventions à l'avance et réduisez les risques de panne."
  },
  {
    title: 'Suivi des interventions',
    text: "Assignez les techniciens et suivez l'avancement des opérations en temps réel."
  },
  {
    title: 'Tableaux de bord et statistiques',
    text: "Analysez les performances de maintenance grâce à des indicateurs clairs."
  }
]

const slideIcons = ['ti-settings', 'ti-calendar', 'ti-users', 'ti-chart-bar']

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. On tente l'appel API
      const data = await login(email, password)
      
      // 2. Si ça réussit, on enregistre la session et on redirige
      saveSession(data)
      navigate('/dashboard')
    } catch (err) {
      console.error("Erreur d'authentification :", err)
      
      // 3. On extrait la clé '.error' renvoyée par le AuthController.js de ton groupe
      const messageServeur = err.response?.data?.error 
        || err.response?.data?.message 
        || "Impossible de se connecter au serveur.";
        
      setError(messageServeur)
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
                  className={`ti ${slideIcons[currentSlide]}`}
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

          <h1 className="login-title">Bienvenue !</h1>
          <p className="login-subtitle">
            Connectez-vous pour accéder à votre espace de gestion.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <div className="input-wrapper">
                <i className="ti ti-mail input-icon" aria-hidden="true" />
                <input
                  type="email"
                  placeholder="Entrez votre email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mot de passe</label>
              <div className="input-wrapper">
                <i className="ti ti-lock input-icon" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

            <div className="form-options">
              <label className="remember">
                <input type="checkbox" />
                Se souvenir de moi
              </label>
              <a href="#" className="forgot">Mot de passe oublié ?</a>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="login-footer">© 2026 EchoMaint. Tous droits réservés.</p>
        </div>

      </div>
    </div>
  )
}