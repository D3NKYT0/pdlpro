import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePanelTheme } from '../src/theme/usePanelTheme'
import { RewardsPage } from '../src/pages/RewardsPage'
import '../src/i18n'
import '../src/styles/global.css'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

const reward = (name: string, quantity: number, item_id = 57) => ({ kind: 'item', name, quantity, item_id })

client.setQueryData(['resources'], [])
client.setQueryData(['battle-pass'], {
  season: { id: 's1', name: 'Temporada 1 · Coroa de Aden', premium_price: '50', ends_at: '2026-11-29T23:59:00Z' },
  xp: 533,
  has_premium: true,
  current_level: 3,
  levels: [1, 2, 3, 4].map((level) => ({
    level,
    required_xp: level * 250,
    unlocked: level <= 3,
    rewards: [
      { id: `free-${level}`, is_premium: false, item_id: 57, item_name: 'Adena', quantity: level * 500, description: 'Moedas do reino', claimed: level < 3, locked_premium: false },
      { id: `premium-${level}`, is_premium: true, item_id: 3470, item_name: 'Manto do Guardião', quantity: 1, description: 'Somente com o passe premium', claimed: false, locked_premium: level > 3 },
    ],
  })),
})
client.setQueryData(['battle-details'], {
  auto_claim: true,
  statistics: { quests: 4, rewards: 6, exchanges: 2 },
  history: [
    { id: 'h1', label: 'Nível 2 · prêmio gratuito', created_at: '2026-09-12T18:20:00Z', rewards: [reward('Adena', 1000)] },
    { id: 'h2', label: 'Missão semanal concluída', created_at: '2026-09-11T09:05:00Z', rewards: [reward('Pergaminho', 3, 3470)] },
  ],
  quests: [
    { id: 'q1', name: 'Caçar 10 lobos em Gludio', description: 'Percorra a floresta ao norte e derrote os lobos que rondam a estrada.', period: 'daily', target: 10, current: 10, xp: 40, claimed: false },
    { id: 'q2', name: 'Pescar 5 peixes no lago', description: 'Use a vara na Pescaria do salão de jogos.', period: 'weekly', target: 5, current: 2, xp: 25, claimed: false },
    { id: 'q3', name: 'Vencer 3 feras na arena', description: 'Enfrente as criaturas da Arena das Feras.', period: 'season', target: 3, current: 3, xp: 90, claimed: true },
  ],
  exchanges: [
    { id: 'x1', name: 'Troca do ferreiro', required_item_id: 57, required_enchant: 0, required_quantity: 2, owned: 4, limit: 3, used: 1, rewards: [reward('Manto do Guardião', 1, 3470)] },
    { id: 'x2', name: 'Troca do alquimista', required_item_id: 728, required_enchant: 3, required_quantity: 5, owned: 1, limit: 0, used: 0, rewards: [reward('Poção maior', 10, 728)] },
  ],
  milestones: [
    { id: 'm1', name: 'Primeiros 250 XP', required_xp: 250, claimed: true, rewards: [reward('Adena', 500)] },
    { id: 'm2', name: 'Metade da temporada', required_xp: 750, claimed: false, rewards: [reward('Pergaminho', 2, 3470)] },
  ],
})
client.setQueryData(['daily-bonus'], { amount: '10', active: true, claimed: false })
client.setQueryData(['daily-details'], {
  season: { id: 'd1', name: 'Calendário de setembro', ends_on: '2026-09-30', current_day: 3 },
  claimed: false,
  days: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, rewards: day === 7 ? [] : [reward('Adena', day * 100)] })),
  pool: [
    { name: 'Bolsa comum', weight: 3, rewards: [reward('Adena', 500)] },
    { name: 'Bolsa rara', weight: 1, rewards: [reward('Manto do Guardião', 1, 3470)] },
  ],
  history: [{ id: 'dh1', label: 'Dia 2 resgatado', created_at: '2026-09-13T11:00:00Z', rewards: [reward('Adena', 200)] }],
})
client.setQueryData(['game-statistics', 'roulette'], {
  plays: 42,
  wins: 17,
  payout: 0,
  leaderboard: [
    { username: 'denky', score: 42, wins: 17 },
    { username: 'aria', score: 30, wins: 12 },
    { username: 'kael', score: 24, wins: 9 },
    { username: 'lyra', score: 12, wins: 3 },
  ],
})

function Preview() {
  usePanelTheme()
  return (
    <div data-theme-surface="panel">
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 24 }}>
        <RewardsPage />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <Preview />
    </BrowserRouter>
  </QueryClientProvider>,
)
