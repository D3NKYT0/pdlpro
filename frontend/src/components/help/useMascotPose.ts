import { useEffect, useReducer } from 'react'
import poses from './poses.json'
import { activitySequences } from './activitySequences'

type Pose = (typeof poses)[number]
type Character = { pose: Pose; mirrored: boolean; key: number }
type Target = { pose: Pose; animated: boolean; vary: boolean; urgent: boolean }
export const transitionDurations = { shift: 560, turn: 720, rest: 800, wake: 760 } as const
type Transition = keyof typeof transitionDurations
type State = {
  current: Character
  previous?: Character
  pending?: Target
  transition?: Transition
  visits: Partial<Record<string, boolean>>
  loaded: boolean
  failed: boolean
}
type Event = { type: 'request'; animated: boolean } | { type: 'ready'; target: Target } | { type: 'failed' } | { type: 'finish'; key: number }

function enter(state: State, target: Target): State {
  if (state.loaded && state.current.pose.id === target.pose.id) return { ...state, pending: undefined, failed: false }
  let mirrored = state.current.mirrored
  let visits = state.visits
  if (target.vary && (activitySequences[target.pose.id] || target.pose.id === '02-sucesso')) {
    const lastVisit = visits[target.pose.id]
    mirrored = lastVisit === undefined ? mirrored : !lastVisit
    visits = { ...visits, [target.pose.id]: mirrored }
  }
  const transition: Transition = mirrored !== state.current.mirrored ? 'turn'
    : target.pose.id === '05-dormindo' ? 'rest'
      : state.current.pose.id === '05-dormindo' ? 'wake' : 'shift'
  const moving = state.loaded && target.animated
  return {
    current: { pose: target.pose, mirrored, key: state.current.key + 1 },
    previous: moving ? state.current : undefined,
    transition: moving ? transition : undefined,
    visits, loaded: true, failed: false,
  }
}

function reduce(state: State, event: Event): State {
  switch (event.type) {
    case 'request':
      return { ...state, pending: undefined, ...(event.animated ? {} : { previous: undefined, transition: undefined }) }
    case 'ready':
      if (state.previous && event.target.animated && !event.target.urgent) return { ...state, pending: event.target, failed: false }
      return enter(state, event.target)
    case 'failed': return { ...state, failed: true }
    case 'finish': {
      if (state.current.key !== event.key) return state
      const settled = { ...state, previous: undefined, transition: undefined, pending: undefined }
      return state.pending ? enter(settled, state.pending) : settled
    }
  }
}

/** Pré-carrega poses e coordena saída/entrada sem empilhar imagens.
 * Guarda a orientação por visita; pedidos rápidos substituem só a próxima troca.
 * Não espelha durante fala/movimento reduzido; libera imagens e timers ao desmontar.
 */
export function useMascotPose(pose: string, animated: boolean, talking: boolean) {
  const [view, dispatch] = useReducer(reduce, {
    current: { pose: poses[0], mirrored: false, key: 0 }, visits: {}, loaded: false, failed: false,
  })
  useEffect(() => {
    dispatch({ type: 'request', animated })
    const next = poses.find(item => item.id === pose) ?? poses[0]
    let cancelled = false
    const eyes = Array.isArray(next.eyes) ? next.eyes : next.eyes ? [next.eyes] : []
    const sequence = animated ? activitySequences[next.id] : undefined
    const names = [next.src, ...eyes.map(item => item.src), ...(next.mouth ? [next.mouth.src] : []), ...(sequence ? [sequence.src] : [])]
    const images = names.map(() => new Image())
    Promise.all(images.map((image, index) => new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Imagem indisponível'))
      image.src = `/mascot/denkynho/${names[index]}`
    }))).then(() => {
      if (!cancelled) dispatch({ type: 'ready', target: {
        pose: next, animated, vary: animated && !talking,
        urgent: talking || !(activitySequences[next.id] || next.id === '02-sucesso'),
      } })
    }).catch(() => { if (!cancelled) dispatch({ type: 'failed' }) })
    return () => { cancelled = true; images.forEach(image => { image.onload = null; image.onerror = null }) }
  }, [pose, animated, talking])
  useEffect(() => {
    if (!view.transition) return
    const timer = setTimeout(() => dispatch({ type: 'finish', key: view.current.key }), transitionDurations[view.transition])
    return () => clearTimeout(timer)
  }, [view.transition, view.current.key])
  return view
}
