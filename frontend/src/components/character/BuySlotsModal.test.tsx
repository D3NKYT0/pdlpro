// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { BuySlotsModal } from './BuySlotsModal'

afterEach(() => {
  cleanup()
})

it('renderiza título, slots atuais, saldo da carteira e total calculado', () => {
  render(
    <MemoryRouter>
      <BuySlotsModal
        open={true}
        unitPrice={10}
        walletBalance={50}
        currentSlots={{ used: 3, total: 3 }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    </MemoryRouter>,
  )

  expect(screen.getByText('Comprar slots de conta')).toBeVisible()
  expect(screen.getByText('3 / 3')).toBeVisible()
  expect(screen.getByText('50.00 moedas')).toBeVisible()
  expect(screen.getByText('Novo limite total: 4 contas')).toBeVisible()
})

it('permite selecionar quantidade rápida e confirma a compra', async () => {
  const user = userEvent.setup()
  const onConfirm = vi.fn().mockResolvedValue(undefined)

  render(
    <MemoryRouter>
      <BuySlotsModal
        open={true}
        unitPrice={10}
        walletBalance={50}
        currentSlots={{ used: 3, total: 3 }}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: '+3 slots' }))

  expect(screen.getByText('Novo limite total: 6 contas')).toBeVisible()
  expect(screen.getByText('30.00')).toBeVisible()

  await user.click(screen.getByRole('button', { name: /Comprar 3 slot\(s\) por 30\.00 moedas/i }))
  expect(onConfirm).toHaveBeenCalledWith(3)
})

it('exibe alerta de saldo insuficiente e desativa botão de compra', () => {
  render(
    <MemoryRouter>
      <BuySlotsModal
        open={true}
        unitPrice={10}
        walletBalance={5}
        currentSlots={{ used: 3, total: 3 }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    </MemoryRouter>,
  )

  expect(screen.getByText('Saldo insuficiente na carteira para esta quantidade.')).toBeVisible()
  expect(screen.getByRole('link', { name: /Recarregar carteira/i })).toHaveAttribute('href', '/panel/wallet')
  expect(screen.getByRole('button', { name: /Comprar 1 slot\(s\)/i })).toBeDisabled()
})

it('exibe aviso quando o serviço está desativado', () => {
  render(
    <MemoryRouter>
      <BuySlotsModal
        open={true}
        unitPrice={10}
        walletBalance={50}
        currentSlots={{ used: 3, total: 3 }}
        isAvailable={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    </MemoryRouter>,
  )

  expect(screen.getByText('A compra de slots está temporariamente desativada pelo servidor.')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Comprar/i })).not.toBeInTheDocument()
})
