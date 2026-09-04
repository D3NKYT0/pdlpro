import { useEffect, useState } from 'react'
import type { ActivitySequence } from './activitySequences'

/** Reproduz quadros do atlas já carregado; congela ao sair e libera o timer ao desmontar. */
export function ActivitySprite({ sequence, active }: { sequence: ActivitySequence; active: boolean }) {
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
  const cellHeight = frame < 4 ? sequence.split : height - sequence.split
  // O viewBox é contido na célula atual, sem depender de clip-path com IDs do DOM.
  const sourceWidth = Math.min(viewWidth, cellWidth)
  const sourceHeight = Math.min(viewHeight, cellHeight)
  const sourceX = Math.min(Math.max(anchorX - sourceWidth / 2, cellX), cellX + cellWidth - sourceWidth)
  const sourceY = Math.min(Math.max(anchorY - sourceHeight + 10, rowY), rowY + cellHeight - sourceHeight)
  return <svg className="denk-sprite" aria-hidden="true" data-frame={frame}
    viewBox={`${sourceX} ${sourceY} ${sourceWidth} ${sourceHeight}`}>
    <image href={`/mascot/denkynho/${sequence.src}`} width={width} height={height} />
  </svg>
}
