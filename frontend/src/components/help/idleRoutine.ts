import { knownScene, type SceneId } from './scenes'
import type { HelpLanguage } from './personality'
import { speechFrame } from './speech'

/** Episódios da vida ambient — dormir é só um deles. */
export type AmbientActivity =
  | 'chat'
  | 'snack'
  | 'play'
  | 'dance'
  | 'bath'
  | 'walk'
  | 'laugh'
  | 'think'
  | 'stretch'
  | 'sleep'

export type AmbientPhase = 'speak' | 'act' | 'walk' | 'arrive' | 'sleep'

export type AmbientState = {
  activity: AmbientActivity
  phase: AmbientPhase
  line: string
  pose: string
  scene?: SceneId
  talking: boolean
  useBed: boolean
  dancing: boolean
  standingSleep: boolean
  plan: AmbientActivity[]
  planIndex: number
  route: SceneId[]
  routeIndex: number
}

export type AmbientContext = {
  language: HelpLanguage
  currentScene?: string
  unlockedScenes: string[]
  canDance: boolean
  reducedMotion: boolean
  /** Injetável nos testes para planos determinísticos. */
  random?: () => number
}

export const IDLE_TRIGGER_MS = 45_000
export const IDLE_WALK_MS = 3_000
export const IDLE_ARRIVE_MS = 1_800
export const IDLE_SLEEP_MS = 12_000
export const IDLE_ACT_MS = 5_500
export const IDLE_DANCE_MS = 7_000
export const IDLE_SPEAK_HOLD_MS = 900

const PREFERRED_PATH = ['living-room', 'kitchen', 'bathroom', 'bedroom'] as const
const LIFE_POOL: AmbientActivity[] = ['chat', 'snack', 'play', 'laugh', 'think', 'stretch', 'walk', 'bath', 'dance', 'sleep']

type LinePair = { pt: string; en: string }

