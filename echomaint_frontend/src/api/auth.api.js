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