import { useState } from 'react'
import { getUser, getToken, clearSession } from '../store/auth.store'
import { logout as logoutApi } from '../api/auth.api'

export function useAuth() {
  const [user, setUser] = useState(getUser())
  const [token, setToken] = useState(getToken())

  const isAuthenticated = !!token
  const isAdmin = user?.role === 'admin'
  const isTechnicien = user?.role === 'technicien'
  const isClient = user?.role === 'client'

  const logout = async () => {
    await logoutApi()
    clearSession()
    setUser(null)
    setToken(null)
    window.location.href = '/login'
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isTechnicien,
    isClient,
    logout
  }
}