const LINES: Record<string, LinePair[]> = {
  chat: [
    { pt: 'Ei! Ainda estou por aqui se precisar de mim.', en: "Hey! I'm still around if you need me." },
    { pt: 'Que silêncio gostoso… Posso contar uma coisinha?', en: 'Such a cozy quiet… Want to hear something small?' },
    { pt: 'Estou de plantão no PDL. Qualquer dúvida, é só chamar!', en: "I'm on duty in PDL. Just call if you have a question!" },
  ],
  snack_say: [
    { pt: 'Hmm, deu uma vontade de um lanchinho…', en: 'Hmm, I could really use a little snack…' },
    { pt: 'Vou até a cozinha pegar algo gostoso!', en: "I'll head to the kitchen for something tasty!" },
  ],
  snack_act: [
    { pt: 'Nhac nhac… Que delícia!', en: 'Nom nom… Delicious!' },
    { pt: 'Pronto, energia renovada!', en: 'There — energy restored!' },
  ],
  play_say: [
    { pt: 'Vou jogar uma partidinha rapidinha!', en: "I'm hopping into a quick little match!" },
    { pt: 'Controle na mão… hora de me divertir!', en: 'Controller ready… playtime!' },
  ],
  play_act: [
    { pt: 'Quase ganhei! Mais uma?', en: 'So close! One more round?' },
    { pt: 'Boa partida! Fiquei bem animado.', en: 'Nice match! That got me pumped.' },
  ],
  dance_say: [
    { pt: 'Senti o ritmo! Vou dançar um pouco.', en: 'I feel the beat! Time for a little dance.' },
    { pt: 'Música imaginária no ar… vem comigo!', en: 'Imaginary music in the air… dance with me!' },
  ],
  dance_act: [
    { pt: 'Ufa! Dançar cansa, mas anima demais.', en: 'Whew! Dancing is tiring, but so fun.' },
  ],
  bath_say: [
    { pt: 'Hora do banho! Vou ficar limpinho.', en: 'Bath time! Going to get squeaky clean.' },
    { pt: 'Espuma e água quentinha… já volto!', en: 'Bubbles and warm water… be right back!' },
  ],
  bath_act: [
    { pt: 'Ah, que refrescante! Pronto para continuar.', en: 'Ahh, refreshing! Ready to keep going.' },
  ],
  walk_say: [
    { pt: 'Vou dar uma voltinha pela casa.', en: "I'll take a little stroll around the house." },
    { pt: 'Caminhar um pouco faz bem, né?', en: 'A short walk always helps, right?' },
  ],
  walk_act: [
    { pt: 'Indo aos poucos, explorando os cômodos…', en: 'Making my way, exploring the rooms…' },
  ],
  laugh_say: [
    { pt: 'Lembrei de uma graça… ha ha!', en: 'I just remembered something funny… ha ha!' },
    { pt: 'Hoje estou bem-humorado!', en: "I'm in such a good mood today!" },
  ],
  laugh_act: [
    { pt: 'Ha ha ha! Desculpa, não consigo parar.', en: "Ha ha ha! Sorry, I can't stop." },
  ],
  think_say: [
    { pt: 'Deixa eu pensar numa dica boa para você…', en: 'Let me think of a good tip for you…' },
    { pt: 'Hmm… o que será que podemos aprender agora?', en: 'Hmm… what could we learn next?' },
  ],
  think_act: [
    { pt: 'Pensei, pensei… e estou pronto se quiser conversar!', en: "I've thought it through… ready whenever you want to chat!" },
  ],
  stretch_say: [
    { pt: 'Espreguiçar um pouquinho… aaah!', en: 'Just a little stretch… aaah!' },
    { pt: 'Tudo bem por aí? Estou aqui, de braços abertos.', en: 'Everything okay? Here I am, arms open.' },
  ],
  sleep_say: [
    { pt: 'Estou com sono… Vou até o quarto, já volto!', en: "I'm getting sleepy… Heading to my room, be right back!" },
    { pt: 'Boa noite! Vou descansar um pouco.', en: "Good night! I'm going to rest a bit." },
  ],
  sleep_say_here: [
    { pt: 'Estou com sono… Vou descansar um pouco por aqui.', en: "I'm getting sleepy… I'll rest here for a bit." },
  ],
  sleep_arrive: [
    { pt: 'Cheguei no quarto. Boa noite!', en: 'Made it to the bedroom. Good night!' },
  ],
  sleep_act: [
    { pt: 'Dormindo tranquilamente… Zzz.', en: 'Sleeping peacefully… Zzz.' },
  ],
  wake: [
    { pt: 'Acordei! Que soninho bom. E aí, precisa de algo?', en: 'I woke up! That was a nice nap. Need anything?' },
    { pt: 'Pronto, já estou de pé de novo!', en: "All set — I'm up again!" },
  ],
}

function pickLine(key: string, language: HelpLanguage, random: () => number): string {
  const options = LINES[key] ?? LINES.chat
  const pair = options[Math.min(options.length - 1, Math.floor(random() * options.length))]!
  return language === 'pt' ? pair.pt : pair.en
}

function roll(random: () => number) {
  return random()
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(roll(random) * (i + 1))
    ;[list[i], list[j]] = [list[j]!, list[i]!]
  }
  return list
}

function hasScene(unlocked: Set<SceneId>, id: SceneId) {
  return unlocked.has(id)
}

function sceneFor(activity: AmbientActivity, unlocked: Set<SceneId>, current?: SceneId): SceneId | undefined {
  if (activity === 'snack' && hasScene(unlocked, 'kitchen')) return 'kitchen'
  if (activity === 'bath' && hasScene(unlocked, 'bathroom')) return 'bathroom'
  if (activity === 'play' && hasScene(unlocked, 'living-room')) return 'living-room'
  if (activity === 'play' && hasScene(unlocked, 'garden')) return 'garden'
  if (activity === 'think' && hasScene(unlocked, 'study')) return 'study'
  if (activity === 'sleep' && hasScene(unlocked, 'bedroom')) return 'bedroom'
  if (activity === 'dance' && hasScene(unlocked, 'living-room')) return 'living-room'
  return current
}

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

