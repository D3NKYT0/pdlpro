// @vitest-environment jsdom
import { cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { usePanelTheme } from './usePanelTheme'
import { useDefaultTheme } from './useDefaultTheme'
import { PANEL_THEME_STYLES, PUBLIC_THEME_STYLES, themeAsset, themeImage } from './assets'

afterEach(cleanup)
it('monta tema privado e limpa estilos ao sair', () => {
  const { unmount, rerender } = renderHook(usePanelTheme)
  expect(document.documentElement.classList.contains('pdl-panel')).toBe(true)
  expect(document.querySelectorAll('link[data-pdl-panel-theme]')).toHaveLength(PANEL_THEME_STYLES.length)
  rerender()
  expect(document.querySelectorAll('link[data-pdl-panel-theme]')).toHaveLength(PANEL_THEME_STYLES.length)
  unmount()
  expect(document.documentElement.classList.contains('pdl-panel')).toBe(false)
  expect(document.querySelectorAll('link[data-pdl-panel-theme]')).toHaveLength(0)
  expect(document.body.style.minHeight).toBe('')
})
it('monta tema público e remove recursos na desmontagem', () => {
  function Page() { useDefaultTheme(); return <p>Conteúdo</p> }
  const { unmount } = render(<MemoryRouter><Page /></MemoryRouter>)
  expect(document.documentElement.classList.contains('pdl-public')).toBe(true)
  expect(document.querySelectorAll('link[data-pdl-theme]')).toHaveLength(PUBLIC_THEME_STYLES.length)
  unmount()
  expect(document.documentElement.classList.contains('pdl-public')).toBe(false)
  expect(document.querySelectorAll('link[data-pdl-theme]')).toHaveLength(0)
})
it('normaliza barra inicial nos caminhos de assets', () => {
  expect(themeAsset('/css/main.css')).toBe('/theme/default/css/main.css')
  expect(themeImage('/bg/5.jpg')).toBe('/theme/default/images/bg/5.jpg')
})
