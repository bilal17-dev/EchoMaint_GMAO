import api from './axios.config'

export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    console.warn('Logout backend échoué:', error.message)
  }
}

export async function register(data) {
  const response = await api.post('/auth/register', data)
  return response.data
}

// Envoie un email de réinitialisation de mot de passe
export async function forgotPassword(email) {
  const response = await api.post('/auth/forgot-password', { email })
  return response.data
}

// Réinitialise le mot de passe avec le token reçu par email
export async function resetPassword(token, nouveauMotDePasse) {
  const response = await api.post('/auth/reset-password', { token, nouveauMotDePasse })
  return response.data
}