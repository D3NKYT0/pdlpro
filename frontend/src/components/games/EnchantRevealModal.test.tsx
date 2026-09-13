// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { EnchantRevealModal } from './EnchantRevealModal'

afterEach(cleanup)

it('mostra a tentativa sem permitir continuar', () => {
  render(<EnchantRevealModal open attempting success={false} from={3} toward={4} level={3} onClose={vi.fn()} />)
  const dialog = screen.getByRole('dialog', { name: 'Encantando…' })
  expect(dialog).toHaveClass('game-enchant-reveal-modal', 'is-attempting')
  expect(dialog.querySelector('.enchant-reveal-kicker')).toHaveTextContent('Tentando +3 → +4')
  expect(dialog.querySelector('.enchant-reveal-outcome')).toHaveTextContent('A forja está trabalhando')
  expect(dialog.querySelector('.weapon-art.is-from')).toHaveAttribute('data-enchant', '3')
  expect(dialog.querySelector('.weapon-art.is-toward')).toHaveAttribute('data-enchant', '4')
  expect(dialog.querySelector('.enchant-reveal-burst')).toBeNull()
  expect(dialog.querySelector('.enchant-reveal-ash')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
})

it('revela vitória com passo, explosão e continuação', async () => {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(<EnchantRevealModal open attempting={false} success from={3} toward={4} level={4} onClose={onClose} />)
  const dialog = screen.getByRole('dialog', { name: 'Vitória' })
  expect(dialog).toHaveClass('is-win')
  expect(dialog).not.toHaveClass('is-attempting', 'is-loss', 'is-peak')
  expect(dialog.querySelector('.enchant-reveal-kicker')).toHaveTextContent('+3 → +4')
  expect(dialog.querySelector('.enchant-reveal-outcome')).toHaveTextContent('A arma subiu para +4')
  expect(dialog.querySelector('.enchant-reveal-level .is-toward')).toHaveTextContent('+4')
  expect(dialog.querySelectorAll('.enchant-reveal-burst-spark').length).toBe(14)
  expect(dialog.querySelectorAll('.enchant-reveal-mote').length).toBe(8)
  expect(dialog.querySelectorAll('.enchant-reveal-orb').length).toBe(0)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('revela derrota com a tentativa falha e brasas', async () => {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(<EnchantRevealModal open attempting={false} success={false} from={3} toward={4} level={3} onClose={onClose} />)
  const dialog = screen.getByRole('dialog', { name: 'Derrota' })
  expect(dialog).toHaveClass('is-loss')
  expect(dialog.querySelector('.enchant-reveal-kicker')).toHaveTextContent('Tentou +3 → +4')
  expect(dialog.querySelector('.enchant-reveal-outcome')).toHaveTextContent('A arma permanece +3')
  expect(dialog.querySelectorAll('.enchant-reveal-ember').length).toBe(10)
  expect(dialog.querySelector('.enchant-reveal-burst')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('celebra o encante máximo com o prêmio e o reinício', () => {
  render(<EnchantRevealModal open attempting={false} success from={9} toward={10} level={0} onClose={vi.fn()} />)
  const dialog = screen.getByRole('dialog', { name: 'Encante máximo' })
  expect(dialog).toHaveClass('is-win', 'is-peak')
  expect(dialog.querySelector('.enchant-reveal-kicker')).toHaveTextContent('+9 → +10')
  expect(dialog.querySelector('.enchant-reveal-outcome')).toHaveTextContent('O +10 entrega o prêmio e a arma recomeça')
  expect(dialog.querySelector('.weapon-art.is-toward')).toHaveAttribute('data-enchant', '10')
  expect(dialog.querySelector('.enchant-reveal-level .is-toward')).toHaveTextContent('+10')
  expect(dialog.querySelectorAll('.enchant-reveal-orb').length).toBe(5)
})
