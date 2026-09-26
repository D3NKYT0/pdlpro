// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { WalletCheckoutModal } from './WalletCheckoutModal'
import type { ApiPaymentOrder } from '../../services/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const mockOrder: ApiPaymentOrder = {
  id: 'ord-123',
  amount: '50.00',
  coins: '500.00',
  currency: 'BRL',
  package_code: 'pack-500',
  method: 'mercadopago',
  status: 'pending',
  checkout_url: '',
  bonus_applied: '50.00',
  total_credited: '0.00',
  created_at: '2026-09-26T12:00:00Z',
  paid_at: null,
}

it('renderiza resumo do pedido e campo de documento no modal', async () => {
  const onDocumentChange = vi.fn()
  const onClose = vi.fn()
  const user = userEvent.setup()

  render(
    <WalletCheckoutModal
      open={true}
      order={mockOrder}
      onClose={onClose}
      document=""
      onDocumentChange={onDocumentChange}
      busy={false}
      onPayStripe={vi.fn()}
      simulatedPayment={false}
      packages={[{ id: 'pack-500', name: 'Baú de Moedas', price_brl: '50.00', price_usd: '10.00', total_coins: '550', bonus: '50', badge: 'Popular' } as any]}
    />,
  )

  expect(screen.getByRole('dialog', { name: 'Meios de pagamento' })).toBeInTheDocument()
  expect(screen.getByText('Baú de Moedas')).toBeInTheDocument()
  expect(screen.getByText('R$ 50,00')).toBeInTheDocument()
  expect(screen.getByText('Popular')).toBeInTheDocument()

  const docInput = screen.getByLabelText('CPF ou CNPJ do pagador')
  await user.type(docInput, '10505627477')
  expect(onDocumentChange).toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: 'Cancelar e voltar' }))
  expect(onClose).toHaveBeenCalled()
})

it('exibe tela dedicada de PIX com QR code e botão de cópia', async () => {
  const pixOrder: ApiPaymentOrder = {
    ...mockOrder,
    pix_qr_code: '00020126580014br.gov.bcb.pix...',
    pix_qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  }

  const writeTextMock = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: { writeText: writeTextMock },
  })

  render(
    <WalletCheckoutModal
      open={true}
      order={pixOrder}
      onClose={vi.fn()}
      document="10505627477"
      onDocumentChange={vi.fn()}
      busy={false}
      onPayStripe={vi.fn()}
      simulatedPayment={false}
      packages={[]}
    />,
  )

  expect(screen.getByRole('dialog', { name: 'Pagamento via PIX' })).toBeInTheDocument()
  expect(screen.getByAltText('QR Code PIX')).toBeInTheDocument()
  expect(screen.getByText('Aguardando confirmação bancária...')).toBeInTheDocument()

  const copyButton = screen.getByRole('button', { name: 'Copiar código PIX' })
  fireEvent.click(copyButton)

  expect(writeTextMock).toHaveBeenCalledWith('00020126580014br.gov.bcb.pix...')
  expect(await screen.findByText('Código PIX copiado!')).toBeInTheDocument()
})

it('exibe aviso de simulação quando método for mock', () => {
  const mockSimOrder: ApiPaymentOrder = {
    ...mockOrder,
    method: 'mock',
  }

  render(
    <WalletCheckoutModal
      open={true}
      order={mockSimOrder}
      onClose={vi.fn()}
      document=""
      onDocumentChange={vi.fn()}
      busy={false}
      onPayStripe={vi.fn()}
      simulatedPayment={true}
      packages={[]}
    />,
  )

  expect(screen.getByText('Pedido simulado criado')).toBeInTheDocument()
})
