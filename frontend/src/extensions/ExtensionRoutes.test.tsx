/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { extensionRouteElements } from './ExtensionRoutes'
import '../i18n'

afterEach(() => {
  cleanup()
})

it('não monta rotas quando nenhuma extensão está habilitada', () => {
  render(
    <MemoryRouter initialEntries={['/ext/example/ping']}>
      <Routes>
        {extensionRouteElements('public', '')}
        <Route path="*" element={<p>fallback</p>} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByText('fallback')).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Extensão de exemplo' })).toBeNull()
})

it('monta o ping do skeleton quando example está habilitado', () => {
  render(
    <MemoryRouter initialEntries={['/ext/example/ping']}>
      <Routes>
        {extensionRouteElements('public', 'example')}
        <Route path="*" element={<p>fallback</p>} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { level: 1, name: 'Extensão de exemplo' })).toBeTruthy()
  expect(screen.queryByText('fallback')).toBeNull()
})
