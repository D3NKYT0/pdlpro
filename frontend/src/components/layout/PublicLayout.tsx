import { useLocalizedPresentation } from '../../theme/useLocalizedPresentation'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDefaultTheme } from '../../theme/useDefaultTheme'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'
import { PortalPublicLayout } from '../themes/PortalTheme'
import { ClubPublicLayout } from '../themes/ClubTheme'
import { TemplateShell, isGemwright, isVesperlyn, resolveTemplateId } from '../../theme/templates'
import { useTheme } from '../../theme/ThemeProvider'
import { serverApi } from '../../services/api'
import { ComingSoonPage } from '../../pages/ComingSoonPage'
import { BannerModal } from '../public/BannerModal'

export function PublicLayout() {
  useDefaultTheme()
  const theme = useTheme()
  const presentation = useLocalizedPresentation(theme.presentation)
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

  const isLanding = pathname === '/' || pathname === '/home'
  const bannerLocation = isLanding ? 'landing' : 'all'
  const templateId = resolveTemplateId(presentation?.renderer)

  let content = (
    <div data-theme-surface="public">
      <SiteNav />

      <div className="main-content">
        <Outlet />
      </div>

      <SiteFooter />
    </div>
  )

  if (isVesperlyn(presentation?.renderer) && presentation) {
    content = <ClubPublicLayout presentation={presentation} />
  } else if (isGemwright(presentation?.renderer) && presentation) {
    content = <PortalPublicLayout presentation={presentation} />
  } else if (templateId && presentation) {
    content = <TemplateShell presentation={presentation} templateId={templateId} />
  }

  return (
    <>
      {content}
      <BannerModal location={bannerLocation} />
    </>
  )
}


export function PublicContent() {
  return <Outlet />
}
