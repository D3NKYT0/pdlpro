import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">Carregando sessão...</p>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
