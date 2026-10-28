import { useCallback, useEffect, useRef, useState } from 'react'

const MUSIC_VOLUME = 0.45

/**
 * Trilha opcional da Coming Soon (`pages.comingSoon.music`).
 * O navegador só libera áudio após um gesto do visitante: `start` é chamado
 * na interação com o banner da Coming Soon ou no botão de som. Depois que o
 * visitante desliga, um novo clique no banner não religa a música.
 */
export function useLaunchMusic(src: string | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mutedByVisitor = useRef(false)
  const [playing, setPlaying] = useState(false)

  const audio = useCallback(() => {
    if (!src) return null
    if (!audioRef.current) {
      const element = new Audio(src)
      element.loop = true
      element.volume = MUSIC_VOLUME
      element.preload = 'none'
      audioRef.current = element
    }
    return audioRef.current
  }, [src])

  const play = useCallback(() => {
    const element = audio()
    if (!element) return
    void element
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
  }, [audio])

  /** Gesto do banner: inicia uma única vez, sem sobrepor a escolha do visitante. */
  const start = useCallback(() => {
    if (mutedByVisitor.current || audioRef.current?.paused === false) return
    play()
  }, [play])

  const toggle = useCallback(() => {
    const element = audioRef.current
    if (element && !element.paused) {
      element.pause()
      mutedByVisitor.current = true
      setPlaying(false)
      return
    }
    mutedByVisitor.current = false
    play()
  }, [play])

  useEffect(
    () => () => {
      audioRef.current?.pause()
      audioRef.current = null
    },
    [src],
  )

  return { enabled: Boolean(src), playing, start, toggle }
}