function walkRoute(current: string | undefined, unlocked: string[]): SceneId[] {
  const available = unlocked.map(knownScene).filter((id): id is SceneId => Boolean(id))
  const start = knownScene(current)
  const indoor = PREFERRED_PATH.filter(id => available.includes(id))
  const route: SceneId[] = []
  if (start && available.includes(start)) route.push(start)
  for (const id of indoor) {
    if (!route.includes(id)) route.push(id)
  }
  if (!route.length && start) return [start]
  return route.slice(0, 4)
}

function availableActivities(ctx: AmbientContext, unlocked: Set<SceneId>): AmbientActivity[] {
  return LIFE_POOL.filter(activity => {
    if (activity === 'dance') return ctx.canDance
    if (activity === 'bath') return hasScene(unlocked, 'bathroom') || unlocked.size === 0
    if (activity === 'snack') return hasScene(unlocked, 'kitchen') || unlocked.size === 0
    return true
  })
}

/** Monta 3–5 episódios variados; dormir pode entrar, mas não domina o plano. */
export function buildLifePlan(ctx: AmbientContext): AmbientActivity[] {
  const random = ctx.random ?? Math.random
  const unlocked = new Set(ctx.unlockedScenes.map(knownScene).filter((id): id is SceneId => Boolean(id)))
  const pool = availableActivities(ctx, unlocked)
  const withoutSleep = pool.filter(item => item !== 'sleep')
  const count = 3 + Math.floor(roll(random) * 3)
  const picked = shuffle(withoutSleep, random).slice(0, Math.min(count, withoutSleep.length))
  if (pool.includes('sleep') && roll(random) < 0.45) {
    picked.push('sleep')
  } else if (picked.length < 2) {
    picked.push('chat')
  }
  return picked.length ? picked : ['chat']
}

function poseForAct(activity: AmbientActivity): string {
  if (activity === 'snack') return '11-comendo'
  if (activity === 'play') return '12-jogando'
  if (activity === 'dance') return '13-dancando'
  if (activity === 'bath') return '15-banho'
  if (activity === 'laugh') return '06-rindo'
  if (activity === 'think') return '03-pensando'
  if (activity === 'stretch' || activity === 'chat') return '01-boas-vindas'
  if (activity === 'walk') return '16-andando'
  return '05-dormindo'
}

function announcePose(activity: AmbientActivity): string {
  if (activity === 'think') return '03-pensando'
  if (activity === 'laugh') return '06-rindo'
  if (activity === 'sleep') return '01-boas-vindas'
  return '01-boas-vindas'
}

function announceKey(activity: AmbientActivity, useBed: boolean): string {
  if (activity === 'snack') return 'snack_say'
  if (activity === 'play') return 'play_say'
  if (activity === 'dance') return 'dance_say'
  if (activity === 'bath') return 'bath_say'
  if (activity === 'walk') return 'walk_say'
  if (activity === 'laugh') return 'laugh_say'
  if (activity === 'think') return 'think_say'
  if (activity === 'stretch') return 'stretch_say'
  if (activity === 'sleep') return useBed ? 'sleep_say' : 'sleep_say_here'
  return 'chat'
}

function actLineKey(activity: AmbientActivity): string {
  if (activity === 'snack') return 'snack_act'
  if (activity === 'play') return 'play_act'
  if (activity === 'dance') return 'dance_act'
  if (activity === 'bath') return 'bath_act'
  if (activity === 'walk') return 'walk_act'
  if (activity === 'laugh') return 'laugh_act'
  if (activity === 'think') return 'think_act'
  if (activity === 'sleep') return 'sleep_act'
  return 'chat'
}

