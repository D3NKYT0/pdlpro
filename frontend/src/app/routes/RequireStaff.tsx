import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { canAccessStaff } from '../../lib/staff'

export function RequireStaff() {
  const { t } = useTranslation('common')
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">{t('loadingSession')}</p>
  if (!canAccessStaff(user)) return <Navigate to="/panel" replace />
  return <Outlet />
}
