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

it('reusa o shell de autenticação no renderer club-v1', () => {
  themeState.presentation = {
    renderer: 'club-v1',
    shells: { auth: { kicker: 'ENTRE NA SAGA', brand: 'SAGA CLUB' } },
  }

  render(<AuthPanel title="Entrar" lead="Bem-vindo"><form><button type="submit">Continuar</button></form></AuthPanel>)

  expect(screen.getByRole('heading', { name: 'Entrar' }).closest('[data-theme-surface="auth"]')).toHaveClass('club-auth')
  expect(screen.getByText('ENTRE NA SAGA')).toBeVisible()
  expect(screen.getByRole('img', { name: 'SAGA CLUB' })).toHaveAttribute('src', '/media/themes/valorem/images/logo.png')
})

it('no Vesperlyn do Classic usa o casco do club com o brasão, sem repetir o nome do tema', () => {
  themeState.id = 'default'
  themeState.name = 'PDL Classic'
  themeState.presentation = {
    renderer: 'vesperlyn',
    shells: { auth: { kicker: 'PDL Classic', brand: 'PDL Classic' } },
  }

  render(<AuthPanel title="Entre no Reino" lead="Sessão expirada"><form><button type="submit">Entrar</button></form></AuthPanel>)

  const surface = screen.getByRole('heading', { name: 'Entre no Reino' }).closest('[data-theme-surface="auth"]')
  expect(surface).toHaveClass('portal-auth-shell')
  expect(surface).toHaveClass('club-auth')
  expect(screen.getByText('Acesso ao reino')).toBeVisible()
  expect(screen.queryByRole('img', { name: 'PDL Classic' })).toBeNull()
  expect(surface?.querySelector('.portal-auth-brand__mark .pdl-emblem-stage')).not.toBeNull()
})

it('marca a superfície auth no caminho default sem portal', () => {
  themeState.id = 'default'
  themeState.name = 'PDL Classic'
  themeState.presentation = null

  render(<AuthPanel title="Entrar"><form><button type="submit">Continuar</button></form></AuthPanel>)

  const surface = screen.getByRole('heading', { name: 'Entrar' }).closest('[data-theme-surface="auth"]')
  expect(surface).not.toBeNull()
  expect(surface).not.toHaveClass('portal-auth-shell')
  expect(surface?.querySelector('.auth-hero')).not.toBeNull()
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeVisible()
})
