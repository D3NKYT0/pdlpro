import { knownScene, type SceneId } from './scenes'
import type { HelpLanguage } from './personality'
import { speechFrame } from './speech'
import type { DenkynhoAction } from '../../services/domain/content.service'

/** Episódios da vida ambient — dormir/cochilar é só parte do dia. */
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
  | 'nap'
  | 'garden'
  | 'camp'
  | 'observe'
  | 'water'
  | 'fish'
  | 'bench'
  | 'tv'
  | 'affection'
  | 'pause'

export type AmbientPhase = 'speak' | 'act' | 'walk' | 'arrive' | 'sleep' | 'linger'

export type AmbientNeeds = {
  satiety: number
  energy: number
  happiness: number
  hygiene: number
}

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
  /** Sem atlas e sem balanço CSS — pausa, pensar, conversar, observar. */
  still: boolean
  careAction: DenkynhoAction | null
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
  needs?: AmbientNeeds
  emotionId?: string
  /** Injetável nos testes para planos determinísticos. */
  random?: () => number
}

export const IDLE_TRIGGER_MS = 45_000
export const IDLE_WALK_MS = 4_500
export const IDLE_ARRIVE_MS = 2_800
export const IDLE_SLEEP_MS = 20_000
export const IDLE_ACT_MS = 11_000
export const IDLE_DANCE_MS = 12_000
export const IDLE_LINGER_MS = 7_000
export const IDLE_OUTDOOR_MS = 14_000
export const IDLE_SPEAK_HOLD_MS = 1_600
export const NEED_SOFT = 45
export const NEED_HARD = 28

const PREFERRED_PATH = ['living-room', 'kitchen', 'bathroom', 'bedroom'] as const

/** Só estas ações usam atlas de sequência; o resto fica parado (pose estática). */
const SEQUENCE_ACTIVITIES = new Set<AmbientActivity>([
  'snack', 'play', 'dance', 'bath', 'walk', 'garden', 'camp', 'laugh', 'affection', 'sleep', 'water', 'fish',
])

export function ambientUsesSequence(state: Pick<AmbientState, 'activity' | 'phase' | 'standingSleep'>): boolean {
  if (state.standingSleep) return false
  if (state.phase === 'linger' || state.phase === 'speak' || state.phase === 'arrive') return false
  if (state.phase === 'walk') return true
  if (state.phase === 'sleep') return true
  if (state.phase === 'act') return SEQUENCE_ACTIVITIES.has(state.activity)
  return false
}

function withStill<T extends Omit<AmbientState, 'still'>>(state: T): T & { still: boolean } {
  return { ...state, still: !ambientUsesSequence(state) }
}
const TRAVEL_ACTIVITIES: AmbientActivity[] = ['walk', 'garden', 'camp', 'observe', 'water', 'fish', 'bench', 'tv']

type LinePair = { pt: string; en: string }

