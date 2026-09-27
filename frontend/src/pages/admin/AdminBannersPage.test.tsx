// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminBannersPage } from './AdminBannersPage'
import { staffApi, type ApiStaffBanner } from '../../services/api'

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../services/domain/staff.service', () => ({
  staffApi: {
    banners: vi.fn(),
    saveBanner: vi.fn(),
    deleteBanner: vi.fn(),
  },
}))

const sampleBanner: ApiStaffBanner = {
  id: 'banner-test-1',
  title: 'Promoção de Diamantes',
  title_en: 'Diamond Promotion',
  title_es: 'Promoción de Diamantes',
  badge: 'PROMO',
  description: 'Compre 100 e ganhe 20 bônus.',
  description_en: 'Buy 100 get 20 bonus.',
  description_es: 'Compra 100 y llévate 20 gratis.',
  image: 'https://example.com/promo.webp',
  link: 'https://example.com/diamonds',
  link_text: 'Aproveitar',
  link_text_en: 'Claim',
  link_text_es: 'Aprovechar',
  secondary_link: '',
  secondary_link_text: '',
  secondary_link_text_en: '',
  secondary_link_text_es: '',
  display_type: 'popup',
  target_location: 'landing_and_coming_soon',
  dismiss_policy: 'days',
  dismiss_days: 2,
  auto_close: false,
  auto_close_delay: 10,
  show_close_button: true,
  width: 600,
  height: 0,
  is_active: true,
  order: 1,
}

function mount() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminBannersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

describe('AdminBannersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(staffApi.banners).mockResolvedValue([sampleBanner])
    vi.mocked(staffApi.saveBanner).mockResolvedValue(sampleBanner)
    vi.mocked(staffApi.deleteBanner).mockResolvedValue({ deleted: true })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders registered banners catalog', async () => {
    mount()

    expect(await screen.findByText('Promoção de Diamantes')).toBeInTheDocument()
    expect(screen.getByText('PROMO')).toBeInTheDocument()
    expect(screen.getByText('Modal Rico')).toBeInTheDocument()
  })

  it('loads banner into editor on Edit button click', async () => {
    mount()

    const editBtn = await screen.findByRole('button', { name: 'Editar' })
    fireEvent.click(editBtn)

    const titleInput = screen.getByDisplayValue('Promoção de Diamantes')
    expect(titleInput).toBeInTheDocument()
  })

  it('submits updated banner and calls staffApi.saveBanner', async () => {
    mount()

    const editBtn = await screen.findByRole('button', { name: 'Editar' })
    fireEvent.click(editBtn)

    const submitBtn = screen.getByRole('button', { name: 'Atualizar Banner' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(staffApi.saveBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'banner-test-1',
          title: 'Promoção de Diamantes',
        }),
      )
    })
  })

  it('deletes banner on Delete button click after confirmation', async () => {
    mount()

    const deleteBtn = await screen.findByTitle('Excluir')
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(staffApi.deleteBanner).toHaveBeenCalledWith('banner-test-1')
    })
  })

  it('opens preview modal when Preview button is clicked', async () => {
    mount()

    const previewBtn = await screen.findByLabelText('preview-banner-item')
    fireEvent.click(previewBtn)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Compre 100 e ganhe 20 bônus.')
  })

  it('handles image upload and submits FormData', async () => {
    mount()

    const titleInput = screen.getByPlaceholderText('Ex: Inauguração do Servidor')
    fireEvent.change(titleInput, { target: { value: 'Novo Banner Flyer' } })

    const file = new File(['dummy png content'], 'flyer.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(await screen.findByText('flyer.png')).toBeInTheDocument()
    expect(screen.getByText('✓ Visualização da Imagem / Flyer')).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: 'Criar Banner' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(staffApi.saveBanner).toHaveBeenCalledWith(expect.any(FormData))
      const callArg = vi.mocked(staffApi.saveBanner).mock.calls[0][0] as FormData
      expect(callArg.get('title')).toBe('Novo Banner Flyer')
      expect(callArg.get('image')).toBeInstanceOf(File)
    })
  })

  it('handles removing an image from existing banner', async () => {
    mount()

    const editBtn = await screen.findByRole('button', { name: 'Editar' })
    fireEvent.click(editBtn)

    expect(await screen.findByText('✓ Visualização da Imagem / Flyer')).toBeInTheDocument()

    const removeBtn = screen.getByRole('button', { name: 'Remover Imagem' })
    fireEvent.click(removeBtn)

    expect(screen.queryByText('✓ Visualização da Imagem / Flyer')).not.toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: 'Atualizar Banner' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(staffApi.saveBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'banner-test-1',
          image: '',
          clear_image: true,
        }),
      )
    })
  })
})
