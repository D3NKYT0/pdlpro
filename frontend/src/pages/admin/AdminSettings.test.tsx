// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import toast from 'react-hot-toast'
import i18n from '../../i18n'
import { ApiError, commerceApi, staffApi, staffGameContentApi } from '../../services/api'
import { AdminCoinsPage } from './AdminCoinsPage'
import { AdminWalletPage } from './AdminWalletPage'
import { AdminServicesPage } from './AdminServicesPage'
import { AdminGamesPage } from './AdminGamesPage'
import { AdminShopPage } from './AdminShopPage'
import { AdminNewsPage } from './AdminNewsPage'
import { AdminServerPage } from './AdminServerPage'
import { AdminComingSoonPage } from './AdminComingSoonPage'
import { AdminAccountsPage } from './AdminAccountsPage'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../components/ItemIcon', () => ({ ItemIcon: () => null }))
vi.mock('../../components/ui/RichText', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (next: string) => void }) => (
    <textarea aria-label="Conteúdo" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  RichTextContent: ({ html }: { html: string }) => <div>{html}</div>,
  isRichTextEmpty: (html: string) => !html.replace(/<[^>]*>/g, '').trim(),
}))
vi.mock('../../hooks/useItemCatalog', () => ({ useItemCatalog: () => ({ isPending: false, isError: false, getById: (id: string) => String(id) === '57' ? { id: '57', name: 'Adena', grade: 'NG' } : String(id) === '1835' ? { id: '1835', name: 'Soulshot: No Grade', grade: 'NG' } : null, search: () => [], refetch: vi.fn() }) }))
vi.mock('../../services/domain/staff.service', () => ({ staffApi: { coins: vi.fn(), saveCoins: vi.fn(), walletPromo: vi.fn(), saveWalletPromo: vi.fn(), services: vi.fn(), saveServices: vi.fn(), games: vi.fn(), saveGame: vi.fn(), autoconfigGames: vi.fn(), shop: vi.fn(), saveShopItem: vi.fn(), autoconfigShop: vi.fn(), news: vi.fn(), saveNews: vi.fn(), panel: vi.fn(), savePanel: vi.fn(), inspectAccount: vi.fn(), unlinkAccount: vi.fn() } }))
vi.mock('../../services/domain/commerce.service', () => ({ commerceApi: { staffPackages: vi.fn(), save: vi.fn() } }))
vi.mock('../../services/domain/staffGameContent.service', () => ({ staffGameContentApi: { configs: vi.fn(), saveConfig: vi.fn() } }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.mocked(staffApi.coins).mockResolvedValue({ name: 'Adena', coin_id: 57, multiplier: '1.00', usd_multiplier: '5.00', withdraw_fee_percent: '0.00' } as any)
  vi.mocked(staffApi.walletPromo).mockResolvedValue({
    id: null,
    percent: '10.00',
    title: 'Promoção de recarga',
    description: '',
    active: false,
    starts_at: null,
    ends_at: null,
    currently_active: false,
  })
  vi.mocked(staffApi.services).mockResolvedValue([{ code: 'UNSTUCK', name: 'Destravar', price: '5.00', active: true }])
  vi.mocked(staffApi.games).mockResolvedValue([{ id: 'dice', code: 'dice', name: 'Dados', active: true, settings: {} }])
  vi.mocked(staffApi.autoconfigGames).mockResolvedValue({ games: [] })
  vi.mocked(staffGameContentApi.configs).mockResolvedValue([])
  vi.mocked(staffGameContentApi.saveConfig).mockResolvedValue({ id: 'p1' })
  vi.mocked(staffApi.shop).mockResolvedValue([{ id: 'item', name: 'Adena', item_id: 57, price: '5.00', quantity: 1, active: true }])
  vi.mocked(staffApi.autoconfigShop).mockResolvedValue({ created: { items: 0, packages: 0 }, items_total: 0, packages_total: 0 })
  vi.mocked(commerceApi.staffPackages).mockResolvedValue([])
  vi.mocked(commerceApi.save).mockResolvedValue({ id: 'pack', name: 'Kit Iniciante', total_price: '16.00', active: true, contents: [] })
  vi.mocked(staffApi.news).mockResolvedValue([])
  vi.mocked(staffApi.panel).mockResolvedValue({
    name: 'PDL',
    slogan: 'Reino',
    description: 'Servidor',
    chronicle: 'Interlude',
    rates: { xp: 'x10' },
    enchant: {},
    notes: {},
    features: [],
    max_level: 80,
    coming_soon: false,
    staff_only_login: false,
    allow_registration: true,
    allow_l2_registration: true,
    coming_soon_show_info: false,
    coming_soon_show_champions: true,
    coming_soon_title: 'Em breve',
    coming_soon_subtitle: '',
    coming_soon_at: null,
    seo_title: '',
    seo_description: '',
    og_image: '',
    discord_url: '',
    whatsapp_url: '',
    facebook_url: '',
    instagram_url: '',
    youtube_url: '',
    trailer_youtube_id: '',
  } as any)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
function mount(page: ReactElement) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{page}</MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

it('moedas mantém precisão decimal na configuração', async () => {
  const user = mount(<AdminCoinsPage />)
  const input = await screen.findByRole('spinbutton', { name: /Conversão por USD/ })
  await waitFor(() => expect(input).toHaveValue(5))
  await user.clear(input)
  await user.type(input, '6.25')
  await user.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(staffApi.saveCoins).toHaveBeenCalledWith({ name: 'Adena', coin_id: 57, multiplier: '1.00', usd_multiplier: '6.25', withdraw_fee_percent: '0.00', active: true })
})

it('carteira salva promoção de recarga ativa', async () => {
  const user = mount(<AdminWalletPage />)
  const percent = await screen.findByRole('spinbutton', { name: /Percentual de bônus/ })
  await waitFor(() => expect(percent).toHaveValue(10))
  await user.clear(percent)
  await user.type(percent, '20')
  await user.clear(screen.getByLabelText('Título'))
  await user.type(screen.getByLabelText('Título'), 'Campanha 20%')
  await user.click(screen.getByRole('checkbox', { name: 'Campanha ativa' }))
  await user.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(staffApi.saveWalletPromo).toHaveBeenCalledWith({
    percent: '20',
    title: 'Campanha 20%',
    description: '',
    active: true,
    starts_at: null,
    ends_at: null,
  })
  expect(toast.success).toHaveBeenCalledWith('Promoção da carteira atualizada')
})

it.each([false, true])('serviços salva preço e disponibilidade; erro=%s', async fail => {
  if (fail) vi.mocked(staffApi.saveServices).mockRejectedValue(new ApiError('Não autorizado', 403, 'DENIED'))
  const user = mount(<AdminServicesPage />)
  const price = await screen.findByRole('spinbutton', { name: /Preço/ })
  await user.clear(price)
  await user.type(price, '12.34')
  await user.click(screen.getByRole('checkbox', { name: 'Disponível' }))
  await user.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(staffApi.saveServices).toHaveBeenCalledWith([{ code: 'UNSTUCK', name: 'Destravar', price: '12.34', active: false }])
  if (fail) expect(toast.error).toHaveBeenCalledWith('Não autorizado')
  else expect(toast.success).toHaveBeenCalledWith('Preços atualizados')
})

it.each([false, true])('jogos envia toggle e apresenta resultado; erro=%s', async fail => {
  if (fail) vi.mocked(staffApi.saveGame).mockRejectedValue(new ApiError('Falha ao salvar', 400, 'INVALID'))
  const user = mount(<AdminGamesPage />)
  await user.click(await screen.findByRole('checkbox', { name: 'Ativo' }))
  expect(staffApi.saveGame).toHaveBeenCalledWith({ id: 'dice', active: false })
  if (fail) expect(toast.error).toHaveBeenCalledWith('Falha ao salvar')
  else expect(toast.success).toHaveBeenCalledWith('Jogo desativado')
})

it('mostra os nomes da central de jogos em vez do título antigo do banco', async () => {
  vi.mocked(staffApi.games).mockResolvedValue([
    { id: 'r1', code: 'roulette', name: 'Roleta', active: true, settings: {} },
    { id: 'd1', code: 'dice', name: 'Dados', active: true, settings: {} },
    { id: 'e1', code: 'economy', name: 'Economia', active: true, settings: {} },
  ])
  mount(<AdminGamesPage />)
  expect(await screen.findByRole('heading', { name: 'Roda da Fortuna' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Mesa da Taverna' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Arena das Feras' })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Roleta' })).not.toBeInTheDocument()
})

it('preenche conteúdo de um jogo e bloqueia clique duplicado', async () => {
  let resolveFn: (value: { games: [] }) => void = () => {}
  const pending = new Promise<{ games: [] }>((resolve) => {
    resolveFn = resolve
  })
  vi.mocked(staffApi.autoconfigGames).mockReturnValue(pending)
  const user = mount(<AdminGamesPage />)
  await user.click(await screen.findByRole('button', { name: /^Configurar$/ }))
  const fill = await screen.findByRole('button', { name: 'Preencher conteúdo' })
  await user.click(fill)
  await user.click(fill)
  expect(staffApi.autoconfigGames).toHaveBeenCalledTimes(1)
  expect(staffApi.autoconfigGames).toHaveBeenCalledWith('dice')
  resolveFn({ games: [] })
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Catálogo Lineage aplicado'))
})

it('abre o configurador e salva parâmetros do jogo', async () => {
  const user = mount(<AdminGamesPage />)
  await user.click(await screen.findByRole('button', { name: /^Configurar$/ }))
  const bet = await screen.findByLabelText('Aposta mínima')
  await user.clear(bet)
  await user.type(bet, '4')
  await user.click(screen.getByRole('button', { name: 'Salvar parâmetros' }))
  expect(staffApi.saveGame).toHaveBeenCalledWith({ id: 'dice', settings: { min_bet: 4 } })
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Parâmetros salvos'))
})

it('configurador da roleta grava prêmio com ID de item Lineage', async () => {
  vi.mocked(staffApi.games).mockResolvedValue([{ id: 'r1', code: 'roulette', name: 'Roda', active: true, settings: { cost: 1, fail_chance: 20 } }])
  const user = mount(<AdminGamesPage />)
  await user.click(await screen.findByRole('button', { name: /^Configurar$/ }))
  await user.click(await screen.findByRole('button', { name: 'Novo registro' }))
  await user.clear(screen.getByLabelText('Nome'))
  await user.type(screen.getByLabelText('Nome'), 'Soulshot: No Grade')
  await user.click(screen.getByRole('button', { name: 'Salvar configuração' }))
  expect(staffGameContentApi.saveConfig).toHaveBeenCalledWith(
    'prizes',
    expect.objectContaining({ item_id: 1835, name: 'Soulshot: No Grade', active: true }),
    undefined,
  )
})

it('configurador do bônus diário troca para o pool de itens Lineage', async () => {
  vi.mocked(staffApi.games).mockResolvedValue([{ id: 'd1', code: 'daily_bonus', name: 'Bônus', active: true, settings: { amount: '10.00' } }])
  vi.mocked(staffGameContentApi.configs).mockImplementation(async (kind: string) => {
    if (kind === 'daily-pool') {
      return [{ id: 'p1', name: 'Moeda da Sorte', weight: 4, rewards: [{ kind: 'item', item_id: 4037, name: 'Coin of Luck', quantity: 1 }] }]
    }
    return []
  })
  const user = mount(<AdminGamesPage />)
  await user.click(await screen.findByRole('button', { name: /^Configurar$/ }))
  await user.selectOptions(await screen.findByLabelText('Catálogo'), 'daily-pool')
  expect(await screen.findByText('Moeda da Sorte')).toBeVisible()
})

it('configura todos os jogos a partir do painel', async () => {
  const user = mount(<AdminGamesPage />)
  await user.click(await screen.findByRole('button', { name: 'Configurar todos' }))
  expect(staffApi.autoconfigGames).toHaveBeenCalledWith(undefined)
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Jogos configurados'))
})

it('edição da loja preserva UUID e converte quantidade para número', async () => {
  const user = mount(<AdminShopPage />)
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  const quantity = screen.getByLabelText('Quantidade')
  await user.clear(quantity)
  await user.type(quantity, '3')
  await user.click(screen.getByRole('button', { name: 'Atualizar item' }))
  expect(staffApi.saveShopItem).toHaveBeenCalledWith({ id: 'item', name: 'Adena', item_id: 57, price: '5.00', quantity: 3, active: true })
  expect(await screen.findByRole('button', { name: 'Criar item' })).toBeVisible()
})

it('preenche o catálogo low grade e bloqueia clique duplicado', async () => {
  let resolveFn: (value: { created: { items: number; packages: number }; items_total: number; packages_total: number }) => void = () => {}
  const pending = new Promise<{ created: { items: number; packages: number }; items_total: number; packages_total: number }>((resolve) => {
    resolveFn = resolve
  })
  vi.mocked(staffApi.autoconfigShop).mockReturnValue(pending)
  const user = mount(<AdminShopPage />)
  const fill = await screen.findByRole('button', { name: 'Preencher catálogo low grade' })
  await user.click(fill)
  await user.click(fill)
  expect(staffApi.autoconfigShop).toHaveBeenCalledTimes(1)
  resolveFn({ created: { items: 33, packages: 8 }, items_total: 33, packages_total: 8 })
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Catálogo low grade aplicado (33 itens e 8 pacotes novos)'))
})

it('cria pacote da loja a partir do item já cadastrado', async () => {
  const user = mount(<AdminShopPage />)
  await user.click(await screen.findByRole('tab', { name: 'Pacotes' }))
  await user.click(await screen.findByRole('button', { name: 'Novo pacote' }))
  await screen.findByRole('option', { name: /Adena/ })
  await user.type(screen.getByLabelText('Nome do pacote'), 'Kit Iniciante')
  await user.type(screen.getByLabelText('Preço (moedas)'), '16')
  await user.selectOptions(screen.getByLabelText('Item'), 'item')
  await user.click(screen.getByRole('button', { name: 'Salvar pacote' }))
  expect(commerceApi.save).toHaveBeenCalledWith(
    'packages',
    { name: 'Kit Iniciante', total_price: '16', active: true, items: [{ item: 'item', quantity: 1 }] },
    undefined,
  )
})

it('cria notícia como rascunho sem publicar implicitamente', async () => {
  const user = mount(<AdminNewsPage />)
  await user.type(screen.getByRole('textbox', { name: /Título/ }), 'Atualização')
  await user.type(screen.getByRole('textbox', { name: 'Conteúdo' }), 'Detalhes da atualização')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
  expect(staffApi.saveNews).toHaveBeenCalledWith({
    id: undefined,
    title: 'Atualização',
    title_en: '',
    title_es: '',
    excerpt: '',
    excerpt_en: '',
    excerpt_es: '',
    body: 'Detalhes da atualização',
    body_en: '',
    body_es: '',
    is_published: false,
  })
  expect(screen.getByRole('textbox', { name: /Título/ })).toHaveValue('')
})

it('envia traduções EN e ES da notícia junto com o português', async () => {
  const user = mount(<AdminNewsPage />)
  await user.type(screen.getByRole('textbox', { name: /Título/ }), 'Atualização')
  await user.type(screen.getByRole('textbox', { name: 'Conteúdo' }), 'Detalhes')
  await user.click(screen.getByRole('tab', { name: 'English' }))
  await user.type(screen.getByRole('textbox', { name: /Título/ }), 'Update')
  await user.type(screen.getByRole('textbox', { name: 'Conteúdo' }), 'Details')
  await user.click(screen.getByRole('tab', { name: 'Español' }))
  await user.type(screen.getByRole('textbox', { name: /Título/ }), 'Actualización')
  await user.click(screen.getByRole('tab', { name: 'Português' }))
  await user.click(screen.getByRole('button', { name: 'Publicar notícia' }))
  expect(staffApi.saveNews).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Atualização',
    title_en: 'Update',
    title_es: 'Actualización',
    body: 'Detalhes',
    body_en: 'Details',
    is_published: true,
  }))
})

