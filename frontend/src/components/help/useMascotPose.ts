import { useEffect, useReducer } from 'react'
import poses from './poses.json'
import { activitySequences } from './activitySequences'
import { denkynhoPose, denkynhoSequence } from './assets'

type Pose = (typeof poses)[number]
type Character = { pose: Pose; mirrored: boolean; key: number; bed: boolean }
type Target = { pose: Pose; animated: boolean; vary: boolean; urgent: boolean; idle: boolean }
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
  if (state.loaded && state.current.pose.id === target.pose.id && state.current.bed === (target.pose.id === '05-dormindo' && !target.idle)) {
    return { ...state, pending: undefined, failed: false }
  }
  let mirrored = state.current.mirrored
  let visits = state.visits
  const bed = target.pose.id === '05-dormindo' && !target.idle
  if (target.vary && (activitySequences[target.pose.id] || target.pose.id === '02-sucesso')) {
    const lastVisit = visits[target.pose.id]
    mirrored = lastVisit === undefined ? mirrored : !lastVisit
    visits = { ...visits, [target.pose.id]: mirrored }
  }
  const transition: Transition = mirrored !== state.current.mirrored ? 'turn'
    : bed ? 'rest'
      : state.current.bed ? 'wake' : 'shift'
  const moving = state.loaded && target.animated
  return {
    current: { pose: target.pose, mirrored, key: state.current.key + 1, bed },
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
 * Em ociosidade não carrega o atlas da cama — só a pose estática em pé.
 */
export function useMascotPose(pose: string, animated: boolean, talking: boolean, idle = false) {
  const [view, dispatch] = useReducer(reduce, {
    current: { pose: poses[0], mirrored: false, key: 0, bed: false }, visits: {}, loaded: false, failed: false,
  })
  useEffect(() => {
    dispatch({ type: 'request', animated })
    const next = poses.find(item => item.id === pose) ?? poses[0]
    let cancelled = false
    const eyes = Array.isArray(next.eyes) ? next.eyes : next.eyes ? [next.eyes] : []
    const sequence = animated && !idle ? activitySequences[next.id] : undefined
    const poseFiles = [next.src, ...eyes.map(item => item.src), ...(next.mouth ? [next.mouth.src] : [])]
    const sequenceFiles = sequence ? [sequence.src] : []
    const images = [...poseFiles, ...sequenceFiles].map(() => new Image())
    Promise.all(images.map((image, index) => new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Imagem indisponível'))
      const file = index < poseFiles.length ? denkynhoPose(poseFiles[index]) : denkynhoSequence(sequenceFiles[index - poseFiles.length])
      image.src = file
    }))).then(() => {
      if (!cancelled) dispatch({ type: 'ready', target: {
        pose: next, animated, vary: animated && !talking && !idle,
        urgent: talking || idle || !(activitySequences[next.id] || next.id === '02-sucesso'),
        idle,
      } })
    }).catch(() => { if (!cancelled) dispatch({ type: 'failed' }) })
    return () => { cancelled = true; images.forEach(image => { image.onload = null; image.onerror = null }) }
  }, [pose, animated, talking, idle])
  useEffect(() => {
    if (!view.transition) return
    const timer = setTimeout(() => dispatch({ type: 'finish', key: view.current.key }), transitionDurations[view.transition])
    return () => clearTimeout(timer)
  }, [view.transition, view.current.key])
  return view
}
