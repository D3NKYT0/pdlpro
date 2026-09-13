import type { QueryClient } from '@tanstack/react-query'

/** Queries que carregam `fichas` e alimentam o contador da central de jogos. */
export const GAME_TOKEN_QUERY_KEYS = [
  ['roulette'],
  ['minigames'],
  ['economy'],
  ['boxes'],
  ['fishing'],
  ['fishing-details'],
] as const

type TokenHolder = { fichas: number }

function hasFichas(value: unknown): value is TokenHolder {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'fichas' in value &&
      Number.isFinite((value as TokenHolder).fichas),
  )
}

/** Replica o saldo em todos os caches de jogo para o hero não depender de F5. */
export function writeCachedTokens(client: QueryClient, fichas: number) {
  if (!Number.isFinite(fichas) || fichas < 0) return
  const next = Math.trunc(fichas)
  for (const queryKey of GAME_TOKEN_QUERY_KEYS) {
    client.setQueriesData({ queryKey }, (current) => {
      if (!hasFichas(current) || current.fichas === next) return current
      return { ...current, fichas: next }
    })
  }
}

/** Prefere o `fichas` mais recente entre as APIs da central. */
export function latestGameTokens(
  sources: Array<{ fichas?: number; updatedAt?: number } | null | undefined>,
) {
  let picked: { fichas: number; at: number } | undefined
  for (const source of sources) {
    if (source?.fichas == null || !Number.isFinite(source.fichas)) continue
    const at = source.updatedAt ?? 0
    if (!picked || at >= picked.at) picked = { fichas: source.fichas, at }
  }
  return picked?.fichas
}