it('notícia rejeitada mantém o conteúdo para correção', async () => {
  vi.mocked(staffApi.saveNews).mockRejectedValue(new ApiError('Título repetido', 400, 'INVALID'))
  const user = mount(<AdminNewsPage />)
  await user.type(screen.getByRole('textbox', { name: /Título/ }), 'Atualização')
  await user.type(screen.getByRole('textbox', { name: 'Conteúdo' }), 'Texto')
  await user.click(screen.getByRole('button', { name: 'Publicar notícia' }))
  expect(toast.error).toHaveBeenCalledWith('Título repetido')
  expect(screen.getByRole('textbox', { name: 'Conteúdo' })).toHaveValue('Texto')
})

it('campos de lançamento compartilham a mesma grade', async () => {
  mount(<AdminComingSoonPage />)
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /Ativar Coming Soon/ })).toBeInTheDocument())
  const title = screen.getByLabelText(/Título do lançamento/)
  const date = screen.getByLabelText(/Data e hora do lançamento/)
  const subtitle = screen.getByLabelText(/Subtítulo/)
  const grid = title.closest('.admin-launch-fields')
  expect(grid).toBeTruthy()
  expect(date.closest('.admin-launch-fields')).toBe(grid)
  expect(subtitle.closest('.admin-launch-fields')).toBe(grid)
  expect(subtitle.closest('.admin-launch-subtitle')).toBeTruthy()
  expect(grid).toHaveTextContent('Alvo da contagem regressiva')
})

