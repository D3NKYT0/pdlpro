// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { programsApi } from '../../../services/api'
import { AdminRoadmapSection } from './AdminRoadmapSection'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../ui/RichText', () => ({
  RichTextEditor: ({ value, onChange, 'aria-label': ariaLabel }: { value: string; onChange: (next: string) => void; 'aria-label'?: string }) => (
    <textarea aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  RichTextContent: ({ html }: { html: string }) => <div>{html}</div>,
}))
vi.mock('../../../services/domain/programs.service', () => ({
  programsApi: {
    roadmap: vi.fn(),
    saveRoadmap: vi.fn(),
    deleteRoadmap: vi.fn(),
  },
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(programsApi.roadmap).mockResolvedValue([])
  vi.mocked(programsApi.saveRoadmap).mockResolvedValue({ id: 'entry' } as never)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function mount() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AdminRoadmapSection />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

it('salva atualização do roadmap com as três línguas', async () => {
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Nova atualização' }))
  await user.type(screen.getByLabelText('Título'), 'Expansão')
  await user.type(screen.getByLabelText('Descrição'), 'Novo mapa')
  await user.click(screen.getByRole('tab', { name: 'English' }))
  await user.type(screen.getByLabelText('Título'), 'Expansion')
  await user.type(screen.getByLabelText('Descrição'), 'New map')
  await user.click(screen.getByRole('tab', { name: 'Español' }))
  await user.type(screen.getByLabelText('Título'), 'Expansión')
  await user.click(screen.getByRole('tab', { name: 'Português' }))
  await user.click(screen.getByRole('button', { name: 'Salvar atualização' }))
  await waitFor(() => expect(programsApi.saveRoadmap).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Expansão',
      title_en: 'Expansion',
      title_es: 'Expansión',
      description: 'Novo mapa',
      description_en: 'New map',
      description_es: '',
      category: 'Servidor',
      status: 'planned',
      published: true,
    }),
    undefined,
  ))
  expect(toast.success).toHaveBeenCalledWith('Atualização salva.')
})

it('exige o título em português mesmo com a aba inglesa aberta', async () => {
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Nova atualização' }))
  await user.click(screen.getByRole('tab', { name: 'English' }))
  await user.type(screen.getByLabelText('Título'), 'Expansion')
  await user.click(screen.getByRole('button', { name: 'Salvar atualização' }))
  expect(programsApi.saveRoadmap).not.toHaveBeenCalled()
  expect(toast.error).toHaveBeenCalledWith('Informe o título da atualização')
  expect(screen.getByLabelText('Título')).toHaveValue('')
})
