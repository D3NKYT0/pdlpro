import { useEffect, useState } from 'react'
import { scenes, type SceneId } from './scenes'

/** Preloads the selected environment and keeps the previous one on failure. */
export function SceneBackdrop({ scene }: { scene: SceneId }) {
  const [loaded, setLoaded] = useState<SceneId>()
  useEffect(() => {
    let active = true
    const image = new Image()
    image.onload = () => { if (active) setLoaded(scene) }
    image.src = scenes[scene].src
    return () => { active = false; image.onload = null }
  }, [scene])
  return <span className="denk-scene" aria-hidden="true" data-scene={loaded}>
    {loaded && <img src={scenes[loaded].src} alt="" />}
  </span>
}
