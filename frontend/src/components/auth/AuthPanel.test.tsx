// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AuthPanel } from './AuthPanel'

const themeState: { id: string; name: string; presentation: null | Record<string, unknown> } = {
  id: 'valorem',
  name: 'Valorem',
  presentation: {
    renderer: 'portal-v1',
    shells: { auth: { kicker: 'ENTER THE REALM', brand: 'VALOREM' } },
  },
}

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: () => themeState,
}))

vi.mock('../../theme/assets', () => ({
  themeAsset: (path: string) => `/media/themes/valorem/${path}`,
  themeImage: (path: string) => `/theme/default/images/${path}`,
}))

afterEach(() => {
  cleanup()
  themeState.id = 'valorem'
  themeState.name = 'Valorem'
  themeState.presentation = {
    renderer: 'portal-v1',
    shells: { auth: { kicker: 'ENTER THE REALM', brand: 'VALOREM' } },
  }
})

it('renderiza o shell de autenticação declarado pelo tema sem executar HTML do pacote', () => {
  render(<AuthPanel title="Entrar" lead="Bem-vindo"><form><button type="submit">Continuar</button></form></AuthPanel>)

  const surface = screen.getByRole('heading', { name: 'Entrar' }).closest('[data-theme-surface="auth"]')
  expect(surface).toHaveClass('portal-auth-shell')
  expect(screen.getByText('ENTER THE REALM')).toBeVisible()
  expect(screen.getByRole('img', { name: 'VALOREM' })).toHaveAttribute('src', '/media/themes/valorem/images/logo-text.png')
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeVisible()
})

it('marca a superfície auth no caminho default sem portal', () => {
  themeState.id = 'default'
  themeState.name = 'PDL Default'
  themeState.presentation = null

  render(<AuthPanel title="Entrar"><form><button type="submit">Continuar</button></form></AuthPanel>)

  const surface = screen.getByRole('heading', { name: 'Entrar' }).closest('[data-theme-surface="auth"]')
  expect(surface).not.toBeNull()
  expect(surface).not.toHaveClass('portal-auth-shell')
  expect(surface?.querySelector('.auth-hero')).not.toBeNull()
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeVisible()
})
