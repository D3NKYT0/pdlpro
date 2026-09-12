// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { ApiError, inventoryApi, lineageApi } from '../services/api'
import { CharacterPage } from './CharacterPage'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    lineageApi: {
      characters: vi.fn(),
      servicePrices: vi.fn(),
      changeNickname: vi.fn(),
      changeSex: vi.fn(),
      unstuck: vi.fn(),
      characterSkills: vi.fn(),
    },
    inventoryApi: { equipment: vi.fn(), gameItems: vi.fn() },
  }
})
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
const character = {
  char_id: 7,
  name: 'Hero',
  level: 80,
  online: false,
  sex: 0,
  pvp: 12,
  pk: 1,
  class_id: 0,
  title: 'THEONE',
  clan_name: 'Guild',
  is_clan_leader: false,
  karma: 0,
  adena: 2_500_000,
  online_time: 90000,
  last_access: 1_700_000_000_000,
  clan_id: 7,
  ally_id: 3,
  ally_name: 'Alliance',
  clan_crest_base64: '',
  ally_crest_base64: '',
}
let query: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(lineageApi.characters).mockResolvedValue([character])
  vi.mocked(lineageApi.servicePrices).mockResolvedValue({ CHANGE_NICKNAME: '10', CHANGE_SEX: '10', UNSTUCK: '0', LINK_SLOT: '10' })
  vi.mocked(inventoryApi.equipment).mockResolvedValue([])
  vi.mocked(inventoryApi.gameItems).mockResolvedValue([])
  vi.mocked(lineageApi.characterSkills).mockResolvedValue([])
})
afterEach(() => { cleanup(); query?.clear(); vi.restoreAllMocks() })
function mount() {
  query = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<MemoryRouter initialEntries={['/character/hero/7']}><QueryClientProvider client={query}><Routes><Route path="/character/:login/:charId" element={<CharacterPage />} /></Routes></QueryClientProvider></MemoryRouter>)
  return userEvent.setup()
}
it.each(['nickname', 'sex'] as const)('serializa %s, preserva chave após erro e apresenta sucesso', async service => {
  const send = vi.mocked(service === 'nickname' ? lineageApi.changeNickname : lineageApi.changeSex)
  let reject!: (reason: unknown) => void
  send.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
  const user = mount()
  expect(await screen.findByRole('heading', { name: 'Hero', level: 1 })).toBeVisible()
  if (service === 'nickname') await user.type(screen.getByLabelText('Novo nickname'), 'NewHero')
  else await user.selectOptions(screen.getByLabelText('Novo sexo'), 'F')
  await user.dblClick(screen.getByRole('button', { name: service === 'nickname' ? 'Alterar nickname' : 'Alterar sexo' }))
  expect(send).toHaveBeenCalledTimes(1)
  const key = send.mock.calls[0][3]
  expect(key).toMatch(/^[a-f0-9-]{36}$/)
  expect(screen.getByRole('button', { name: service === 'nickname' ? 'Alterar sexo' : 'Alterar nickname' })).toBeDisabled()
  reject(new ApiError('Saldo reservado; solicite conferência', 409, 'CONFLICT'))
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Saldo reservado; solicite conferência'))
  send.mockResolvedValueOnce({ ok: true })
  await user.click(screen.getByRole('button', { name: service === 'nickname' ? 'Alterar nickname' : 'Alterar sexo' }))
  await waitFor(() => expect(toast.success).toHaveBeenCalled())
  expect(send.mock.calls[1][3]).toBe(key)
})
it('mostra paperdoll com slots L2 e item equipado', async () => {
  vi.mocked(inventoryApi.equipment).mockResolvedValue([
    { item_id: 2416, name: 'Blue Wolf Helmet', quantity: 1, enchant: 5, tradeable: true, slot: 6 },
    { item_id: 175, name: 'Art of Battle Axe', quantity: 1, enchant: 6, tradeable: true, slot: 7 },
  ])
  mount()
  expect(await screen.findByLabelText('Equipamentos atuais do personagem')).toBeVisible()
  expect(screen.getByLabelText('Elmo: Blue Wolf Helmet +5')).toBeVisible()
  expect(screen.getByLabelText('Arma: Art of Battle Axe +6')).toBeVisible()
  expect(screen.getByLabelText('Capa: vazio')).toBeVisible()
  expect(screen.getByLabelText('Cinto: vazio')).toBeVisible()
  expect(screen.getByText('+5')).toBeVisible()
  expect(screen.getByText('+6')).toBeVisible()
})
it('mostra ficha com adena compacta, clã, aliança e tempo online', async () => {
  mount()
  expect(await screen.findByText('Guild')).toBeVisible()
  expect(screen.getByText('Alliance')).toBeVisible()
  expect(screen.getByText('2,5KK')).toBeVisible()
  expect(screen.getByText('1d 1h')).toBeVisible()
  expect(screen.getByText('THEONE')).toBeVisible()
})
it('mostra inventário e warehouse em abas com grade', async () => {
  vi.mocked(inventoryApi.gameItems).mockResolvedValue([
    { item_id: 57, name: 'Adena', quantity: 100, enchant: 0, tradeable: true, location: 'INVENTORY' },
    { item_id: 6673, name: 'Festival Adena', quantity: 5, enchant: 0, tradeable: true, location: 'WAREHOUSE' },
  ])
  const user = mount()
  expect(await screen.findByLabelText('Grade do inventário')).toBeVisible()
  expect(screen.getByLabelText('Adena · sem encanto · qtd 100')).toBeVisible()
  await user.click(screen.getByRole('tab', { name: /Warehouse/i }))
  expect(screen.getByLabelText('Grade do warehouse')).toBeVisible()
  expect(screen.getByLabelText('Festival Adena · sem encanto · qtd 5')).toBeVisible()
})
it('abre modal com detalhes ao clicar no item do inventário', async () => {
  vi.mocked(inventoryApi.gameItems).mockResolvedValue([
    { item_id: 57, name: 'Adena', quantity: 100, enchant: 0, tradeable: true, location: 'INVENTORY' },
  ])
  const user = mount()
  await user.click(await screen.findByLabelText('Adena · sem encanto · qtd 100'))
  const dialog = screen.getByRole('dialog', { name: 'Adena' })
  expect(dialog).toBeVisible()
  expect(dialog).toHaveTextContent('ID')
  expect(dialog).toHaveTextContent('57')
  expect(dialog).toHaveTextContent('Quantidade')
  expect(dialog).toHaveTextContent('100')
  await user.click(screen.getAllByRole('button', { name: 'Fechar' })[1])
  expect(screen.queryByRole('dialog', { name: 'Adena' })).not.toBeInTheDocument()
})
it('abre modal ao clicar em item equipado', async () => {
  vi.mocked(inventoryApi.equipment).mockResolvedValue([
    { item_id: 2416, name: 'Blue Wolf Helmet', quantity: 1, enchant: 5, tradeable: true, slot: 6 },
  ])
  const user = mount()
  await user.click(await screen.findByLabelText('Elmo: Blue Wolf Helmet +5'))
  const dialog = screen.getByRole('dialog', { name: 'Blue Wolf Helmet +5' })
  expect(dialog).toBeVisible()
  expect(dialog).toHaveTextContent('Elmo')
  expect(dialog).toHaveTextContent('Equipado')
})
it('mostra skills com ícone e nível', async () => {
  vi.mocked(lineageApi.characterSkills).mockResolvedValue([
    { skill_id: 1, level: 37, class_index: 0, name: 'Triple Slash', icon_url: '/skill-icons/1.png' },
    { skill_id: 3, level: 9, class_index: 0, name: 'Power Strike', icon_url: '/skill-icons/3.png' },
  ])
  const user = mount()
  expect(await screen.findByLabelText('Grade de skills')).toBeVisible()
  expect(screen.getByLabelText('Triple Slash · Nv. 37')).toBeVisible()
  expect(screen.getByRole('img', { name: 'Triple Slash' })).toHaveAttribute('src', '/skill-icons/1.png')
  await user.click(screen.getByLabelText('Power Strike · Nv. 9'))
  const dialog = screen.getByRole('dialog', { name: 'Power Strike' })
  expect(dialog).toBeVisible()
  expect(dialog).toHaveTextContent('ID')
  expect(dialog).toHaveTextContent('3')
  expect(dialog).toHaveTextContent('Nível')
  expect(dialog).toHaveTextContent('9')
})
it('mostra carregamento sem permitir serviço', () => {
  vi.mocked(lineageApi.characters).mockImplementation(() => new Promise(() => {}))
  mount()
  expect(screen.getByText('Carregando personagem...')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Alterar nickname' })).not.toBeInTheDocument()
})
it.each(['empty', 'error', 'online'] as const)('trata estado %s', async state => {
  if (state === 'empty') vi.mocked(lineageApi.characters).mockResolvedValue([])
  if (state === 'error') vi.mocked(lineageApi.characters).mockRejectedValue(new ApiError('Sem acesso', 403, 'DENIED'))
  if (state === 'online') vi.mocked(lineageApi.characters).mockResolvedValue([{ ...character, online: true }])
  mount()
  if (state === 'empty') expect(await screen.findByText('Personagem não encontrado')).toBeVisible()
  if (state === 'error') expect(await screen.findByText('Sem acesso')).toBeVisible()
  if (state === 'online') expect(await screen.findByRole('button', { name: 'Alterar nickname' })).toBeDisabled()
})
