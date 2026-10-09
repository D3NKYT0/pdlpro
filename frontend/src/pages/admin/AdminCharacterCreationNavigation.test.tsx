// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { staffApi } from '../../services/api'
import i18n from '../../i18n'
import { AdminHubPage } from './AdminHubPage'
import { AdminServerPage } from './AdminServerPage'

const auth = vi.hoisted(() => ({ capabilities: ['settings.manage'] }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { capabilities: auth.capabilities } }) }))
vi.mock('../../services/domain/programs.service', () => ({ programsApi: { resources: vi.fn(async () => []) } }))
vi.mock('../../services/domain/staff.service', () => ({ staffApi: { panel: vi.fn(), savePanel: vi.fn() } }))

afterEach(() => { cleanup(); vi.restoreAllMocks() })
beforeEach(async () => {
  auth.capabilities = ['settings.manage']
  await i18n.changeLanguage('pt')
  vi.mocked(staffApi.panel).mockResolvedValue({
    name: 'PDL', slogan: '', description: '', chronicle: 'Interlude', max_level: 80,
    rates: {}, enchant: {}, notes: {}, features: [],
    id: null, is_active: true, coming_soon: false, staff_only_login: false,
    allow_registration: true, allow_l2_registration: true, coming_soon_show_info: false,
    coming_soon_show_champions: true, coming_soon_title: '', coming_soon_subtitle: '',
    coming_soon_at: null, seo_title: '', seo_description: '', og_image: '',
    discord_url: '', whatsapp_url: '', facebook_url: '', instagram_url: '', youtube_url: '',
    trailer_youtube_id: '',
  })
})
function mount() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/panel/admin']}><Routes>
      <Route path="/panel/admin" element={<AdminHubPage />} />
      <Route path="/panel/admin/server" element={<AdminServerPage />} />
    </Routes></MemoryRouter>
  </QueryClientProvider>)
}
it('abre a configuração de personagens diretamente pelo módulo Servidor', async () => {
  const user = userEvent.setup()
  mount()
  const link = screen.getByRole('link', { name: /Criação de personagens/ })
  expect(link).toHaveAttribute('href', '/panel/admin/server#character-creation')
  await user.click(link)
  const section = await screen.findByRole('region', { name: 'Criação de personagens' })
  await waitFor(() => expect(section).toHaveFocus())
  expect(screen.getByLabelText('Level inicial')).toBeEnabled()
  expect(screen.queryByRole('heading', { name: 'Informações do servidor' })).not.toBeInTheDocument()
  await user.clear(screen.getByLabelText('Level inicial'))
  await user.type(screen.getByLabelText('Level inicial'), '5')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(staffApi.savePanel).toHaveBeenCalledWith(expect.objectContaining({
    name: 'PDL', chronicle: 'Interlude', max_level: 80,
    character_creation: expect.objectContaining({ default: expect.objectContaining({ level: 5 }) }),
  })))
})
it('oculta o atalho de quem não pode configurar o servidor', () => {
  auth.capabilities = ['content.manage']
  mount()
  expect(screen.queryByRole('link', { name: /Criação de personagens/ })).not.toBeInTheDocument()
})