it('Coming Soon habilita restrição de login e salva controles de acesso', async () => {
  const user = mount(<AdminComingSoonPage />)
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /Ativar Coming Soon/ })).toBeInTheDocument())
  const restricted = screen.getByRole('checkbox', { name: /Permitir login apenas/ })
  expect(restricted).toBeDisabled()
  await user.click(screen.getByRole('checkbox', { name: /Ativar Coming Soon/ }))
  await user.click(restricted)
  await user.click(screen.getByRole('checkbox', { name: /Permitir rolagem com Informações/ }))
  await user.click(screen.getByRole('checkbox', { name: /Mostrar personagens laterais/ }))
  await user.type(screen.getByLabelText(/URL do WhatsApp/), 'https://wa.me/5511999999999')
  await user.type(screen.getByLabelText(/URL do Discord/), 'https://discord.gg/theone')
  await user.clear(screen.getByLabelText(/Título do lançamento/))
  await user.type(screen.getByLabelText(/Título do lançamento/), 'Abertura do reino')
  await user.type(screen.getByLabelText(/Data e hora do lançamento/), '2027-01-03T18:00')
  await user.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(staffApi.savePanel).toHaveBeenCalledWith(expect.objectContaining({
    coming_soon: true,
    staff_only_login: true,
    allow_registration: true,
    allow_l2_registration: true,
    coming_soon_show_info: true,
    coming_soon_show_champions: false,
    coming_soon_title: 'Abertura do reino',
    coming_soon_at: expect.stringMatching(/^2027-01-03T/),
    discord_url: 'https://discord.gg/theone',
    whatsapp_url: 'https://wa.me/5511999999999',
  }))
  expect(screen.getByRole('link', { name: /Ver página de lançamento/ })).toHaveAttribute('href', '/')
})

