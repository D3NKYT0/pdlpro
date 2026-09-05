import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p className="muted">Carregando sessão...</p>
  if (!user) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  if (user.has_usable_password === false && location.pathname !== '/complete-account') {
    return <Navigate to="/complete-account" replace />
  }
  return <Outlet />
}
