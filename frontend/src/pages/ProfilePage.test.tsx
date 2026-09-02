// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { authApi, ApiError } from '../services/api'
import { ProfilePage } from './ProfilePage'

const session = vi.hoisted(() => ({ user: { username: 'Hero', display_name: 'Herói', email: 'user@test.dev', bio: '', is_email_verified: true, role: 'player' }, refreshUser: vi.fn() }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))
vi.mock('../services/domain/auth.service', async original => ({ ...await original<object>(), authApi: { progress: vi.fn(), updateMe: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authApi.progress).mockImplementation(() => new Promise(() => {}))
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:avatar')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks() })
function mount() {
  const result = render(<QueryClientProvider client={client}><MemoryRouter><ProfilePage /></MemoryRouter></QueryClientProvider>)
  return { ...result, user: userEvent.setup() }
}
it.each([false, true])('salva textos sem espaços externos; preserva edição quando falha=%s', async fail => {
  if (fail) vi.mocked(authApi.updateMe).mockRejectedValue(new ApiError('Perfil indisponível', 503, 'UNAVAILABLE'))
  const { user } = mount()
  const name = screen.getByRole('textbox', { name: /Nome de exibição/ })
  await user.clear(name)
  await user.type(name, ' Novo herói ')
  await user.type(screen.getByRole('textbox', { name: /Biografia/ }), ' Minha jornada ')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  const form = vi.mocked(authApi.updateMe).mock.calls[0][0] as FormData
  expect([...form.entries()]).toEqual([['display_name', 'Novo herói'], ['bio', 'Minha jornada']])
  if (fail) {
    expect(toast.error).toHaveBeenCalledWith('Perfil indisponível')
    expect(name).toHaveValue(' Novo herói ')
  } else expect(session.refreshUser).toHaveBeenCalledTimes(1)
})
it.each([['text/plain', 10, 'Escolha um arquivo de imagem.'], ['image/png', 5 * 1024 * 1024 + 1, 'O avatar deve ter no máximo 5 MB.']])('recusa avatar inválido: %s / %s bytes', (type, size, message) => {
  const { container } = mount()
  const file = new File(['x'], 'avatar', { type: String(type) })
  Object.defineProperty(file, 'size', { value: size })
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
  expect(toast.error).toHaveBeenCalledWith(message)
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})
it('envia imagem, exibe preview e libera URL após salvar', async () => {
  const { user, container } = mount()
  const file = new File(['image'], 'avatar.png', { type: 'image/png' })
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
  expect(screen.getByRole('img', { name: 'Avatar de Hero' })).toHaveAttribute('src', 'blob:avatar')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  const form = vi.mocked(authApi.updateMe).mock.calls[0][0] as FormData
  expect(form.get('avatar')).toBe(file)
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:avatar'))
})
