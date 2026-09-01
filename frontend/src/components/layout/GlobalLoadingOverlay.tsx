import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { themeImage } from '../../theme/assets'

type LoaderPhase = 'visible' | 'leaving' | 'hidden'

const delay = (duration: number) => new Promise<void>((resolve) => window.setTimeout(resolve, duration))

function nextFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}

function waitForStylesheets() {
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[data-pdl-theme], link[data-pdl-panel-theme]'),
  )

  return Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          if (link.sheet) {
            resolve()
            return
          }

          const finish = () => resolve()
          link.addEventListener('load', finish, { once: true })
          link.addEventListener('error', finish, { once: true })
        }),
    ),
  ).then(() => undefined)
}

function waitForImages() {
  const images = Array.from(document.images).filter((image) => image.getClientRects().length > 0)

  return Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve()
            return
          }

          const finish = () => resolve()
          image.addEventListener('load', finish, { once: true })
          image.addEventListener('error', finish, { once: true })
        }),
    ),
  ).then(() => undefined)
}

async function waitForVisualAssets() {
  await nextFrame()
  await nextFrame()

  const fontsReady = document.fonts?.ready?.then(() => undefined) ?? Promise.resolve()
  await Promise.race([Promise.all([fontsReady, waitForStylesheets()]), delay(2200)])

  await nextFrame()
  await Promise.race([waitForImages(), delay(1800)])
}

export function GlobalLoadingOverlay() {
  const { pathname, search } = useLocation()
  const { loading: authLoading } = useAuth()
  const fetching = useIsFetching()
  const routeKey = `${pathname}${search}`
  const [phase, setPhase] = useState<LoaderPhase>('visible')
  const [forceReady, setForceReady] = useState(false)
  const phaseRef = useRef<LoaderPhase>('visible')
  const hasCompletedFirstLoad = useRef(false)

  useLayoutEffect(() => {
    document.getElementById('app-bootstrap-loader')?.remove()
  }, [])

  useLayoutEffect(() => {
    phaseRef.current = 'visible'
    setPhase('visible')
    setForceReady(false)
    document.body.classList.add('global-loading')

    const safetyTimer = window.setTimeout(() => setForceReady(true), 4500)
    return () => window.clearTimeout(safetyTimer)
  }, [routeKey])

  useEffect(() => {
    if (phaseRef.current !== 'visible') return
    if ((authLoading || fetching > 0) && !forceReady) return

    let cancelled = false
    const startedAt = performance.now()
    const minimumDuration = hasCompletedFirstLoad.current ? 260 : 650

    void waitForVisualAssets().then(async () => {
      const remainingDuration = minimumDuration - (performance.now() - startedAt)
      if (remainingDuration > 0) await delay(remainingDuration)
      if (cancelled || phaseRef.current !== 'visible') return

      phaseRef.current = 'leaving'
      setPhase('leaving')
    })

    return () => {
      cancelled = true
    }
  }, [authLoading, fetching, forceReady, routeKey])

  useEffect(() => {
    if (phase !== 'leaving') return

    const exitTimer = window.setTimeout(() => {
      phaseRef.current = 'hidden'
      setPhase('hidden')
      hasCompletedFirstLoad.current = true
      document.body.classList.remove('global-loading')
    }, 420)

    return () => window.clearTimeout(exitTimer)
  }, [phase])

  useEffect(
    () => () => {
      document.body.classList.remove('global-loading')
    },
    [],
  )

  return (
    <div
      className={`global-loader global-loader--${phase}`}
      role="status"
      aria-live="polite"
      aria-label="Carregando a página"
      aria-hidden={phase === 'hidden'}
    >
      <div className="global-loader__glow" aria-hidden="true" />
      <div className="global-loader__content">
        <div className="global-loader__crest">
          <img src={themeImage('logo-circle.png')} alt="" />
        </div>
        <img className="global-loader__wordmark" src={themeImage('logo.png')} alt="PDL PRO" />
        <span>Preparando sua jornada</span>
        <div className="global-loader__progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  )
}
