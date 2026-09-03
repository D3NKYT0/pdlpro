// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AuthPanel } from './AuthPanel'

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    id: 'valorem', name: 'Valorem',
    presentation: {
      renderer: 'portal-v1',
      shells: { auth: { kicker: 'ENTER THE REALM', brand: 'VALOREM' } },
    },
  }),
}))

vi.mock('../../theme/assets', () => ({
  themeAsset: (path: string) => `/media/themes/valorem/${path}`,
  themeImage: (path: string) => `/theme/default/images/${path}`,
}))

afterEach(cleanup)

it('renderiza o shell de autenticação declarado pelo tema sem executar HTML do pacote', () => {
  render(<AuthPanel title="Entrar" lead="Bem-vindo"><form><button type="submit">Continuar</button></form></AuthPanel>)

  const surface = screen.getByRole('heading', { name: 'Entrar' }).closest('[data-theme-surface="auth"]')
  expect(surface).toHaveClass('portal-auth-shell')
  expect(screen.getByText('ENTER THE REALM')).toBeVisible()
  expect(screen.getByRole('img', { name: 'VALOREM' })).toHaveAttribute('src', '/media/themes/valorem/images/logo-text.png')
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeVisible()
})
