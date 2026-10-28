import { useCallback, useEffect, useState, type FocusEvent } from 'react'

export const SCENE_INTERVAL_MS = 5000

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function pageHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

/**
 * Troca automática de cenas da galeria `memories`.
 * Pausa com o ponteiro/foco dentro da galeria e com a aba oculta; cada escolha
 * manual ou retomada reinicia o intervalo completo. Movimento reduzido começa pausado.
 */
export function useSceneCarousel(count: number, intervalMs = SCENE_INTERVAL_MS) {
  const [index, setIndex] = useState(0)
  const [userPaused, setUserPaused] = useState(prefersReducedMotion)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(pageHidden)
  /** Muda a cada escolha manual para reiniciar o prazo mesmo na cena atual. */
  const [cycle, setCycle] = useState(0)

  const running = count > 1 && !userPaused && !hovered && !focused && !hidden

  useEffect(() => {
    const onVisibility = () => setHidden(pageHidden())
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!running) return undefined
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % count), intervalMs)
    return () => window.clearTimeout(timer)
  }, [running, index, cycle, count, intervalMs])

  const select = useCallback((next: number) => {
    setIndex(next)
    setCycle((value) => value + 1)
  }, [])

  const togglePaused = useCallback(() => {
    setUserPaused((value) => !value)
    setCycle((value) => value + 1)
  }, [])

  return {
    index: count ? index % count : 0,
    next: count ? (index + 1) % count : 0,
    paused: userPaused,
    running,
    select,
    togglePaused,
    pointerHandlers: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
      },
    },
  }
}
