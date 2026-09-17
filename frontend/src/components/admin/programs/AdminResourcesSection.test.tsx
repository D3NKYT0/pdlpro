// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import i18n from '../../../i18n'
import { ApiError, programsApi, type Resource } from '../../../services/api'
import { AdminResourcesSection } from './AdminResourcesSection'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn(), toggleResource: vi.fn() },
}))

const catalog: Resource[] = [
  { id: 'hunt', code: 'hunt', name: 'Caça do dia', category: 'Jogos', enabled: true, description: 'Disponibilidade de caça do dia para os jogadores.' },
  { id: 'fish', code: 'fishing', name: 'Pesca', category: 'Jogos', enabled: true, description: 'Disponibilidade de pesca para os jogadores.' },
  { id: 'progress', code: 'progress', name: 'Progresso', category: 'Conta', enabled: true, description: 'Disponibilidade de progresso para os jogadores.' },
  { id: 'stores', code: 'game-stores', name: 'Lojas do jogo', category: 'Conteúdo', enabled: false, description: 'Disponibilidade de lojas do jogo para os jogadores.' },
  { id: 'shop', code: 'shop', name: 'Loja', category: 'Economia', enabled: false, description: 'Itens e pacotes' },
]

function mount() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AdminResourcesSection />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(async () => {
  vi.resetAllMocks()
  await i18n.changeLanguage('pt')
  vi.mocked(programsApi.resources).mockResolvedValue(catalog)
  vi.mocked(programsApi.toggleResource).mockResolvedValue(catalog[0])
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('mostra os módulos novos com os nomes atuais em vez do texto antigo do banco', async () => {
  mount()
  expect(await screen.findByRole('heading', { name: 'Caça do dia' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Pescaria' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Nível e conquistas' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Lojas do jogo' })).toBeVisible()
  expect(screen.getByText('hunt')).toBeVisible()
  expect(screen.getByText('game-stores')).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Pesca' })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Progresso' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Jogos' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Conta' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Conteúdo' })).toBeVisible()
})

it('traduz caça, pescaria e lojas quando o idioma da staff muda', async () => {
  await i18n.changeLanguage('en')
  mount()
  expect(await screen.findByRole('heading', { name: 'Daily hunt' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Fishing' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'In-game shops' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Level and achievements' })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Caça do dia' })).not.toBeInTheDocument()
})

it.each([false, true])('envia o toggle e apresenta o resultado; erro=%s', async (fail) => {
  if (fail) vi.mocked(programsApi.toggleResource).mockRejectedValue(new ApiError('Falha ao salvar', 400, 'INVALID'))
  const user = mount()
  await user.click(await screen.findByRole('checkbox', { name: 'Desativar Caça do dia' }))
  expect(programsApi.toggleResource).toHaveBeenCalledWith('hunt', false)
  if (fail) expect(toast.error).toHaveBeenCalledWith('Falha ao salvar')
  else expect(toast.success).toHaveBeenCalledWith('Recurso desativado.')
})

it('bloqueia clique duplicado enquanto o recurso atualiza', async () => {
  let resolveFn: (value: Resource) => void = () => {}
  const pending = new Promise<Resource>((resolve) => {
    resolveFn = resolve
  })
  vi.mocked(programsApi.toggleResource).mockReturnValue(pending)
  const user = mount()
  const toggle = await screen.findByRole('checkbox', { name: 'Ativar Loja' })
  await user.click(toggle)
  await user.click(toggle)
  expect(programsApi.toggleResource).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('checkbox', { name: 'Atualizando' })).toBeDisabled()
  resolveFn(catalog[4])
  expect(await screen.findByRole('checkbox', { name: 'Ativar Loja' })).toBeEnabled()
})

it('mostra vazio e erro com nova tentativa', async () => {
  vi.mocked(programsApi.resources).mockRejectedValueOnce(new ApiError('Sem permissão', 403, 'DENIED'))
  mount()
  expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão')
  vi.mocked(programsApi.resources).mockResolvedValueOnce([])
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText('Nenhum módulo cadastrado')).toBeVisible()
})
