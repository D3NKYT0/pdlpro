import type { QueryClient } from '@tanstack/react-query'

/** Atualiza os catálogos afetados após alterar configurações ou conteúdo dos jogos. */
export async function refreshGameCatalog(client: QueryClient) {
  await Promise.all([
    'staff-games', 'game-config', 'roulette', 'daily-bonus', 'boxes',
    'minigames', 'fishing', 'fishing-details', 'economy', 'battle-pass',
    'battle-details', 'daily-details', 'hunt',
  ].map(key => client.invalidateQueries({ queryKey: [key] })))
}
