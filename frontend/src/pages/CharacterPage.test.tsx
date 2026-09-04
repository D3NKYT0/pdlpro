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

vi.mock('../services/domain/lineage.service', () => ({ lineageApi: { characters: vi.fn(), servicePrices: vi.fn(), changeNickname: vi.fn(), changeSex: vi.fn(), unstuck: vi.fn() }, inventoryApi: { equipment: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
const character = { char_id: 7, name: 'Hero', level: 80, online: false, sex: 0, pvp: 0, pk: 0, class_id: 0, title: '', clan_name: '', is_clan_leader: false }
let query: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(lineageApi.characters).mockResolvedValue([character])
  vi.mocked(lineageApi.servicePrices).mockResolvedValue({ CHANGE_NICKNAME: '10', CHANGE_SEX: '10', UNSTUCK: '0', LINK_SLOT: '10' })
  vi.mocked(inventoryApi.equipment).mockResolvedValue([])
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
  await screen.findByRole('heading', { name: 'Hero', level: 1 })
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