function beginActivity(activity: AmbientActivity, plan: AmbientActivity[], planIndex: number, ctx: AmbientContext): AmbientState {
  const random = ctx.random ?? Math.random
  const unlocked = new Set(ctx.unlockedScenes.map(knownScene).filter((id): id is SceneId => Boolean(id)))
  const current = knownScene(ctx.currentScene)
  const useBed = activity === 'sleep' && hasScene(unlocked, 'bedroom')
  const route = activity === 'sleep'
    ? buildIdleRoute(ctx.currentScene, ctx.unlockedScenes)
    : activity === 'walk'
      ? walkRoute(ctx.currentScene, ctx.unlockedScenes)
      : []
  const scene = activity === 'sleep' || activity === 'walk'
    ? route[0] ?? current
    : sceneFor(activity, unlocked, current)
  const pose = announcePose(activity)
  const line = pickLine(announceKey(activity, useBed), ctx.language, random)
  return {
    activity,
    phase: 'speak',
    line,
    pose,
    scene,
    talking: true,
    useBed,
    dancing: false,
    standingSleep: false,
    plan,
    planIndex,
    route,
    routeIndex: 0,
  }
}

export function startAmbient(ctx: AmbientContext): AmbientState {
  const plan = buildLifePlan(ctx)
  return beginActivity(plan[0]!, plan, 0, ctx)
}

/** Inicia a vida ambient com um plano fixo (testes e demos). */
export function startAmbientPlan(plan: AmbientActivity[], ctx: AmbientContext): AmbientState {
  const safe = plan.length ? plan : ['chat']
  return beginActivity(safe[0]!, safe, 0, ctx)
}

/** Estima a duração da fala ambient com a mesma cadência do chat. */
export function estimateSpeechMs(line: string, pose: string, animated: boolean): number {
  if (!animated) return 1_200 + IDLE_SPEAK_HOLD_MS
  let shown = 0
  let ms = 0
  const total = Array.from(line).length
  while (shown < total) {
    const frame = speechFrame(line, shown, pose)
    ms += frame.delay
    shown = Math.min(total, shown + frame.step)
  }
  return ms + IDLE_SPEAK_HOLD_MS
}

export function ambientDuration(state: AmbientState, animated = true): number {
  if (state.phase === 'speak') return estimateSpeechMs(state.line, state.pose, animated)
  if (state.phase === 'walk') return IDLE_WALK_MS
  if (state.phase === 'arrive') return IDLE_ARRIVE_MS
  if (state.phase === 'sleep') return IDLE_SLEEP_MS
  if (state.activity === 'dance') return IDLE_DANCE_MS
  if (state.activity === 'chat' || state.activity === 'stretch') return 2_000
  return IDLE_ACT_MS
}

export function ambientPose(state: AmbientState): string {
  return state.pose
}

function nextInPlan(state: AmbientState, ctx: AmbientContext): AmbientState {
  const nextIndex = state.planIndex + 1
  if (nextIndex < state.plan.length) {
    return beginActivity(state.plan[nextIndex]!, state.plan, nextIndex, ctx)
  }
  const plan = buildLifePlan(ctx)
  return beginActivity(plan[0]!, plan, 0, ctx)
}

function enterAct(state: AmbientState, ctx: AmbientContext): AmbientState {
  const random = ctx.random ?? Math.random
  const pose = poseForAct(state.activity)
  const line = pickLine(actLineKey(state.activity), ctx.language, random)
  return {
    ...state,
    phase: 'act',
    pose,
    line,
    talking: false,
    dancing: state.activity === 'dance',
    standingSleep: false,
    useBed: false,
  }
}