it('painel e servidor normaliza recursos sem misturar Coming Soon', async () => {
  const user = mount(<AdminServerPage />)
  await waitFor(() => expect(screen.getByLabelText('Nome')).toHaveValue('PDL'))
  expect(screen.queryByRole('checkbox', { name: /Ativar Coming Soon/ })).not.toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: /Recursos/ }), ' PvP \n\n Eventos ')
  await user.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(staffApi.savePanel).toHaveBeenCalledWith(expect.objectContaining({
    features: ['PvP', 'Eventos'],
    name: 'PDL',
    max_level: 80,
  }))
  expect(staffApi.savePanel).toHaveBeenCalledWith(expect.objectContaining({
    coming_soon: false,
  }))
})

it.each([false, true])('desvinculação exige confirmação, confirmada=%s', async confirm => {
  vi.spyOn(window, 'confirm').mockReturnValue(confirm)
  vi.mocked(staffApi.inspectAccount).mockResolvedValue({ login: 'hero', email: 'hero@test.dev', linked: true, linked_user_id: 'owner', panel_username: 'Owner' })
  vi.mocked(staffApi.unlinkAccount).mockResolvedValue({ login: 'hero', email: 'hero@test.dev', linked: false, linked_user_id: null, panel_username: null })
  const user = mount(<AdminAccountsPage />)
  await user.type(screen.getByLabelText('Login da conta L2'), ' hero ')
  await user.click(screen.getByRole('button', { name: 'Consultar' }))
  expect(staffApi.inspectAccount).toHaveBeenCalledWith('hero')
  await user.click(await screen.findByRole('button', { name: 'Remover vínculo' }))
  if (confirm) {
    expect(staffApi.unlinkAccount).toHaveBeenCalledWith('hero')
    expect(await screen.findByText('Nada a remover')).toBeVisible()
  } else expect(staffApi.unlinkAccount).not.toHaveBeenCalled()
})

