// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { programsApi } from '../services/api'
import i18n from '../i18n'
import { SupportersPage } from './SupportersPage'

vi.mock('../services/domain/programs.service', async original => ({
  ...(await original<object>()),
  programsApi: { supporter: vi.fn(), apply: vi.fn(), payout: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const state = { profile: null, available: '0.00', coupons: [], commissions: [], payouts: [] }
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(programsApi.supporter).mockResolvedValue(state as never)
  vi.mocked(programsApi.apply).mockResolvedValue(state as never)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(async () => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
  await i18n.changeLanguage('pt')
})
async function mount(joinTitle = 'Faça parte do programa') {
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SupportersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: joinTitle })
  const input = result.container.querySelector('input[type=file]') as HTMLInputElement
  return { ...result, input, user: userEvent.setup() }
}
function pick(input: HTMLInputElement, type: string, size: number) {
  const file = new File(['x'], 'logo', { type })
  Object.defineProperty(file, 'size', { value: size })
  fireEvent.change(input, { target: { files: [file] } })
  return file
}
async function submit(
  user: ReturnType<typeof userEvent.setup>,
  labels = { name: /Nome público/, channel: /Canal ou página/, send: /Enviar candidatura/ },
) {
  await user.type(screen.getByRole('textbox', { name: labels.name }), 'Criadora')
  await user.type(screen.getByRole('textbox', { name: labels.channel }), 'https://exemplo.dev')
  await user.click(screen.getByRole('button', { name: labels.send }))
}
it('anuncia formatos e limite aceitos no campo de imagem', async () => {
  const { input } = await mount()
  expect(input).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp')
  expect(screen.getByText('PNG, JPEG ou WebP · até 2 MB · até 1024 × 1024')).toBeVisible()
})
it.each([
  ['image/gif', 1024, 'Use PNG, JPEG ou WebP.'],
  ['image/svg+xml', 1024, 'Use PNG, JPEG ou WebP.'],
  ['image/png', 2 * 1024 * 1024 + 1, 'A imagem deve ter no máximo 2 MB.'],
])('descarta imagem %s de %s bytes e envia sem arquivo', async (type, size, message) => {
  const { input, user } = await mount()
  pick(input, type as string, size as number)
  expect(toast.error).toHaveBeenCalledWith(message)
  await submit(user)
  await waitFor(() => expect(programsApi.apply).toHaveBeenCalledTimes(1))
  expect(vi.mocked(programsApi.apply).mock.calls[0][0].has('image')).toBe(false)
})
it('envia a candidatura com a imagem escolhida', async () => {
  const { input, user } = await mount()
  const file = pick(input, 'image/png', 4096)
  await submit(user)
  await waitFor(() => expect(programsApi.apply).toHaveBeenCalledTimes(1))
  const form = vi.mocked(programsApi.apply).mock.calls[0][0]
  expect(form.get('image')).toBe(file)
  expect(form.get('name')).toBe('Criadora')
  expect(toast.error).not.toHaveBeenCalled()
})
it('recusa imagem acima do limite no idioma ativo', async () => {
  await i18n.changeLanguage('en')
  const { input, user } = await mount('Join the program')
  expect(screen.getByText('PNG, JPEG or WebP · up to 2 MB · up to 1024 × 1024')).toBeVisible()
  pick(input, 'image/png', 2 * 1024 * 1024 + 1)
  expect(toast.error).toHaveBeenCalledWith('The image must be at most 2 MB.')
})
