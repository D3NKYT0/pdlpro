import { knownScene, type SceneId } from './scenes'
import type { HelpLanguage } from './personality'

export type IdlePhase = 'speak' | 'walk' | 'bedroom' | 'sleep'

export type AmbientState = {
  phase: IdlePhase
  line: string
  scene?: SceneId
  route: SceneId[]
  routeIndex: number
  useBed: boolean
}

export const IDLE_TRIGGER_MS = 45_000
export const IDLE_SPEAK_MS = 4_000
export const IDLE_WALK_MS = 3_000
export const IDLE_BEDROOM_MS = 2_000

const PREFERRED_PATH = ['living-room', 'kitchen', 'bathroom', 'bedroom'] as const

/** Monta o caminho indoor até o quarto usando só cenários desbloqueados. */
export function buildIdleRoute(current: string | undefined, unlocked: string[]): SceneId[] {
  const available = new Set(unlocked.map(knownScene).filter((id): id is SceneId => Boolean(id)))
  const start = knownScene(current)
  const hasBedroom = available.has('bedroom')
  const preferred = PREFERRED_PATH.filter(id => available.has(id))
  const route: SceneId[] = []
  if (start && available.has(start)) route.push(start)
  for (const id of preferred) {
    if (!route.includes(id)) route.push(id)
  }
  if (!route.length) return start ? [start] : []
  if (hasBedroom) {
    const withoutBed = route.filter(id => id !== 'bedroom')
    return [...withoutBed.slice(0, 3), 'bedroom']
  }
  return route.slice(0, 2)
}

export function idleLine(phase: IdlePhase, language: HelpLanguage, hasBedroom: boolean): string {
  const pt = language === 'pt'
  if (phase === 'speak') {
    return pt
      ? (hasBedroom ? 'Estou com sono… Vou até o quarto, já volto!' : 'Estou com sono… Vou descansar um pouco por aqui.')
      : (hasBedroom ? "I'm getting sleepy… Heading to my room, be right back!" : "I'm getting sleepy… I'll rest here for a bit.")
  }
  if (phase === 'walk') {
    return pt ? 'Indo aos poucos pela casa…' : 'Making my way through the house…'
  }
  if (phase === 'bedroom') {
    return pt ? 'Cheguei no quarto. Boa noite!' : 'Made it to the bedroom. Good night!'
  }
  return pt ? 'Dormindo tranquilamente.' : 'Sleeping peacefully.'
}

export function startAmbient(route: SceneId[], language: HelpLanguage): AmbientState {
  const useBed = route.includes('bedroom')
  return {
    phase: 'speak',
    line: idleLine('speak', language, useBed),
    scene: route[0],
    route,
    routeIndex: 0,
    useBed,
  }
}

/** Avança uma fase da rotina; `null` quando já está dormindo. */
export function advanceAmbient(state: AmbientState, language: HelpLanguage, reducedMotion: boolean): AmbientState | null {
  if (state.phase === 'sleep') return null

  if (state.phase === 'speak') {
    if (reducedMotion || state.route.length <= 1) {
      const scene = state.useBed ? 'bedroom' as const : state.scene
      return { ...state, phase: 'sleep', scene, routeIndex: state.route.length - 1, line: idleLine('sleep', language, state.useBed) }
    }
    const routeIndex = Math.min(1, state.route.length - 1)
    const scene = state.route[routeIndex]
    if (scene === 'bedroom' && routeIndex === state.route.length - 1) {
      return { ...state, phase: 'bedroom', routeIndex, scene, line: idleLine('bedroom', language, true) }
    }
    return { ...state, phase: 'walk', routeIndex, scene, line: idleLine('walk', language, state.useBed) }
  }

  if (state.phase === 'walk') {
    const routeIndex = state.routeIndex + 1
    if (routeIndex >= state.route.length) {
      return { ...state, phase: 'sleep', scene: state.useBed ? 'bedroom' : state.scene, line: idleLine('sleep', language, state.useBed) }
    }
    const scene = state.route[routeIndex]
    if (scene === 'bedroom' && routeIndex === state.route.length - 1) {
      return { ...state, phase: 'bedroom', routeIndex, scene, line: idleLine('bedroom', language, true) }
    }
    return { ...state, phase: 'walk', routeIndex, scene, line: idleLine('walk', language, state.useBed) }
  }

  // bedroom → sleep
  return { ...state, phase: 'sleep', scene: 'bedroom', line: idleLine('sleep', language, true) }
}

export function ambientDuration(phase: IdlePhase): number {
  if (phase === 'speak') return IDLE_SPEAK_MS
  if (phase === 'walk') return IDLE_WALK_MS
  if (phase === 'bedroom') return IDLE_BEDROOM_MS
  return 0
}

export function ambientPose(state: AmbientState): string {
  if (state.phase === 'speak') return '01-boas-vindas'
  if (state.phase === 'walk' || state.phase === 'bedroom') return '16-andando'
  return '05-dormindo'
}
