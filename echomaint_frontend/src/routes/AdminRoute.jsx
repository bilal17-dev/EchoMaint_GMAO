import { Navigate, Outlet } from 'react-router-dom'
import { getUser } from '../store/auth.store'

export default function AdminRoute() {
  const user = getUser()

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}