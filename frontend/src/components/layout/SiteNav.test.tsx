// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { SiteNav } from './SiteNav'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

afterEach(cleanup)

it('destaca a rota atual e controla o menu por botão, fundo e Escape', async () => {
  const user = userEvent.setup()
  const { container } = render(<MemoryRouter initialEntries={['/rankings']}><SiteNav /></MemoryRouter>)

  expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Rankings' })).toHaveAttribute('aria-current', 'page')
  expect(container.querySelector('.site-nav-brand .site-brand-mark')).toHaveAttribute('src', '/theme/default/images/pdl-symbol.svg')

  const toggle = screen.getByRole('button', { name: 'Abrir menu' })
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(container.querySelector('.site-nav-drawer')).toHaveClass('is-open')

  await user.click(container.querySelector('.site-nav-backdrop') as HTMLButtonElement)
  expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await user.click(toggle)

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(container.querySelector('.site-nav-drawer')).not.toHaveClass('is-open')
})
