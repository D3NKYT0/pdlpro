// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  advanceAmbient,
  ambientDuration,
  ambientPose,
  buildIdleRoute,
  buildLifePlan,
  canPerformCare,
  careForActivity,
  estimateSpeechMs,
  neededActivities,
  startAmbient,
  startAmbientPlan,
  type AmbientContext,
} from './idleRoutine'

const base = (over: Partial<AmbientContext> = {}): AmbientContext => ({
  language: 'pt',
  currentScene: 'living-room',
  unlockedScenes: ['living-room', 'kitchen', 'bathroom', 'bedroom', 'garden', 'camp'],
  canDance: true,
  reducedMotion: false,
  needs: { satiety: 75, energy: 75, happiness: 75, hygiene: 75 },
  random: () => 0,
  ...over,
})

describe('buildIdleRoute', () => {
  it('vai da sala ao quarto quando ambos estão desbloqueados', () => {
    expect(buildIdleRoute('living-room', ['living-room', 'bedroom'])).toEqual(['living-room', 'bedroom'])
  })
})

describe('necessidades e cuidado', () => {
  it('prioriza fome, sono e higiene baixos', () => {
    expect(neededActivities({ satiety: 10, energy: 80, happiness: 80, hygiene: 80 }, base())).toContain('snack')
    expect(neededActivities({ satiety: 80, energy: 10, happiness: 80, hygiene: 80 }, base())).toEqual(expect.arrayContaining(['sleep']))
    expect(neededActivities({ satiety: 80, energy: 40, happiness: 80, hygiene: 80 }, base({ random: () => 0 }))).toContain('nap')
    expect(neededActivities({ satiety: 80, energy: 80, happiness: 80, hygiene: 10 }, base())).toContain('bath')
  })

  it('mapeia episódios para ações que rendem pontos', () => {
    expect(careForActivity('snack')).toBe('feed')
    expect(careForActivity('nap')).toBe('sleep')
    expect(careForActivity('garden')).toBe('walk')
    expect(careForActivity('affection')).toBe('care')
    expect(canPerformCare('feed', { satiety: 100, energy: 50, happiness: 50, hygiene: 50 }, true)).toBe(false)
    expect(canPerformCare('walk', { satiety: 50, energy: 3, happiness: 50, hygiene: 50 }, true)).toBe(false)
  })

  it('inclui jardim ou acampamento quando desbloqueados', () => {
    const plan = buildLifePlan(base({ emotionId: 'joyful', random: () => 0.1 }))
    expect(plan.some(item => item === 'garden' || item === 'camp')).toBe(true)
  })
})

describe('vida ambient', () => {
  it('fala, age, demora no linger e só então segue', () => {
    let state = startAmbientPlan(['snack'], base({ needs: { satiety: 20, energy: 80, happiness: 80, hygiene: 80 } }))
    expect(state.phase).toBe('speak')
    expect(state.talking).toBe(true)
    expect(state.careAction).toBe('feed')
    expect(ambientDuration(state, true)).toBe(estimateSpeechMs(state.line, state.pose, true))

    state = advanceAmbient(state, base())
    expect(state.phase).toBe('act')
    expect(state.pose).toBe('11-comendo')
    expect(state.scene).toBe('kitchen')

    state = advanceAmbient(state, base())
    expect(state.phase).toBe('linger')
    expect(state.still).toBe(true)
    expect(ambientPose(state)).toBe('01-boas-vindas')
  })

  it('pausa e pensamento ficam estáticos; lanche usa sequência', () => {
    let pause = startAmbientPlan(['pause'], base())
    expect(pause.still).toBe(true)
    pause = advanceAmbient(pause, base())
    expect(pause.phase).toBe('linger')
    expect(pause.still).toBe(true)

    let snack = startAmbientPlan(['snack'], base({ needs: { satiety: 20, energy: 80, happiness: 80, hygiene: 80 } }))
    snack = advanceAmbient(snack, base())
    expect(snack.phase).toBe('act')
    expect(snack.still).toBe(false)
  })

  it('cochila em pé quando cansado (nap) e dorme na cama no sleep', () => {
    let nap = startAmbientPlan(['nap'], base({ needs: { satiety: 80, energy: 30, happiness: 80, hygiene: 80 } }))
    nap = advanceAmbient(nap, base())
    expect(nap.phase).toBe('sleep')
    expect(nap.standingSleep).toBe(true)
    expect(nap.useBed).toBe(false)
    expect(nap.careAction).toBe('sleep')

    let bed = startAmbientPlan(['sleep'], base())
    bed = advanceAmbient(bed, base())
    while (bed.phase !== 'sleep') bed = advanceAmbient(bed, base())
    expect(bed.useBed).toBe(true)
    expect(bed.standingSleep).toBe(false)
  })

  it('vai ao jardim e permanece lá', () => {
    let state = startAmbientPlan(['garden'], base())
    expect(state.line).toMatch(/jardim|garden|flores|flowers/i)
    state = advanceAmbient(state, base())
    expect(state.phase === 'walk' || state.phase === 'act').toBe(true)
    while (state.phase !== 'act' && state.phase !== 'linger') {
      state = advanceAmbient(state, base())
    }
    if (state.phase === 'act') {
      expect(state.scene).toBe('garden')
      state = advanceAmbient(state, base())
    }
    expect(state.phase).toBe('linger')
  })

  it.each([
    ['observe', '17-observando', 'garden'],
    ['water', '18-regando', 'garden'],
    ['fish', '19-pescando', 'camp'],
    ['bench', '20-sentado-banco', 'garden'],
    ['tv', '21-assistindo-tv', 'living-room'],
  ] as const)('usa o sprite e o cenário da atividade %s', (activity, pose, scene) => {
    let state = startAmbientPlan([activity], base())
    for (let step = 0; step < 5 && state.phase !== 'act'; step += 1) {
      state = advanceAmbient(state, base())
    }
    expect(state.phase).toBe('act')
    expect(state.pose).toBe(pose)
    expect(state.scene).toBe(scene)
    expect(state.careAction).toBeNull()
  })

  it('usa falas tristes quando o humor pede', () => {
    const state = startAmbientPlan(['chat'], base({ emotionId: 'sad' }))
    expect(state.pose).toBe('07-triste')
    expect(state.line).toMatch(/cabisbaixo|humor|down|mood/i)
  })

  it('startAmbient usa necessidades do contexto', () => {
    const state = startAmbient(base({ needs: { satiety: 8, energy: 80, happiness: 80, hygiene: 80 }, random: () => 0 }))
    expect(state.plan).toContain('snack')
    expect(state.phase).toBe('speak')
  })
})
