import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../src/contexts/AuthContext'
import { HelpPage } from '../src/pages/HelpPage'
import { usePanelTheme } from '../src/theme/usePanelTheme'
import '../src/styles/global.css'

// Development entry only: real page and components with an isolated HTTP boundary.
// Never included by the production Vite entry; no real API operations or credentials.
if (!import.meta.env.DEV) throw new Error('Development preview only')
const article = { id: 'demo', question: 'Como encontro minhas contas?', short_answer: 'Abra suas contas no painel.', answer: 'Abra /painel/accounts para consultar suas contas vinculadas.', category: 'game_accounts', category_label: 'Contas e personagens', keywords: ['conta'], audience: 'public', audience_label: 'Todos' }
const unlocks = [
  { id: 'garden', slot: 'scene', level: 1, label: { pt: 'Jardim encantado', en: 'Enchanted garden' } },
  { id: 'star-pin', slot: 'accessory', level: 2, label: { pt: 'Broche de estrela', en: 'Star pin' } },
  { id: 'dance', slot: 'interaction', level: 3, label: { pt: 'Dançar juntos', en: 'Dance together' } },
  { id: 'study', slot: 'scene', level: 4, label: { pt: 'Biblioteca aconchegante', en: 'Cozy library' } },
  { id: 'camp', slot: 'scene', level: 5, label: { pt: 'Acampamento noturno', en: 'Night campsite' } },
].map(item => ({ ...item, unlocked: true }))
let profile = {
  level: 5, experience: 95, experience_next: 500,
  attributes: { satiety: 75, energy: 75, happiness: 75, hygiene: 75 },
  appearance: { accessory: 'star-pin', outfit: '', object: '', scene: 'garden' },
  unlocks, available_actions: ['feed', 'sleep', 'play', 'care', 'dance'],
  emotion: { id: 'calm', pose: '01-boas-vindas', idle_pose: '01-boas-vindas', source: 'default' },
  preferences: { preferred_name: '', detail: 'balanced' },
  cue: null, daily_visit: true, visit_xp: 8,
}
const nativeFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url = String(input)
  if (!url.startsWith('/api/')) return nativeFetch(input, init)
  let data: unknown = []
  if (url.includes('/me/')) data = { id: 'denkynho-preview', username: 'Visitante', display_name: 'Visitante', role: 'player', is_email_verified: true }
  else if (url.includes('/csrf/')) data = { csrfToken: 'preview-only' }
  else if (url.includes('/faq/')) data = [article]
  else if (url.includes('/assistant/reply/')) {
    await new Promise(resolve => setTimeout(resolve, 1200))
    data = { language: 'pt', kind: 'knowledge', engine: 'remote', mode: 'generative', context: 'preview', answer: { text: 'Vamos encontrar suas contas! Abra /painel/accounts e escolha a conta L2 vinculada ao seu perfil.', source: article.question, pose: '04-dica' } }
  } else if (url.includes('/assistant/pet/wardrobe/')) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (init?.method === 'PATCH') profile = { ...profile, appearance: { ...profile.appearance, [body.slot]: body.item_id } }
    data = profile
  } else if (url.includes('/assistant/pet/')) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (init?.method === 'PATCH') profile = { ...profile, preferences: { preferred_name: body.preferred_name ?? '', detail: body.detail ?? 'balanced' } }
    if (init?.method === 'POST') profile = { ...profile, experience: profile.experience + 12 }
    data = { ...profile, ...(init?.method === 'POST' ? { action: body.action, xp_gained: 12, replayed: false, attributes_gained: { happiness: 5 } } : {}) }
  }
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
}
function Preview() {
  usePanelTheme()
  const { loading } = useAuth()
  if (loading) return <p>Carregando demonstração…</p>
  return <main className="panel-app"><div className="content" style={{ padding: 16, height: '100dvh' }}><HelpPage /></div></main>
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/painel/ajuda?from=/painel/accounts']}><AuthProvider><Preview /></AuthProvider></MemoryRouter></QueryClientProvider>)
