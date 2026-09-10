// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { ApiError, authApi } from '../services/api'
import { CompleteAccountPage } from './CompleteAccountPage'

const session = vi.hoisted(() => ({
  user: null as null | { username: string; has_usable_password: boolean },
  loading: false,
  refreshUser: vi.fn(),
}))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))
vi.mock('../services/domain/auth.service', async original => ({
  ...await original<object>(),
  authApi: { completeCredentials: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.resetAllMocks()
  session.loading = false
  session.user = { username: 'oauthuser', has_usable_password: false }
  session.refreshUser.mockResolvedValue(undefined)
})
afterEach(cleanup)

function mount() {
  render(
    <MemoryRouter initialEntries={['/complete-account']}>
      <Routes>
        <Route path="/complete-account" element={<CompleteAccountPage />} />
        <Route path="/panel" element={<h1>Painel autenticado</h1>} />
        <Route path="/login" element={<h1>Login</h1>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

it('exige login, senha e termos antes de liberar o painel', async () => {
  vi.mocked(authApi.completeCredentials).mockResolvedValue({ username: 'mestre' } as never)
  const user = mount()

  await user.clear(screen.getByLabelText('Usuário'))
  await user.type(screen.getByLabelText('Usuário'), 'mestre')
  await user.type(screen.getByLabelText('Senha', { selector: 'input' }), 'Secret123!')
  await user.type(screen.getByLabelText('Confirmar senha', { selector: 'input' }), 'Secret123!')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }))

  expect(authApi.completeCredentials).toHaveBeenCalledWith({
    username: 'mestre',
    password: 'Secret123!',
    accept_terms: true,
  })
  expect(session.refreshUser).toHaveBeenCalled()
  expect(await screen.findByRole('heading', { name: 'Painel autenticado' })).toBeVisible()
})

it('bloqueia envio quando as senhas divergem', async () => {
  const user = mount()
  await user.type(screen.getByLabelText('Senha', { selector: 'input' }), 'Secret123!')
  await user.type(screen.getByLabelText('Confirmar senha', { selector: 'input' }), 'OutraSenha1!')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }))
  expect(toast.error).toHaveBeenCalledWith('As senhas não conferem.')
  expect(authApi.completeCredentials).not.toHaveBeenCalled()
})

it('mostra erro da API sem sair da subtela', async () => {
  vi.mocked(authApi.completeCredentials).mockRejectedValue(new ApiError('Usuário já existe', 409, 'USERNAME_TAKEN'))
  const user = mount()
  await user.type(screen.getByLabelText('Senha', { selector: 'input' }), 'Secret123!')
  await user.type(screen.getByLabelText('Confirmar senha', { selector: 'input' }), 'Secret123!')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }))
  expect(toast.error).toHaveBeenCalledWith('Usuário já existe')
  expect(screen.getByRole('button', { name: 'Concluir cadastro' })).toBeVisible()
})

it('redireciona quem já tem senha para o painel', () => {
  session.user = { username: 'hero', has_usable_password: true }
  mount()
  expect(screen.getByRole('heading', { name: 'Painel autenticado' })).toBeVisible()
})
