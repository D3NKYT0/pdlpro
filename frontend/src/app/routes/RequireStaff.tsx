import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { canAccessStaff } from '../../lib/staff'

export function RequireStaff() {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">Carregando sessão...</p>
  if (!canAccessStaff(user)) return <Navigate to="/painel" replace />
  return <Outlet />
}
