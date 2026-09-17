// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { BossVictoryModal } from './BossVictoryModal'

vi.mock('../ItemIcon', () => ({ ItemIcon: () => <span data-testid="prize-icon" /> }))

afterEach(cleanup)

it('mostra a corrida, o prêmio e os fogos para printar', async () => {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(
    <BossVictoryModal
      open
      run={{
        name: 'Queen Ant',
        weaponLevel: 10,
        fragments: 7,
        rounds: 8,
        playerCrits: 2,
        bossCrits: 1,
        playerDamage: 512,
        bossDamage: 140,
        prize: { item_id: 57, item_name: 'Adena', quantity: 250000 },
      }}
      onClose={onClose}
    />,
  )
  const dialog = screen.getByRole('dialog', { name: 'Corrida concluída' })
  expect(dialog).toHaveClass('game-boss-victory-modal')
  expect(dialog).toHaveTextContent('Queen Ant caiu')
  expect(dialog).toHaveTextContent('Arma +10')
  expect(dialog).toHaveTextContent('7 fragmentos')
  expect(dialog).toHaveTextContent('2 seus')
  expect(dialog).toHaveTextContent('512 / 140')
  expect(dialog).toHaveTextContent('+250K Adena')
  expect(dialog.querySelector('.weapon-art')).toHaveAttribute('data-enchant', '10')
  expect(dialog.querySelectorAll('.boss-victory-firework').length).toBe(16)
  expect(dialog.querySelectorAll('.boss-victory-spark').length).toBe(22)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})
