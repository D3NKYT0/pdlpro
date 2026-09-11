import { describe, expect, it } from 'vitest'
import { inferBoxRarity, monsterHue } from './gameArt'

describe('inferBoxRarity', () => {
  it('lê a raridade no nome editorial, com ou sem acento', () => {
    expect(inferBoxRarity('Caixa rara')).toBe('rare')
    expect(inferBoxRarity('Baú Épico')).toBe('epic')
    expect(inferBoxRarity('Legendary crate')).toBe('legendary')
    expect(inferBoxRarity('Comum')).toBe('common')
  })

  it('usa o preço quando o nome não declara raridade', () => {
    expect(inferBoxRarity('Baú do reino', '12')).toBe('common')
    expect(inferBoxRarity('Baú do reino', '20')).toBe('rare')
    expect(inferBoxRarity('Baú do reino', '40')).toBe('epic')
    expect(inferBoxRarity('Baú do reino', '80')).toBe('legendary')
  })
})

it('varia o tom do monstro a partir do id', () => {
  expect(monsterHue('orc')).not.toBe(monsterHue('troll'))
  expect(monsterHue('orc')).toBe(monsterHue('orc'))
})
