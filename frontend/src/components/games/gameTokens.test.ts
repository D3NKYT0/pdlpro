import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { latestGameTokens, writeCachedTokens } from './gameTokens'

describe('latestGameTokens', () => {
  it('escolhe o saldo mais recente entre as APIs da central', () => {
    expect(
      latestGameTokens([
        { fichas: 40, updatedAt: 10 },
        { fichas: 39, updatedAt: 20 },
        { fichas: 12, updatedAt: 5 },
      ]),
    ).toBe(39)
  })

  it('ignora fontes sem fichas e devolve indefinido se ninguém tiver saldo', () => {
    expect(latestGameTokens([{ updatedAt: 1 }, null, { fichas: Number.NaN }])).toBeUndefined()
  })
})

it('replica o saldo em todos os caches de jogo que já têm fichas', () => {
  const client = new QueryClient()
  client.setQueryData(['roulette'], { fichas: 40, cost: 1 })
  client.setQueryData(['economy'], { fichas: 40, weapon: { level: 3 } })
  client.setQueryData(['fishing', 'pt'], { fichas: 40, active: true })
  client.setQueryData(['boxes'], { types: [], boxes: [] })
  writeCachedTokens(client, 39)
  expect(client.getQueryData(['roulette'])).toMatchObject({ fichas: 39 })
  expect(client.getQueryData(['economy'])).toMatchObject({ fichas: 39 })
  expect(client.getQueryData(['fishing', 'pt'])).toMatchObject({ fichas: 39 })
  expect(client.getQueryData(['boxes'])).toEqual({ types: [], boxes: [] })
})
