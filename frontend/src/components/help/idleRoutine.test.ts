// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  advanceAmbient,
  ambientDuration,
  ambientPose,
  buildIdleRoute,
  buildLifePlan,
  estimateSpeechMs,
  startAmbient,
  startAmbientPlan,
  type AmbientContext,
} from './idleRoutine'

const base = (over: Partial<AmbientContext> = {}): AmbientContext => ({
  language: 'pt',
  currentScene: 'living-room',
  unlockedScenes: ['living-room', 'kitchen', 'bathroom', 'bedroom'],
  canDance: true,
  reducedMotion: false,
  random: () => 0,
  ...over,
})

describe('buildIdleRoute', () => {
  it('vai da sala ao quarto quando ambos estão desbloqueados', () => {
    expect(buildIdleRoute('living-room', ['living-room', 'bedroom'])).toEqual(['living-room', 'bedroom'])
  })

  it('não força o quarto se ele não estiver desbloqueado', () => {
    expect(buildIdleRoute('living-room', ['living-room', 'kitchen'])).toEqual(['living-room', 'kitchen'])
  })
})

describe('buildLifePlan', () => {
  it('monta vários episódios e pode incluir dormir sem ser só isso', () => {
    const plan = buildLifePlan(base())
    expect(plan.length).toBeGreaterThanOrEqual(3)
    expect(plan.some(item => item !== 'sleep')).toBe(true)
  })

  it('omite dança quando ela não está disponível', () => {
    const plan = buildLifePlan(base({ canDance: false, random: () => 0.99 }))
    expect(plan.includes('dance')).toBe(false)
  })
})

describe('vida ambient', () => {
  it('fala de verdade no anúncio e depois age (lanche)', () => {
    let state = startAmbientPlan(['snack'], base())
    expect(state.phase).toBe('speak')
    expect(state.talking).toBe(true)
    expect(state.line.length).toBeGreaterThan(8)
    expect(ambientPose(state)).toBe('01-boas-vindas')
    expect(ambientDuration(state, true)).toBe(estimateSpeechMs(state.line, state.pose, true))

    state = advanceAmbient(state, base())
    expect(state.phase).toBe('act')
    expect(state.talking).toBe(false)
    expect(state.pose).toBe('11-comendo')
    expect(state.scene).toBe('kitchen')
  })

  it('percorre chat, brincadeira e dança em sequência', () => {
    let state = startAmbientPlan(['chat', 'play', 'dance'], base())
    expect(state.activity).toBe('chat')
    expect(state.talking).toBe(true)
    state = advanceAmbient(state, base())
    expect(state.activity).toBe('play')
    expect(state.talking).toBe(true)
    state = advanceAmbient(state, base())
    expect(state.phase).toBe('act')
    expect(state.pose).toBe('12-jogando')
    state = advanceAmbient(state, base())
    expect(state.activity).toBe('dance')
    state = advanceAmbient(state, base())
    expect(state.dancing).toBe(true)
    expect(state.pose).toBe('13-dancando')
  })

  it('dormir é um episódio: caminha, deita, acorda e segue vivendo', () => {
    let state = startAmbientPlan(['sleep', 'laugh'], base())
    expect(state.talking).toBe(true)
    expect(state.line).toMatch(/sono|quarto|Boa noite|sleepy|room|night/i)

    state = advanceAmbient(state, base())
    expect(state.phase === 'walk' || state.phase === 'arrive').toBe(true)
    expect(state.pose).toBe('16-andando')

    while (state.phase !== 'sleep') {
      state = advanceAmbient(state, base())
    }
    expect(state.useBed).toBe(true)
    expect(state.standingSleep).toBe(false)
    expect(state.talking).toBe(false)

    state = advanceAmbient(state, base())
    expect(state.phase).toBe('speak')
    expect(state.talking).toBe(true)
    expect(state.line).toMatch(/Acordei|Pronto|woke|up again/i)
  })

  it('sem quarto dorme em pé e com movimento reduzido pula a andança', () => {
    let state = startAmbientPlan(['sleep'], base({
      unlockedScenes: ['living-room', 'kitchen'],
      reducedMotion: true,
    }))
    state = advanceAmbient(state, base({ unlockedScenes: ['living-room', 'kitchen'], reducedMotion: true }))
    expect(state.phase).toBe('sleep')
    expect(state.standingSleep).toBe(true)
    expect(state.useBed).toBe(false)
  })

  it('startAmbient usa o plano gerado', () => {
    const state = startAmbient(base())
    expect(state.plan.length).toBeGreaterThan(0)
    expect(state.phase).toBe('speak')
    expect(state.talking).toBe(true)
  })
})
