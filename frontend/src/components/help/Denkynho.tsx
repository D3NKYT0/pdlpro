import { useEffect, useState } from 'react'
import poses from './poses.json'
import './help.css'

const asset = (name: string) => `/mascot/denkynho/${name}`
type Pose = (typeof poses)[number]
type Layer = { src: string; box: number[] }

/** Mascote em camadas, com transição, piscada e fala controladas pela conversa.
 * Carrega as imagens da pose antes da troca e libera timers ao desmontar.
 */
export function Denkynho({ pose, talking = false, mouthOpen = false, animated = true }: { pose: string; talking?: boolean; mouthOpen?: boolean; animated?: boolean }) {
  const [view, setView] = useState<{ current: Pose; previous?: Pose }>({ current: poses[0] })
  const [blink, setBlink] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const next = poses.find(item => item.id === pose) ?? poses[0]
    let cancelled = false
    let transition: ReturnType<typeof setTimeout>
    const eyes = Array.isArray(next.eyes) ? next.eyes : next.eyes ? [next.eyes] : []
    const names = [next.src, ...eyes.map(item => item.src), ...(next.mouth ? [next.mouth.src] : [])]
    const images = names.map(name => new Image())
    Promise.all(images.map((image, index) => new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error('Imagem indisponível')); image.src = asset(names[index])
    }))).then(() => {
      if (cancelled) return
      setFailed(false)
      setView(old => ({ current: next, previous: animated && old.current.id !== next.id ? old.current : undefined }))
      transition = setTimeout(() => setView({ current: next }), 430)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true; clearTimeout(transition); images.forEach(image => { image.onload = null; image.onerror = null }) }
  }, [pose, animated])
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
  function character(item: Pose, outgoing = false) {
    const eyes = Array.isArray(item.eyes) ? item.eyes : item.eyes ? [item.eyes] : []
    return <div key={item.id} className={`denk-transition ${outgoing ? 'is-leaving' : view.previous ? 'is-entering' : ''}`}>
      <div className={`denk-pose pose-${item.id.slice(3)}${animated ? ' is-moving' : ''}`}>
        <img className="denk-base" alt="" src={asset(item.src)} />
        {!outgoing && animated && blink && eyes.map(layer)}
        {!outgoing && animated && talking && item.mouth && (item.openMouth ? !mouthOpen : mouthOpen) && layer(item.mouth)}
      </div>
    </div>
  }
  return <div className="denk-mascot" role="img" aria-label={`Denkynho — ${view.current.label}${talking ? ', falando' : ''}`} data-pose={view.current.id} data-animated={animated}>
    {view.previous && character(view.previous, true)}{character(view.current)}
    {failed && <span className="denk-asset-error">Não foi possível carregar esta animação.</span>}
  </div>
}
