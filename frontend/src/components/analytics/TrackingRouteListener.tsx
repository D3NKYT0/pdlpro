import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../../lib/tracking'

/**
 * Componente invisível montado dentro do BrowserRouter para disparar
 * page views automáticos a cada navegação de rota na SPA.
 */
export function TrackingRouteListener() {
  const location = useLocation()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    const fullPath = location.pathname + location.search
    if (lastPath.current === fullPath) return
    lastPath.current = fullPath

    trackPageView(fullPath, typeof document !== 'undefined' ? document.title : undefined)
  }, [location.pathname, location.search])

  return null
}
