// @vitest-environment jsdom
import { cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { usePanelTheme } from './usePanelTheme'
import { useDefaultTheme } from './useDefaultTheme'
import { PANEL_THEME_STYLES, PUBLIC_THEME_STYLES, applyThemeSurfaceVars, configureRuntimeTheme, themeAsset, themeImage, themeStylesheet } from './assets'

afterEach(() => {
  cleanup()
  configureRuntimeTheme({})
  document.documentElement.style.cssText = ''
  document.documentElement.removeAttribute('data-panel-density')
})
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
it('remapeia folhas estruturais via assets lógicos', () => {
  expect(themeStylesheet('css/pages/coming-soon.css', '/theme/pages/coming-soon.css')).toBe('/theme/pages/coming-soon.css')
  configureRuntimeTheme({
    'css/pages/coming-soon.css': '/media/themes/demo/coming-soon.css',
    'css/public/layout.css': '/media/themes/demo/layout.css',
  })
  expect(themeStylesheet('css/pages/coming-soon.css', '/theme/pages/coming-soon.css')).toBe('/media/themes/demo/coming-soon.css')
  expect(PUBLIC_THEME_STYLES.map((href) => href)).toContain('/media/themes/demo/coming-soon.css')
  expect(PUBLIC_THEME_STYLES.map((href) => href)).toContain('/media/themes/demo/layout.css')
  expect(PANEL_THEME_STYLES.map((href) => href)).toContain('/theme/pages/panel.css')
  expect(PANEL_THEME_STYLES.map((href) => href)).toContain('/theme/public/css/terms.css')
})
it('aplica superfícies e densidade a partir do layout do pacote', () => {
  configureRuntimeTheme({
    'images/button/1.png': '/media/themes/demo/btn-a.png',
    'images/bg/3.jpg': '/media/themes/demo/art-3.jpg',
  })
  applyThemeSurfaceVars({
    panel: { sidebarWidth: 240, density: 'spacious', radius: 4 },
    surfaces: { buttonPrimary: 'images/button/1.png' },
  })
  const style = document.documentElement.style
  expect(document.documentElement.dataset.panelDensity).toBe('spacious')
  expect(style.getPropertyValue('--panel-sidebar-width')).toBe('240px')
  expect(style.getPropertyValue('--panel-shell-gap')).toBe('36px')
  expect(style.getPropertyValue('--theme-button-primary')).toContain('btn-a.png')
  expect(style.getPropertyValue('--theme-art-bg-3')).toContain('art-3.jpg')
  expect(style.getPropertyValue('--theme-art-games-monster')).toContain('games/monster-default.webp')
})
it('remapeia arte dos jogos pelo mapa de assets do pacote', () => {
  configureRuntimeTheme({
    'images/games/box-legendary.webp': '/media/themes/demo/chest.webp',
  })
  applyThemeSurfaceVars()
  expect(document.documentElement.style.getPropertyValue('--theme-art-games-box-legendary')).toContain(
    'chest.webp',
  )
})
