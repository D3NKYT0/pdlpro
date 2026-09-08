import { useEffect, useMemo, useRef, useState } from 'react'
import { ButtonLink } from '../components/ui/Button'
import type { ApiServerInfo } from '../services/types'
import { themeImage } from '../theme/assets'
import './coming-soon.css'

type CountdownValue = { days: string; hours: string; mins: string; secs: string; finished: boolean }

function countdownValue(target: string | null | undefined): CountdownValue {
  if (!target) {
    return { days: '--', hours: '--', mins: '--', secs: '--', finished: false }
  }
  const remaining = Math.max(0, Date.parse(target) - Date.now())
  const total = Math.floor(remaining / 1000)
  const pad = (value: number) => String(Math.max(0, value)).padStart(2, '0')
  return {
    days: pad(Math.floor(total / 86400)),
    hours: pad(Math.floor((total % 86400) / 3600)),
    mins: pad(Math.floor((total % 3600) / 60)),
    secs: pad(total % 60),
    finished: remaining <= 0,
  }
}

function useLaunchCountdown(target: string | null | undefined) {
  const [value, setValue] = useState(() => countdownValue(target))
  useEffect(() => {
    setValue(countdownValue(target))
    if (!target) return undefined
    const timer = window.setInterval(() => setValue(countdownValue(target)), 1000)
    return () => window.clearInterval(timer)
  }, [target])
  return value
}

function useSecondTick(secs: string) {
  const previous = useRef(secs)
  const [ticking, setTicking] = useState(false)

  useEffect(() => {
    if (previous.current === secs) return undefined
    previous.current = secs
    setTicking(true)
    const timer = window.setTimeout(() => setTicking(false), 320)
    return () => window.clearTimeout(timer)
  }, [secs])

  return ticking
}

const UNITS = [
  ['days', 'Dias'],
  ['hours', 'Horas'],
  ['mins', 'Min'],
  ['secs', 'Seg'],
] as const

function LaunchParticles({ count = 68 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const band = index % 3
        const left =
          band === 0
            ? 38 + ((index * 13) % 24)
            : band === 1
              ? 28 + ((index * 17) % 44)
              : (index * 37) % 100
        return {
          id: index,
          left: `${left}%`,
          delay: `${(index % 14) * 0.4}s`,
          duration: `${6 + (index % 8)}s`,
          size: `${3 + (index % 5)}px`,
          drift: `${((index % 7) - 3) * 22}px`,
          bright: band === 0,
        }
      }),
    [count],
  )

  return (
    <div className="launch-gate__particles" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`launch-gate__spark${particle.bright ? ' is-bright' : ''}`}
          style={{
            left: particle.left,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            ['--spark-drift' as string]: particle.drift,
          }}
        />
      ))}
    </div>
  )
}

function resolveHeroTitle(info: ApiServerInfo) {
  const configured = info.coming_soon_title?.trim() || ''
  const brand = info.name?.trim() || 'PDL'
  if (!configured || configured.toLocaleLowerCase('pt-BR') === 'em breve') return brand
  return configured
}

export function ComingSoonPage({ info }: { info: ApiServerInfo }) {
  const title = resolveHeroTitle(info)
  const subtitle =
    info.coming_soon_subtitle?.trim() ||
    info.description ||
    'O reino está sendo preparado. A contagem marca a abertura.'
  const countdown = useLaunchCountdown(info.coming_soon_at)
  const ticking = useSecondTick(countdown.secs)

  return (
    <div className="launch-gate" data-theme-page="coming-soon">
      <div className="launch-gate__sky" aria-hidden="true">
        <img className="launch-gate__bg" src={themeImage('bg/coming-soon.png')} alt="" />
        <span className="launch-gate__rays" />
        <span className="launch-gate__glow launch-gate__glow--a" />
        <span className="launch-gate__glow launch-gate__glow--b" />
        <span className="launch-gate__glow launch-gate__glow--c" />
        <span className="launch-gate__haze" />
        <span className="launch-gate__vignette" />
        <LaunchParticles />
      </div>

      <main className="launch-gate__stage">
        <p className="launch-gate__kicker">Em breve</p>
        <h1 className="launch-gate__title">{title}</h1>
        <p className="launch-gate__subtitle">{subtitle}</p>

        {countdown.finished ? (
          <p className="launch-gate__ready" role="status">
            O momento chegou
          </p>
        ) : (
          <div className="launch-gate__countdown" aria-label="Contagem regressiva do lançamento">
            {UNITS.map(([key, label], index) => (
              <div key={key} className="launch-gate__unit">
                {index > 0 ? <span className="launch-gate__sep" aria-hidden="true">:</span> : null}
                <div className={`launch-gate__block${key === 'secs' && ticking ? ' is-tick' : ''}`}>
                  <span className="launch-gate__value">{countdown[key]}</span>
                  <span className="launch-gate__label">{label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="launch-gate__actions">
          <ButtonLink to="/login" size="lg">
            Entrar
          </ButtonLink>
          <ButtonLink to="/downloads" variant="secondary" size="md" className="launch-gate__secondary">
            Downloads
          </ButtonLink>
        </div>
      </main>
    </div>
  )
}
