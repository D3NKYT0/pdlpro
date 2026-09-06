// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { starPinOccludesChest, starPinVisible } from './starPin'

describe('starPinVisible', () => {
  it('mostra o broche no peito nas poses em pé com peito livre', () => {
    expect(starPinVisible('01-boas-vindas')).toBe(true)
    expect(starPinVisible('02-sucesso')).toBe(true)
    expect(starPinVisible('04-dica')).toBe(true)
    expect(starPinVisible('07-triste')).toBe(true)
    expect(starPinVisible('08-surpreso')).toBe(true)
    expect(starPinVisible('09-confuso')).toBe(true)
  })

  it('esconde quando a mão ou o braço cobre o peito', () => {
    expect(starPinOccludesChest('03-pensando')).toBe(true)
    expect(starPinOccludesChest('10-frustrado')).toBe(true)
    expect(starPinVisible('03-pensando')).toBe(false)
    expect(starPinVisible('10-frustrado')).toBe(false)
  })

  it('esconde em atlas/atividade e quando a sequência está ativa', () => {
    expect(starPinVisible('11-comendo')).toBe(false)
    expect(starPinVisible('14-carinho')).toBe(false)
    expect(starPinVisible('05-dormindo')).toBe(false)
    expect(starPinVisible('01-boas-vindas', true)).toBe(false)
  })
})
