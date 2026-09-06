// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  advanceAmbient,
  ambientDuration,
  ambientPose,
  buildIdleRoute,
  idleLine,
  IDLE_SPEAK_MS,
  IDLE_WALK_MS,
  startAmbient,
} from './idleRoutine'

describe('buildIdleRoute', () => {
  it('vai da sala ao quarto quando ambos estão desbloqueados', () => {
    expect(buildIdleRoute('living-room', ['living-room', 'bedroom'])).toEqual(['living-room', 'bedroom'])
  })

  it('inclui a cena atual e termina no quarto', () => {
    expect(buildIdleRoute('garden', ['garden', 'living-room', 'kitchen', 'bedroom'])).toEqual([
      'garden', 'living-room', 'kitchen', 'bedroom',
    ])
  })

  it('não força o quarto se ele não estiver desbloqueado', () => {
    expect(buildIdleRoute('living-room', ['living-room', 'kitchen'])).toEqual(['living-room', 'kitchen'])
    expect(buildIdleRoute('garden', ['garden'])).toEqual(['garden'])
  })

  it('ignora cenários desconhecidos', () => {
    expect(buildIdleRoute('hack', ['hack', 'bedroom'])).toEqual(['bedroom'])
  })
})

describe('advanceAmbient', () => {
  it('após falar caminha e dorme na cama ao chegar no quarto', () => {
    let state = startAmbient(['living-room', 'bedroom'], 'pt')
    expect(state.phase).toBe('speak')
    expect(ambientPose(state)).toBe('01-boas-vindas')
    expect(ambientDuration(state.phase)).toBe(IDLE_SPEAK_MS)

    state = advanceAmbient(state, 'pt', false)!
    expect(state.phase).toBe('bedroom')
    expect(state.scene).toBe('bedroom')
    expect(ambientPose(state)).toBe('16-andando')

    state = advanceAmbient(state, 'pt', false)!
    expect(state.phase).toBe('sleep')
    expect(state.useBed).toBe(true)
    expect(state.scene).toBe('bedroom')
    expect(ambientPose(state)).toBe('05-dormindo')
    expect(advanceAmbient(state, 'pt', false)).toBeNull()
  })

  it('com movimento reduzido pula a caminhada e dorme', () => {
    let state = startAmbient(['living-room', 'kitchen', 'bedroom'], 'en')
    state = advanceAmbient(state, 'en', true)!
    expect(state.phase).toBe('sleep')
    expect(state.scene).toBe('bedroom')
    expect(state.line).toBe(idleLine('sleep', 'en', true))
  })

  it('sem quarto dorme em pé após um trecho andando', () => {
    let state = startAmbient(['living-room', 'kitchen'], 'pt')
    state = advanceAmbient(state, 'pt', false)!
    expect(state.phase).toBe('walk')
    expect(state.scene).toBe('kitchen')
    expect(ambientDuration(state.phase)).toBe(IDLE_WALK_MS)
    state = advanceAmbient(state, 'pt', false)!
    expect(state.phase).toBe('sleep')
    expect(state.useBed).toBe(false)
  })
})