/** Avança a vida ambient; nunca termina sozinha — dorme, acorda e segue vivendo. */
export function advanceAmbient(state: AmbientState, ctx: AmbientContext): AmbientState {
  const random = ctx.random ?? Math.random

  if (state.phase === 'speak') {
    if (state.activity === 'sleep') {
      if (ctx.reducedMotion || state.route.length <= 1) {
        const scene = state.useBed ? 'bedroom' as const : state.scene
        return {
          ...state,
          phase: 'sleep',
          scene,
          pose: '05-dormindo',
          line: pickLine('sleep_act', ctx.language, random),
          talking: false,
          dancing: false,
          standingSleep: !state.useBed,
          routeIndex: Math.max(0, state.route.length - 1),
        }
      }
      const routeIndex = Math.min(1, state.route.length - 1)
      const scene = state.route[routeIndex]!
      if (scene === 'bedroom' && routeIndex === state.route.length - 1) {
        return {
          ...state,
          phase: 'arrive',
          routeIndex,
          scene,
          pose: '16-andando',
          line: pickLine('sleep_arrive', ctx.language, random),
          talking: true,
          dancing: false,
          standingSleep: false,
        }
      }
      return {
        ...state,
        phase: 'walk',
        routeIndex,
        scene,
        pose: '16-andando',
        line: pickLine('walk_act', ctx.language, random),
        talking: false,
        dancing: false,
        standingSleep: false,
      }
    }

    if (state.activity === 'walk') {
      if (ctx.reducedMotion || state.route.length <= 1) {
        return nextInPlan(state, ctx)
      }
      const routeIndex = Math.min(1, state.route.length - 1)
      return {
        ...state,
        phase: 'walk',
        routeIndex,
        scene: state.route[routeIndex],
        pose: '16-andando',
        line: pickLine('walk_act', ctx.language, random),
        talking: false,
        dancing: false,
        standingSleep: false,
      }
    }

    if (state.activity === 'chat' || state.activity === 'stretch') {
      return nextInPlan(state, ctx)
    }

    return enterAct(state, ctx)
  }

  if (state.phase === 'walk') {
    const routeIndex = state.routeIndex + 1
    if (routeIndex >= state.route.length) {
      if (state.activity === 'sleep') {
        return {
          ...state,
          phase: 'sleep',
          scene: state.useBed ? 'bedroom' : state.scene,
          pose: '05-dormindo',
          line: pickLine('sleep_act', ctx.language, random),
          talking: false,
          dancing: false,
          standingSleep: !state.useBed,
        }
      }
      return nextInPlan(state, ctx)
    }
    const scene = state.route[routeIndex]!
    if (state.activity === 'sleep' && scene === 'bedroom' && routeIndex === state.route.length - 1) {
      return {
        ...state,
        phase: 'arrive',
        routeIndex,
        scene,
        pose: '16-andando',
        line: pickLine('sleep_arrive', ctx.language, random),
        talking: true,
        dancing: false,
        standingSleep: false,
      }
    }
    return {
      ...state,
      phase: 'walk',
      routeIndex,
      scene,
      pose: '16-andando',
      line: pickLine('walk_act', ctx.language, random),
      talking: false,
      dancing: false,
      standingSleep: false,
    }
  }

  if (state.phase === 'arrive') {
    return {
      ...state,
      phase: 'sleep',
      scene: 'bedroom',
      pose: '05-dormindo',
      line: pickLine('sleep_act', ctx.language, random),
      talking: false,
      dancing: false,
      standingSleep: false,
      useBed: true,
    }
  }

  if (state.phase === 'sleep') {
    const rest = state.plan.slice(state.planIndex + 1)
    const plan = rest.length ? rest : buildLifePlan(ctx)
    const next = beginActivity(plan[0]!, plan, 0, ctx)
    return {
      ...next,
      line: pickLine('wake', ctx.language, random),
      pose: '01-boas-vindas',
      phase: 'speak',
      talking: true,
      dancing: false,
      standingSleep: false,
      useBed: false,
    }
  }

  // act → next episode
  return nextInPlan(state, ctx)
}

/** Compat: falas legadas usadas nos testes de rota/sono. */
export function idleLine(phase: 'speak' | 'walk' | 'bedroom' | 'sleep', language: HelpLanguage, hasBedroom: boolean): string {
  const pt = language === 'pt'
  if (phase === 'speak') {
    return pt
      ? (hasBedroom ? 'Estou com sono… Vou até o quarto, já volto!' : 'Estou com sono… Vou descansar um pouco por aqui.')
      : (hasBedroom ? "I'm getting sleepy… Heading to my room, be right back!" : "I'm getting sleepy… I'll rest here for a bit.")
  }
  if (phase === 'walk') return pt ? 'Indo aos poucos pela casa…' : 'Making my way through the house…'
  if (phase === 'bedroom') return pt ? 'Cheguei no quarto. Boa noite!' : 'Made it to the bedroom. Good night!'
  return pt ? 'Dormindo tranquilamente.' : 'Sleeping peacefully.'
}
