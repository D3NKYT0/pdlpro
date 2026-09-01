import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('panel-preview')) return <Outlet />
  if (loading) return <p className="muted">Carregando sessão...</p>
  if (!user) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <Outlet />
}
