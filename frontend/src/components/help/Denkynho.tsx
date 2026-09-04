import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ActivitySprite } from './ActivitySprite'
import { activitySequences } from './activitySequences'
import { useReducedMotion } from './useReducedMotion'
import { transitionDurations, useMascotPose } from './useMascotPose'
import './help.css'

const asset = (name: string) => `/mascot/denkynho/${name}`
type Layer = { src: string; box: number[] }

/** Mascote com sequências de ação, transição, piscada e fala controladas pela conversa.
 * Carrega as imagens da pose antes da troca e libera timers ao desmontar.
 */
export function Denkynho({ pose, idle = false, talking = false, mouthOpen = false, animated: animate = true }: { pose: string; idle?: boolean; talking?: boolean; mouthOpen?: boolean; animated?: boolean }) {
  const reduced = useReducedMotion()
  const animated = animate && !reduced
  const view = useMascotPose(pose, animated, talking)
  const [blink, setBlink] = useState(false)
  useEffect(() => {
    setBlink(false)
    if (!animated) return
    let close: ReturnType<typeof setTimeout>
    let next: ReturnType<typeof setTimeout>
    const schedule = () => { next = setTimeout(() => { setBlink(true); close = setTimeout(() => { setBlink(false); schedule() }, 150) }, 2800 + Math.random() * 1800) }
    schedule()
    return () => { clearTimeout(close); clearTimeout(next) }
  }, [animated])
  function layer(item: Layer) {
    const [x, y, right, bottom] = item.box
    return <img key={item.src} className="denk-face" alt="" src={asset(item.src)} style={{ left: `${x / 256 * 100}%`, top: `${y / 384 * 100}%`, width: `${(right - x) / 256 * 100}%`, height: `${(bottom - y) / 384 * 100}%` }} />
  }
  function character(character: typeof view.current, outgoing = false) {
    const item = character.pose
    const eyes = Array.isArray(item.eyes) ? item.eyes : item.eyes ? [item.eyes] : []
    const sequence = animated && !talking ? activitySequences[item.id] : undefined
    return <div key={character.key} className={`denk-transition ${outgoing ? 'is-leaving' : animated && view.previous ? 'is-entering' : ''}`}>
      <div className="denk-facing" data-mirrored={character.mirrored} style={{ transform: character.mirrored ? 'scaleX(-1)' : 'scaleX(1)' }}>
      <div className={`denk-pose pose-${item.id.slice(3)}${animated && !sequence ? ' is-moving' : ''}`}>
        {sequence ? <ActivitySprite sequence={sequence} active={!outgoing && !view.previous} /> : <>
        <img className="denk-base" alt="" src={asset(item.src)} />
        {!outgoing && animated && blink && eyes.map(layer)}
        {!outgoing && animated && talking && item.mouth && (item.openMouth ? !mouthOpen : mouthOpen) && layer(item.mouth)}
        </>}
      </div>
      </div>
    </div>
  }
  return <div className="denk-mascot" role="img" aria-label={`Denkynho — ${view.current.pose.label}${talking ? ', falando' : ''}`} data-pose={view.current.pose.id} data-idle={idle} data-animated={animated}
    data-mirrored={view.current.mirrored} data-transition={animated ? view.transition ?? 'none' : 'none'}
    style={{ '--denk-transition-duration': `${view.transition ? transitionDurations[view.transition] : 0}ms` } as CSSProperties}>
    {animated && view.previous && character(view.previous, true)}{character(view.current)}
    {view.failed && <span className="denk-asset-error">Não foi possível carregar esta animação.</span>}
  </div>
}