const LINES: Record<string, LinePair[]> = {
  chat: [
    { pt: 'Ei! Ainda estou por aqui se precisar de mim.', en: "Hey! I'm still around if you need me." },
    { pt: 'Que silêncio gostoso… Posso contar uma coisinha?', en: 'Such a cozy quiet… Want to hear something small?' },
    { pt: 'Estou de plantão no PDL. Qualquer dúvida, é só chamar!', en: "I'm on duty in PDL. Just call if you have a question!" },
  ],
  chat_sad: [
    { pt: 'Estou um pouco cabisbaixo… Mas fico feliz que você esteja aqui.', en: "I'm feeling a bit down… Still glad you're here." },
    { pt: 'Hoje o humor não está lá essas coisas. Quer conversar?', en: "I'm not in the best mood today. Want to talk?" },
  ],
  chat_joyful: [
    { pt: 'Estou radiando alegria! O dia está ótimo.', en: "I'm glowing with joy! What a great day." },
    { pt: 'Hi hi! Tô no clima de comemorar qualquer coisinha.', en: 'Hehe! Ready to celebrate the tiniest thing.' },
  ],
  snack_say: [
    { pt: 'Minha saciedade está baixa… hora de um lanchinho.', en: 'My satiety is low… snack time.' },
    { pt: 'Estou com fome de verdade. Vou até a cozinha!', en: "I'm really hungry. Heading to the kitchen!" },
  ],
  snack_act: [
    { pt: 'Nhac nhac… Isso ajuda meus pontos de saciedade!', en: 'Nom nom… That helps my satiety points!' },
    { pt: 'Pronto, me alimentei. Já me sinto melhor.', en: 'All fed. Feeling better already.' },
  ],
  play_say: [
    { pt: 'Estou precisando de alegria… vou jogar um pouco!', en: 'I need a happiness boost… quick match!' },
    { pt: 'Controle na mão… isso deve levantar meu humor.', en: 'Controller ready… this should lift my mood.' },
  ],
  play_act: [
    { pt: 'Boa! Isso aumentou minha alegria.', en: 'Nice! That boosted my happiness.' },
    { pt: 'Partida divertida. Me animou de verdade.', en: 'Fun match. That really cheered me up.' },
  ],
  dance_say: [
    { pt: 'Senti o ritmo! Dançar deve me deixar mais alegre.', en: 'I feel the beat! Dancing should make me happier.' },
    { pt: 'Música imaginária no ar… vem comigo!', en: 'Imaginary music in the air… dance with me!' },
  ],
  dance_act: [
    { pt: 'Ufa! Dançar cansa a energia, mas anima demais.', en: 'Whew! Dancing costs energy, but it feels great.' },
  ],
  bath_say: [
    { pt: 'Minha higiene pedindo socorro… hora do banho!', en: 'My hygiene needs help… bath time!' },
    { pt: 'Espuma e água quentinha… vou ficar limpinho.', en: 'Bubbles and warm water… getting squeaky clean.' },
  ],
  bath_act: [
    { pt: 'Ah, que refrescante! Higiene lá em cima.', en: 'Ahh, refreshing! Hygiene points up.' },
  ],
  walk_say: [
    { pt: 'Vou dar uma voltinha pela casa com calma.', en: "I'll take a calm stroll around the house." },
    { pt: 'Caminhar um pouco — sem pressa.', en: 'A short walk — no rush.' },
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
    { pt: 'Deixa eu pensar com calma antes da próxima coisa…', en: 'Let me think calmly before the next thing…' },
    { pt: 'Hmm… pausa para organizar as ideias.', en: 'Hmm… a pause to gather my thoughts.' },
  ],
  think_act: [
    { pt: 'Pensei, pensei… agora sim.', en: "I've thought it through… now I'm ready." },
  ],
  stretch_say: [
    { pt: 'Espreguiçar um pouquinho… aaah!', en: 'Just a little stretch… aaah!' },
    { pt: 'Tudo bem por aí? Estou aqui, de braços abertos.', en: 'Everything okay? Here I am, arms open.' },
  ],
  sleep_say: [
    { pt: 'Energia no fim… Vou até o quarto dormir direito.', en: 'Energy is low… Heading to bed properly.' },
    { pt: 'Boa noite! Preciso recuperar meus pontos de energia na cama.', en: 'Good night! I need to restore energy in bed.' },
  ],
  sleep_say_here: [
    { pt: 'Estou com sono… Vou descansar um pouco por aqui.', en: "I'm getting sleepy… I'll rest here for a bit." },
  ],
  nap_say: [
    { pt: 'Nossa, cansei… Vou cochilar em pé um minutinho.', en: "Wow, I'm tired… I'll nap on my feet for a minute." },
    { pt: 'Energia baixa. Cochilo rápido aqui mesmo, sem ir pra cama.', en: 'Low energy. Quick standing nap right here — no bed.' },
  ],
  sleep_arrive: [
    { pt: 'Cheguei no quarto. Boa noite!', en: 'Made it to the bedroom. Good night!' },
  ],
  sleep_act: [
    { pt: 'Dormindo na cama… recuperando energia. Zzz.', en: 'Sleeping in bed… restoring energy. Zzz.' },
  ],
  nap_act: [
    { pt: 'Cochilando em pé… cansado, mas recuperando um pouco. Zzz.', en: 'Napping on my feet… tired, but recovering a bit. Zzz.' },
  ],
  wake: [
    { pt: 'Acordei! Que soninho bom. E aí, precisa de algo?', en: 'I woke up! That was a nice nap. Need anything?' },
    { pt: 'Pronto, já estou de pé de novo!', en: "All set — I'm up again!" },
  ],
  garden_say: [
    { pt: 'Quero um tempo no jardim… ar fresco faz bem.', en: 'I want some garden time… fresh air helps.' },
    { pt: 'Vou até o jardim olhar as flores com calma.', en: "I'll head to the garden and watch the flowers." },
  ],
  garden_act: [
    { pt: 'Que paz no jardim… vou ficar um pouco aqui.', en: 'So peaceful in the garden… lingering here a while.' },
  ],
  camp_say: [
    { pt: 'Hora de um momento no acampamento, sob as estrelas.', en: 'Camp time — a moment under the stars.' },
    { pt: 'Vou pro quintal/acampamento respirar e olhar a fogueira.', en: 'Heading to camp to breathe and watch the fire.' },
  ],
  camp_act: [
    { pt: 'Fogueira, céu… que cantinho gostoso.', en: 'Campfire, sky… what a cozy spot.' },
  ],
  observe_say: [
    { pt: 'Vou pegar os binóculos e observar lá fora.', en: "I'll grab the binoculars and look around outside." },
  ],
  observe_act: [
    { pt: 'Dá para enxergar tão longe daqui!', en: 'I can see so far from here!' },
  ],
  water_say: [
    { pt: 'As plantinhas estão pedindo água.', en: 'The plants look ready for some water.' },
  ],
  water_act: [
    { pt: 'Pronto, plantinhas regadas com carinho.', en: 'There, the plants are happily watered.' },
  ],
  fish_say: [
    { pt: 'Vou preparar a vara para uma pescaria tranquila.', en: "I'll get the rod ready for some peaceful fishing." },
  ],
  fish_act: [
    { pt: 'Peguei um peixe! Que pescaria boa.', en: 'I caught one! What a nice fishing break.' },
  ],
  bench_say: [
    { pt: 'Vou descansar um pouco no banco do jardim.', en: "I'll rest for a while on the garden bench." },
  ],
  bench_act: [
    { pt: 'Nada como sentar e apreciar o jardim.', en: 'Nothing like sitting down and enjoying the garden.' },
  ],
  tv_say: [
    { pt: 'Hora de relaxar um pouco assistindo TV.', en: 'Time to relax and watch a little TV.' },
  ],
  tv_act: [
    { pt: 'Controle na mão e um programa divertido.', en: 'Remote in hand and something fun to watch.' },
  ],
  affection_say: [
    { pt: 'Estou precisando de carinho… mesmo sozinho, me aconchego.', en: 'I could use some affection… cuddling myself a bit.' },
    { pt: 'Um carinho interno pra levantar a alegria.', en: 'A little self-care hug to lift happiness.' },
  ],
  affection_act: [
    { pt: 'Assim fica melhor. Alegria subindo.', en: "That's better. Happiness going up." },
  ],
  pause_say: [
    { pt: '… Vou esperar um instante antes da próxima coisa.', en: "… I'll wait a moment before the next thing." },
    { pt: 'Pausa. Respirar. Sem pressa.', en: 'Pause. Breathe. No rush.' },
  ],
  linger: [
    { pt: 'Ficando quietinho um pouco…', en: 'Staying quiet for a bit…' },
    { pt: 'Só observando o ambiente com calma.', en: 'Just calmly watching the room.' },
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

function travelsToScene(activity: AmbientActivity): boolean {
  return TRAVEL_ACTIVITIES.includes(activity)
}

const defaultNeeds = (): AmbientNeeds => ({ satiety: 75, energy: 75, happiness: 75, hygiene: 75 })

/** Espelha as regras do backend para só pedir cuidado que rende efeito. */
export function canPerformCare(action: DenkynhoAction, needs: AmbientNeeds, canDance: boolean): boolean {
  if (action === 'dance' && !canDance) return false
  if (action === 'walk') return needs.energy >= 5
  if (action === 'play' && (needs.energy < 12 || needs.satiety < 8)) return false
  if (action === 'dance' && (needs.energy < 10 || needs.satiety < 5)) return false
  const target = action === 'feed' ? 'satiety'
    : action === 'sleep' ? 'energy'
      : action === 'bath' ? 'hygiene'
        : 'happiness'
  if (needs[target] >= 100) return false
  return true
}

export function careForActivity(activity: AmbientActivity): DenkynhoAction | null {
  if (activity === 'snack') return 'feed'
  if (activity === 'sleep' || activity === 'nap') return 'sleep'
  if (activity === 'play') return 'play'
  if (activity === 'bath') return 'bath'
  if (activity === 'walk' || activity === 'garden' || activity === 'camp') return 'walk'
  if (activity === 'dance') return 'dance'
  if (activity === 'affection') return 'care'
  return null
}

function resolveCare(activity: AmbientActivity, ctx: AmbientContext): DenkynhoAction | null {
  const care = careForActivity(activity)
  if (!care) return null
  return canPerformCare(care, ctx.needs ?? defaultNeeds(), ctx.canDance) ? care : null
}

function sceneFor(activity: AmbientActivity, unlocked: Set<SceneId>, current?: SceneId): SceneId | undefined {
  if (activity === 'snack' && hasScene(unlocked, 'kitchen')) return 'kitchen'
  if (activity === 'bath' && hasScene(unlocked, 'bathroom')) return 'bathroom'
  if (activity === 'play' && hasScene(unlocked, 'living-room')) return 'living-room'
  if (activity === 'play' && hasScene(unlocked, 'garden')) return 'garden'
  if (activity === 'think' && hasScene(unlocked, 'study')) return 'study'
  if (activity === 'sleep' && hasScene(unlocked, 'bedroom')) return 'bedroom'
  if (activity === 'dance' && hasScene(unlocked, 'living-room')) return 'living-room'
  if (activity === 'garden' && hasScene(unlocked, 'garden')) return 'garden'
  if (activity === 'camp' && hasScene(unlocked, 'camp')) return 'camp'
  if (activity === 'observe' && hasScene(unlocked, 'garden')) return 'garden'
  if (activity === 'observe' && hasScene(unlocked, 'camp')) return 'camp'
  if ((activity === 'water' || activity === 'bench') && hasScene(unlocked, 'garden')) return 'garden'
  if (activity === 'fish' && hasScene(unlocked, 'camp')) return 'camp'
  if (activity === 'tv' && hasScene(unlocked, 'living-room')) return 'living-room'
  if (activity === 'nap') return current
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

function outdoorRoute(target: SceneId, current: string | undefined, unlocked: string[]): SceneId[] {
  const start = knownScene(current)
  const available = new Set(unlocked.map(knownScene).filter((id): id is SceneId => Boolean(id)))
  if (!available.has(target)) return start ? [start] : []
  if (!start || start === target) return [target]
  return [start, target]
}

/** Prioriza o que os atributos pedem (fome, sono, higiene, alegria). */
export function neededActivities(needs: AmbientNeeds, ctx: AmbientContext): AmbientActivity[] {
  const unlocked = new Set(ctx.unlockedScenes.map(knownScene).filter((id): id is SceneId => Boolean(id)))
  const out: AmbientActivity[] = []
  const push = (activity: AmbientActivity) => {
    const care = careForActivity(activity)
    if (care && !canPerformCare(care, needs, ctx.canDance)) return
    if (!out.includes(activity)) out.push(activity)
  }

  if (needs.energy < NEED_HARD) {
    if (hasScene(unlocked, 'bedroom') && canPerformCare('sleep', needs, ctx.canDance)) push('sleep')
    else if (canPerformCare('sleep', needs, ctx.canDance)) push('nap')
  } else if (needs.energy < NEED_SOFT && canPerformCare('sleep', needs, ctx.canDance)) {
    push(roll(ctx.random ?? Math.random) < 0.55 ? 'nap' : (hasScene(unlocked, 'bedroom') ? 'sleep' : 'nap'))
  }
  if (needs.satiety < NEED_SOFT) push('snack')
  if (needs.hygiene < NEED_SOFT) push('bath')
  if (needs.happiness < NEED_SOFT) {
    if (canPerformCare('care', needs, ctx.canDance)) push('affection')
    if (canPerformCare('play', needs, ctx.canDance)) push('play')
  }
  return out
}

function emotionFlavor(ctx: AmbientContext, random: () => number): AmbientActivity[] {
  const id = ctx.emotionId
  if (id === 'sad' || id === 'frustrated') return ['chat', 'affection', 'think']
  if (id === 'joyful' || id === 'amused') {
    const list: AmbientActivity[] = ['laugh', 'garden']
    if (ctx.canDance) list.splice(1, 0, 'dance')
    return list
  }
  if (id === 'sleepy') return ['nap', 'think']
  if (id === 'confused') return ['think', 'chat']
  return roll(random) < 0.5 ? ['chat'] : ['stretch']
}

function outdoorPick(ctx: AmbientContext, unlocked: Set<SceneId>, random: () => number): AmbientActivity | null {
  const options: AmbientActivity[] = []
  if (hasScene(unlocked, 'garden')) options.push('garden')
  if (hasScene(unlocked, 'camp')) options.push('camp')
  if (!options.length) return null
  if (ctx.emotionId === 'sad' && roll(random) < 0.35) return options[0]!
  if (ctx.emotionId === 'joyful' || roll(random) < 0.55) {
    return options[Math.min(options.length - 1, Math.floor(roll(random) * options.length))]!
  }
  return null
}

function withBreathingRoom(acts: AmbientActivity[], random: () => number): AmbientActivity[] {
  const result: AmbientActivity[] = []
  for (const activity of acts) {
    if (result.length) {
      result.push(roll(random) < 0.5 ? 'think' : 'chat')
      result.push('pause')
    }
    result.push(activity)
  }
  return result
}

/** Monta o dia: necessidades primeiro, depois humor, ar livre e pausas. */
export function buildLifePlan(ctx: AmbientContext): AmbientActivity[] {
  const random = ctx.random ?? Math.random
  const needs = ctx.needs ?? defaultNeeds()
  const unlocked = new Set(ctx.unlockedScenes.map(knownScene).filter((id): id is SceneId => Boolean(id)))
  const urgent = neededActivities(needs, ctx)
  const flavor = emotionFlavor(ctx, random).filter(activity => {
    const care = careForActivity(activity)
    return !care || canPerformCare(care, needs, ctx.canDance)
  })
  const outdoor = outdoorPick(ctx, unlocked, random)
  const lifestyle: AmbientActivity[] = []
  if (hasScene(unlocked, 'garden')) lifestyle.push('observe', 'water', 'bench')
  if (hasScene(unlocked, 'camp')) lifestyle.push('observe', 'fish')
  if (hasScene(unlocked, 'living-room')) lifestyle.push('tv')
  const fillers = shuffle(
    ([...new Set<AmbientActivity>(['laugh', 'stretch', 'walk', 'think', 'chat', ...lifestyle])]).filter(activity => {
      if (activity === 'walk') return canPerformCare('walk', needs, ctx.canDance)
      return true
    }),
    random,
  ).slice(0, 1 + Math.floor(roll(random) * 2))

  let plan = withBreathingRoom([...urgent, ...flavor.slice(0, 1), ...fillers], random)
  if (outdoor && !plan.includes(outdoor)) {
    const insertAt = Math.min(plan.length, 1 + Math.floor(roll(random) * Math.max(1, plan.length)))
    plan = [...plan.slice(0, insertAt), 'pause', outdoor, ...plan.slice(insertAt)]
  }
  if (!plan.length) plan = ['chat', 'pause', 'think']
  return plan.slice(0, 8)
}

function poseForAct(activity: AmbientActivity): string {
  if (activity === 'snack') return '11-comendo'
  if (activity === 'play') return '12-jogando'
  if (activity === 'dance') return '13-dancando'
  if (activity === 'bath') return '15-banho'
  if (activity === 'laugh') return '06-rindo'
  if (activity === 'think' || activity === 'pause') return '03-pensando'
  if (activity === 'affection') return '14-carinho'
  if (activity === 'observe') return '17-observando'
  if (activity === 'water') return '18-regando'
  if (activity === 'fish') return '19-pescando'
  if (activity === 'bench') return '20-sentado-banco'
  if (activity === 'tv') return '21-assistindo-tv'
  if (activity === 'stretch' || activity === 'chat') return '01-boas-vindas'
  if (activity === 'walk' || activity === 'garden' || activity === 'camp') return '16-andando'
  return '05-dormindo'
}

function emotionPose(emotionId: string | undefined): string | undefined {
  if (emotionId === 'sad') return '07-triste'
  if (emotionId === 'joyful') return '02-sucesso'
  if (emotionId === 'amused') return '06-rindo'
  if (emotionId === 'sleepy') return '05-dormindo'
  if (emotionId === 'surprised') return '08-surpreso'
  if (emotionId === 'confused') return '09-confuso'
  if (emotionId === 'frustrated') return '10-frustrado'
  return undefined
}

function announcePose(activity: AmbientActivity, emotionId?: string): string {
  if (activity === 'think' || activity === 'pause') return '03-pensando'
  if (activity === 'laugh') return '06-rindo'
  if (activity === 'affection') return '14-carinho'
  if (activity === 'chat') return emotionPose(emotionId) ?? '01-boas-vindas'
  return '01-boas-vindas'
}

function announceKey(activity: AmbientActivity, useBed: boolean, emotionId?: string): string {
  if (activity === 'snack') return 'snack_say'
  if (activity === 'play') return 'play_say'
  if (activity === 'dance') return 'dance_say'
  if (activity === 'bath') return 'bath_say'
  if (activity === 'walk') return 'walk_say'
  if (activity === 'laugh') return 'laugh_say'
  if (activity === 'think') return 'think_say'
  if (activity === 'stretch') return 'stretch_say'
  if (activity === 'garden') return 'garden_say'
  if (activity === 'camp') return 'camp_say'
  if (activity === 'observe') return 'observe_say'
  if (activity === 'water') return 'water_say'
  if (activity === 'fish') return 'fish_say'
  if (activity === 'bench') return 'bench_say'
  if (activity === 'tv') return 'tv_say'
  if (activity === 'affection') return 'affection_say'
  if (activity === 'pause') return 'pause_say'
  if (activity === 'nap') return 'nap_say'
  if (activity === 'sleep') return useBed ? 'sleep_say' : 'sleep_say_here'
  if (activity === 'chat' && (emotionId === 'sad' || emotionId === 'frustrated')) return 'chat_sad'
  if (activity === 'chat' && (emotionId === 'joyful' || emotionId === 'amused')) return 'chat_joyful'
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
  if (activity === 'garden') return 'garden_act'
  if (activity === 'camp') return 'camp_act'
  if (activity === 'observe') return 'observe_act'
  if (activity === 'water') return 'water_act'
  if (activity === 'fish') return 'fish_act'
  if (activity === 'bench') return 'bench_act'
  if (activity === 'tv') return 'tv_act'
  if (activity === 'affection') return 'affection_act'
  if (activity === 'nap') return 'nap_act'
  if (activity === 'sleep') return 'sleep_act'
  if (activity === 'pause') return 'linger'
  return 'chat'
}

function beginActivity(activity: AmbientActivity, plan: AmbientActivity[], planIndex: number, ctx: AmbientContext): AmbientState {
  const random = ctx.random ?? Math.random
  const unlocked = new Set(ctx.unlockedScenes.map(knownScene).filter((id): id is SceneId => Boolean(id)))
  const current = knownScene(ctx.currentScene)
  const useBed = activity === 'sleep' && hasScene(unlocked, 'bedroom')
  const target = sceneFor(activity, unlocked, current)
  const route = activity === 'sleep' && useBed
    ? buildIdleRoute(ctx.currentScene, ctx.unlockedScenes)
    : activity === 'walk'
      ? walkRoute(ctx.currentScene, ctx.unlockedScenes)
      : activity === 'garden'
        ? outdoorRoute('garden', ctx.currentScene, ctx.unlockedScenes)
        : activity === 'camp'
          ? outdoorRoute('camp', ctx.currentScene, ctx.unlockedScenes)
          : travelsToScene(activity) && target
            ? outdoorRoute(target, ctx.currentScene, ctx.unlockedScenes)
            : []
  const usesRoute = (activity === 'sleep' && useBed) || travelsToScene(activity)
  const scene = usesRoute
    ? route[0] ?? sceneFor(activity, unlocked, current)
    : sceneFor(activity, unlocked, current)
  const pose = announcePose(activity, ctx.emotionId)
  const line = pickLine(announceKey(activity, useBed, ctx.emotionId), ctx.language, random)
  return withStill({
    activity,
    phase: 'speak',
    line,
    pose,
    scene,
    talking: true,
    useBed,
    dancing: false,
    standingSleep: false,
    careAction: resolveCare(activity, ctx),
    plan,
    planIndex,
    route,
    routeIndex: 0,
  })
}

export function startAmbient(ctx: AmbientContext): AmbientState {
  const plan = buildLifePlan(ctx)
  return beginActivity(plan[0]!, plan, 0, ctx)
}

/** Inicia a vida ambient com um plano fixo (testes e demos). */
export function startAmbientPlan(plan: AmbientActivity[], ctx: AmbientContext): AmbientState {
  const safe: AmbientActivity[] = plan.length ? plan : ['chat']
  return beginActivity(safe[0]!, safe, 0, ctx)
}

/** Estima a duração da fala ambient com a mesma cadência do chat. */
export function estimateSpeechMs(line: string, pose: string, animated: boolean): number {
  if (!animated) return 1_600 + IDLE_SPEAK_HOLD_MS
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
  if (state.phase === 'linger') return state.activity === 'garden' || state.activity === 'camp' ? IDLE_OUTDOOR_MS : IDLE_LINGER_MS
  if (state.phase === 'sleep') return IDLE_SLEEP_MS
  if (state.activity === 'dance') return IDLE_DANCE_MS
  if (state.activity === 'garden' || state.activity === 'camp') return IDLE_OUTDOOR_MS
  if (state.activity === 'chat' || state.activity === 'stretch' || state.activity === 'pause') return IDLE_LINGER_MS
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

function enterLinger(state: AmbientState, ctx: AmbientContext): AmbientState {
  const random = ctx.random ?? Math.random
  return withStill({
    ...state,
    phase: 'linger',
    pose: '01-boas-vindas',
    line: pickLine('linger', ctx.language, random),
    talking: false,
    dancing: false,
    standingSleep: false,
  })
}

function enterAct(state: AmbientState, ctx: AmbientContext): AmbientState {
  const random = ctx.random ?? Math.random
  return withStill({
    ...state,
    phase: 'act',
    pose: poseForAct(state.activity),
    line: pickLine(actLineKey(state.activity), ctx.language, random),
    talking: false,
    dancing: state.activity === 'dance',
    standingSleep: false,
    useBed: false,
    careAction: resolveCare(state.activity, ctx),
  })
}

function enterSleep(state: AmbientState, ctx: AmbientContext, standing: boolean, scene?: SceneId): AmbientState {
  const random = ctx.random ?? Math.random
  return withStill({
    ...state,
    phase: 'sleep',
    scene,
    pose: '05-dormindo',
    line: pickLine(standing ? 'nap_act' : 'sleep_act', ctx.language, random),
    talking: false,
    dancing: false,
    standingSleep: standing,
    useBed: !standing,
    careAction: resolveCare(standing ? 'nap' : 'sleep', ctx),
  })
}

/** Avança a vida ambient; nunca termina sozinha — dorme, acorda e segue vivendo. */
export function advanceAmbient(state: AmbientState, ctx: AmbientContext): AmbientState {
  const random = ctx.random ?? Math.random

  if (state.phase === 'speak') {
    if (state.activity === 'nap') {
      return enterSleep(state, ctx, true, state.scene)
    }

    if (state.activity === 'sleep') {
      if (!state.useBed || ctx.reducedMotion || state.route.length <= 1) {
        return enterSleep(state, ctx, !state.useBed, state.useBed ? 'bedroom' : state.scene)
      }
      const routeIndex = Math.min(1, state.route.length - 1)
      const scene = state.route[routeIndex]!
      if (scene === 'bedroom' && routeIndex === state.route.length - 1) {
        return withStill({
          ...state,
          phase: 'arrive',
          routeIndex,
          scene,
          pose: '01-boas-vindas',
          line: pickLine('sleep_arrive', ctx.language, random),
          talking: true,
          dancing: false,
          standingSleep: false,
        })
      }
      return withStill({
        ...state,
        phase: 'walk',
        routeIndex,
        scene,
        pose: '16-andando',
        line: pickLine('walk_act', ctx.language, random),
        talking: false,
        dancing: false,
        standingSleep: false,
      })
    }

    if (travelsToScene(state.activity)) {
      if (ctx.reducedMotion || state.route.length <= 1) {
        return enterAct({ ...state, scene: state.route[state.route.length - 1] ?? state.scene }, ctx)
      }
      const routeIndex = Math.min(1, state.route.length - 1)
      return withStill({
        ...state,
        phase: 'walk',
        routeIndex,
        scene: state.route[routeIndex],
        pose: '16-andando',
        line: pickLine('walk_act', ctx.language, random),
        talking: false,
        dancing: false,
        standingSleep: false,
      })
    }

    if (state.activity === 'chat' || state.activity === 'stretch' || state.activity === 'pause') {
      return enterLinger(state, ctx)
    }

    if (state.activity === 'think') {
      return enterAct(state, ctx)
    }

    return enterAct(state, ctx)
  }

  if (state.phase === 'walk') {
    const routeIndex = state.routeIndex + 1
    if (routeIndex >= state.route.length) {
      if (state.activity === 'sleep') return enterSleep(state, ctx, false, 'bedroom')
      return enterAct(state, ctx)
    }
    const scene = state.route[routeIndex]!
    if (state.activity === 'sleep' && scene === 'bedroom' && routeIndex === state.route.length - 1) {
      return withStill({
        ...state,
        phase: 'arrive',
        routeIndex,
        scene,
        pose: '01-boas-vindas',
        line: pickLine('sleep_arrive', ctx.language, random),
        talking: true,
        dancing: false,
        standingSleep: false,
      })
    }
    return withStill({
      ...state,
      phase: 'walk',
      routeIndex,
      scene,
      pose: '16-andando',
      line: pickLine('walk_act', ctx.language, random),
      talking: false,
      dancing: false,
      standingSleep: false,
    })
  }

  if (state.phase === 'arrive') return enterSleep(state, ctx, false, 'bedroom')

  if (state.phase === 'sleep') {
    const rest = state.plan.slice(state.planIndex + 1)
    const plan = rest.length ? rest : buildLifePlan(ctx)
    const next = beginActivity(plan[0]!, plan, 0, ctx)
    return withStill({
      ...next,
      line: pickLine('wake', ctx.language, random),
      pose: '01-boas-vindas',
      phase: 'speak',
      talking: true,
      dancing: false,
      standingSleep: false,
      useBed: false,
    })
  }

  if (state.phase === 'act') return enterLinger(state, ctx)

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
