import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

const UNITS = [
  ['days', 'Dias'],
  ['hours', 'Horas'],
  ['mins', 'Min'],
  ['secs', 'Seg'],
] as const

export function ComingSoonPage({ info }: { info: ApiServerInfo }) {
  const title = info.coming_soon_title?.trim() || info.name || 'Em breve'
  const subtitle =
    info.coming_soon_subtitle?.trim() ||
    info.description ||
    'O reino está sendo preparado. A contagem marca a abertura.'
  const countdown = useLaunchCountdown(info.coming_soon_at)

  return (
    <div className="launch-gate" data-theme-page="coming-soon">
      <div className="launch-gate__sky" aria-hidden="true">
        <img src={themeImage('bg/5.jpg')} alt="" />
        <span className="launch-gate__glow launch-gate__glow--a" />
        <span className="launch-gate__glow launch-gate__glow--b" />
        <span className="launch-gate__haze" />
      </div>

      <header className="launch-gate__top">
        <Link className="launch-gate__brand" to="/login">
          {info.name || 'PDL'}
        </Link>
        <nav className="launch-gate__links" aria-label="Acesso">
          <Link to="/login">Entrar</Link>
          <Link to="/downloads">Downloads</Link>
        </nav>
      </header>

      <main className="launch-gate__stage">
        <p className="launch-gate__kicker">Abertura do servidor</p>
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
                <div className="launch-gate__block">
                  <span className="launch-gate__value">{countdown[key]}</span>
                  <span className="launch-gate__label">{label}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
