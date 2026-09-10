import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDefaultTheme } from '../../theme/useDefaultTheme'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'
import { PortalPublicLayout } from '../themes/PortalTheme'
import { useTheme } from '../../theme/ThemeProvider'
import { serverApi } from '../../services/api'
import { ComingSoonPage } from '../../pages/ComingSoonPage'

export function PublicLayout() {
  useDefaultTheme()
  const theme = useTheme()
  const { pathname } = useLocation()
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  const launchGate = pathname === '/' && Boolean(info.data?.coming_soon)
  const landingAlias = pathname === '/home'

  if (pathname === '/' && info.isPending) {
    return null
  }

  if (landingAlias && info.data && !info.data.coming_soon) {
    return <Navigate to="/" replace />
  }

  if (launchGate && info.data) {
    return <ComingSoonPage info={info.data} />
  }

  if (theme.presentation?.renderer === 'portal-v1') {
    return <PortalPublicLayout presentation={theme.presentation} />
  }

  return (
    <div data-theme-surface="public">
      <SiteNav />

      <div className="main-content">
        <Outlet />
      </div>

      <SiteFooter />
    </div>
  )
}

export function PublicContent() {
  return <Outlet />
}
