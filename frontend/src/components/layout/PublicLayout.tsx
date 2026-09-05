import { Outlet } from 'react-router-dom'
import { useDefaultTheme } from '../../theme/useDefaultTheme'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'
import { PortalPublicLayout } from '../themes/PortalTheme'
import { useTheme } from '../../theme/ThemeProvider'

export function PublicLayout() {
  useDefaultTheme()
  const theme = useTheme()

  if (theme.presentation?.renderer === 'portal-v1') {
    return <PortalPublicLayout presentation={theme.presentation} />
  }

  return (
    <>
      <SiteNav />

      <div className="main-content">
        <Outlet />
      </div>

      <SiteFooter />
    </>
  )
}

export function PublicContent() {
  return <Outlet />
}
