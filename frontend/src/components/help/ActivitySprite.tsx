import { useEffect, useId, useState } from 'react'
import type { ActivitySequence } from './activitySequences'

/** Reproduz quadros do atlas já carregado; congela ao sair e libera o timer ao desmontar. */
export function ActivitySprite({ sequence, active }: { sequence: ActivitySequence; active: boolean }) {
  const clipId = useId()
  const [step, setStep] = useState(0)
  const current = sequence.timeline[step]
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setStep(value => (value + 1) % sequence.timeline.length), current.duration)
    return () => clearTimeout(timer)
  }, [active, current.duration, step, sequence])
  const frame = current.frame
  const [width, height] = sequence.size
  const [viewWidth, viewHeight] = sequence.viewport
  const [anchorX, anchorY] = sequence.anchors[frame]
  const column = frame % 4
  const rowY = frame < 4 ? 0 : sequence.split
  const cellX = Math.floor(column * width / 4)
  const cellWidth = Math.floor((column + 1) * width / 4) - cellX
  return <svg className="denk-sprite" aria-hidden="true" data-frame={frame}
    viewBox={`${anchorX - viewWidth / 2} ${anchorY - viewHeight + 10} ${viewWidth} ${viewHeight}`}>
    <defs><clipPath id={clipId}><rect x={cellX} y={rowY} width={cellWidth} height={frame < 4 ? sequence.split : height - sequence.split} /></clipPath></defs>
    <image href={`/mascot/denkynho/${sequence.src}`} width={width} height={height} clipPath={`url(#${clipId})`} />
  </svg>
}