it('moedas seguem o idioma ativo no chrome, nos rótulos e no aviso de sucesso', async () => {
  await i18n.changeLanguage('en')
  const user = mount(<AdminCoinsPage />)
  expect(await screen.findByRole('heading', { name: 'Wallet identity' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Hub' })).toBeVisible()
  expect(screen.queryByText('Identidade da carteira')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Currency updated'))
})

it('contas Lineage interpolam o login nas mensagens do idioma ativo', async () => {
  await i18n.changeLanguage('es')
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.mocked(staffApi.inspectAccount).mockResolvedValue({ login: 'hero', email: 'hero@test.dev', linked: true, linked_user_id: 'owner', panel_username: 'Owner' })
  vi.mocked(staffApi.unlinkAccount).mockResolvedValue({ login: 'hero', email: 'hero@test.dev', linked: false, linked_user_id: null, panel_username: null })
  const user = mount(<AdminAccountsPage />)
  await user.type(screen.getByLabelText('Login de la cuenta L2'), 'hero')
  await user.click(screen.getByRole('button', { name: 'Consultar' }))
  await user.click(await screen.findByRole('button', { name: 'Quitar vínculo' }))
  expect(window.confirm).toHaveBeenCalledWith('¿Desvincular la cuenta hero del panel? Quedará libre para ser reclamada.')
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('El vínculo de hero fue eliminado'))
  expect(await screen.findByText('Nada que quitar')).toBeVisible()
})
