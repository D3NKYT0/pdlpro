// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActiveAccountSwitcher } from './ActiveAccountSwitcher'

const mockContext = {
  activeLogin: 'hero_main',
  activeAccount: { login: 'hero_main', is_primary: true },
  accounts: [
    { login: 'hero_main', is_primary: true },
    { login: 'hero_alt', is_primary: false },
  ],
  isLoading: false,
  setActiveAccount: vi.fn(),
  refreshAccounts: vi.fn(),
}

vi.mock('../../contexts/ActiveAccountContext', () => ({
  useActiveAccount: () => mockContext,
}))

describe('ActiveAccountSwitcher', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockContext.activeLogin = 'hero_main'
    mockContext.accounts = [
      { login: 'hero_main', is_primary: true },
      { login: 'hero_alt', is_primary: false },
    ]
    mockContext.isLoading = false
  })

  afterEach(() => {
    cleanup()
  })

  it('renderiza a conta ativa atual no gatilho', () => {
    render(
      <MemoryRouter>
        <ActiveAccountSwitcher />
      </MemoryRouter>,
    )

    expect(screen.getByText('hero_main')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Seletor de conta de jogo ativa/i })).toBeInTheDocument()
  })

  it('abre o menu suspenso ao clicar e exibe todas as contas', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ActiveAccountSwitcher />
      </MemoryRouter>,
    )

    const trigger = screen.getByRole('button', { name: /Seletor de conta de jogo ativa/i })
    await user.click(trigger)

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('hero_alt')).toBeInTheDocument()
  })

  it('chama setActiveAccount ao selecionar uma conta diferente', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ActiveAccountSwitcher />
      </MemoryRouter>,
    )

    const trigger = screen.getByRole('button', { name: /Seletor de conta de jogo ativa/i })
    await user.click(trigger)

    const altOption = screen.getByRole('menuitem', { name: /hero_alt/i })
    await user.click(altOption)

    expect(mockContext.setActiveAccount).toHaveBeenCalledWith('hero_alt')
  })
})
