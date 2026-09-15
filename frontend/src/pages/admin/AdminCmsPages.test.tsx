// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import toast from 'react-hot-toast'
import { ApiError, staffApi } from '../../services/api'
import { AdminCalendarPage } from './AdminCalendarPage'
import { AdminFaqPage } from './AdminFaqPage'
import { AdminWikiPage } from './AdminWikiPage'
import { AdminDownloadsPage } from './AdminDownloadsPage'
import { AdminNotificationsPage } from './AdminNotificationsPage'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../components/ui/RichText', () => ({
  RichTextEditor: ({ value, onChange, 'aria-label': ariaLabel }: { value: string; onChange: (next: string) => void; 'aria-label'?: string }) => (
    <textarea aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  RichTextContent: ({ html }: { html: string }) => <div>{html}</div>,
}))
vi.mock('../../services/domain/staff.service', () => ({
  staffApi: {
    calendar: vi.fn(),
    saveCalendar: vi.fn(),
    deleteCalendar: vi.fn(),
    faq: vi.fn(),
    saveFaq: vi.fn(),
    deleteFaq: vi.fn(),
    wiki: vi.fn(),
    saveWiki: vi.fn(),
    deleteWiki: vi.fn(),
    downloads: vi.fn(),
    saveDownload: vi.fn(),
    deleteDownload: vi.fn(),
    notifications: vi.fn(),
    sendNotification: vi.fn(),
    deleteNotification: vi.fn(),
  },
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.mocked(staffApi.calendar).mockResolvedValue([])
  vi.mocked(staffApi.faq).mockResolvedValue([])
  vi.mocked(staffApi.wiki).mockResolvedValue([])
  vi.mocked(staffApi.downloads).mockResolvedValue([])
  vi.mocked(staffApi.notifications).mockResolvedValue([])
  vi.mocked(staffApi.saveCalendar).mockResolvedValue({ id: 'event' } as any)
  vi.mocked(staffApi.saveFaq).mockResolvedValue({ id: 'faq' } as any)
  vi.mocked(staffApi.saveWiki).mockResolvedValue({ id: 'wiki' } as any)
  vi.mocked(staffApi.saveDownload).mockResolvedValue({ id: 'file' } as any)
  vi.mocked(staffApi.sendNotification).mockResolvedValue({ id: 'note', sent: 1 } as any)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function mount(page: ReactElement) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{page}</MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

it('cria evento no calendário e bloqueia envio duplicado', async () => {
  let resolveSave: (value: unknown) => void = () => {}
  const pending = new Promise((resolve) => { resolveSave = resolve })
  vi.mocked(staffApi.saveCalendar).mockReturnValue(pending as any)
  const user = mount(<AdminCalendarPage />)
  await user.type(screen.getByLabelText('Título'), 'Siege')
  fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2027-01-03T18:00' } })
  fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2027-01-03T20:00' } })
  const submit = screen.getByRole('button', { name: 'Criar evento' })
  await user.click(submit)
  await user.click(submit)
  expect(staffApi.saveCalendar).toHaveBeenCalledTimes(1)
  expect(staffApi.saveCalendar).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Siege',
    title_en: '',
    title_es: '',
    description: '',
    description_en: '',
    description_es: '',
    is_published: true,
  }))
  resolveSave({ id: 'event' })
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Evento criado'))
})

it('calendário rejeitado mantém o título para correção', async () => {
  vi.mocked(staffApi.saveCalendar).mockRejectedValue(new ApiError('A data de término deve ser posterior ao início.', 400, 'VALIDATION_ERROR'))
  const user = mount(<AdminCalendarPage />)
  await user.type(screen.getByLabelText('Título'), 'Siege')
  fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2027-01-03T18:00' } })
  fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2027-01-03T17:00' } })
  await user.click(screen.getByRole('button', { name: 'Criar evento' }))
  expect(toast.error).toHaveBeenCalledWith('A data de término deve ser posterior ao início.')
  expect(screen.getByLabelText('Título')).toHaveValue('Siege')
})

it('envia traduções EN e ES do evento junto com o português', async () => {
  const user = mount(<AdminCalendarPage />)
  await user.type(screen.getByLabelText('Título'), 'Cerco')
  await user.type(screen.getByLabelText('Descrição'), 'Castelos')
  await user.click(screen.getByRole('tab', { name: 'English' }))
  await user.type(screen.getByLabelText('Título'), 'Siege')
  await user.type(screen.getByLabelText('Descrição'), 'Castles')
  await user.click(screen.getByRole('tab', { name: 'Español' }))
  await user.type(screen.getByLabelText('Título'), 'Asedio')
  await user.click(screen.getByRole('tab', { name: 'Português' }))
  fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2027-01-03T18:00' } })
  fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2027-01-03T20:00' } })
  await user.click(screen.getByRole('button', { name: 'Criar evento' }))
  expect(staffApi.saveCalendar).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Cerco',
    title_en: 'Siege',
    title_es: 'Asedio',
    description: 'Castelos',
    description_en: 'Castles',
    description_es: '',
  }))
})

it('envia aviso a um usuário e exige confirmação para excluir', async () => {
  vi.mocked(staffApi.notifications).mockResolvedValue([
    { id: 'note', user_id: 'u1', username: 'hero', title: 'Manutenção', body: '', kind: 'info', link: '', is_read: false, created_at: '2027-01-03T18:00:00Z' },
  ])
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  const user = mount(<AdminNotificationsPage />)
  await user.type(screen.getByLabelText('Título'), 'Manutenção')
  await user.type(screen.getByLabelText('Usuário de destino'), 'hero')
  await user.click(screen.getByRole('button', { name: 'Enviar aviso' }))
  expect(staffApi.sendNotification).toHaveBeenCalledWith({
    title: 'Manutenção',
    body: '',
    kind: 'info',
    link: '',
    username: 'hero',
    broadcast: false,
  })
  await user.click(await screen.findByRole('button', { name: 'Excluir' }))
  expect(staffApi.deleteNotification).not.toHaveBeenCalled()
})

it('cria artigo de FAQ em português', async () => {
  const user = mount(<AdminFaqPage />)
  await user.type(screen.getByLabelText('Pergunta'), 'Como doar?')
  await user.type(screen.getByLabelText('Resposta completa'), 'Pela carteira.')
  await user.click(screen.getByRole('button', { name: 'Criar artigo' }))
  expect(staffApi.saveFaq).toHaveBeenCalledWith(expect.objectContaining({
    question: 'Como doar?',
    answer: 'Pela carteira.',
    category: 'getting_started',
    audience: 'public',
    assistant_only: false,
    is_published: true,
  }))
})

it('cria página da wiki com corpo obrigatório', async () => {
  const user = mount(<AdminWikiPage />)
  await user.type(screen.getByLabelText('Título'), 'Comandos')
  await user.type(screen.getByLabelText('Conteúdo'), 'Lista de comandos')
  await user.click(screen.getByRole('button', { name: 'Criar página' }))
  expect(staffApi.saveWiki).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Comandos',
    body: 'Lista de comandos',
    is_published: true,
  }))
})

it('cria download com URL', async () => {
  const user = mount(<AdminDownloadsPage />)
  await user.type(screen.getByLabelText('Título'), 'Cliente')
  await user.type(screen.getByLabelText('URL'), 'https://files.pdl.dev/client.zip')
  await user.click(screen.getByRole('button', { name: 'Criar download' }))
  expect(staffApi.saveDownload).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Cliente',
    url: 'https://files.pdl.dev/client.zip',
    category: 'client',
    is_published: true,
  }))
})
