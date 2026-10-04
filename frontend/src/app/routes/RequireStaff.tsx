import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { canAccessAdminPath } from '../../lib/staff'

export function RequireStaff() {
  const { t } = useTranslation('common')
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  if (loading) return <p className="muted">{t('loadingSession')}</p>
  if (!canAccessAdminPath(user, pathname)) return <Navigate to="/panel" replace />
  return <Outlet />
}
