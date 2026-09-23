// @vitest-environment jsdom
import { cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { usePanelTheme } from './usePanelTheme'
import { applyPublicBodyBackground, useDefaultTheme } from './useDefaultTheme'
import { PANEL_THEME_STYLES, PUBLIC_THEME_STYLES, applyThemeSurfaceVars, configureRuntimeTheme, themeAsset, themeImage, themeLandingHeroImage, themeStylesheet, themeVideo } from './assets'

afterEach(() => {
  cleanup()
  configureRuntimeTheme({})
  document.documentElement.style.cssText = ''
  document.documentElement.removeAttribute('data-panel-density')
})
it('monta tema privado e limpa estilos ao sair', () => {
  const { unmount, rerender } = renderHook(usePanelTheme)
  expect(document.documentElement.classList.contains('pdl-panel')).toBe(true)
  expect(document.body.style.backgroundImage).toContain('var(--theme-panel-body-bg')
  expect(document.body.style.backgroundColor).toBe('var(--theme-bg-deep)')
  expect(document.querySelectorAll('link[data-pdl-panel-theme]')).toHaveLength(PANEL_THEME_STYLES.length)
  rerender()
  expect(document.querySelectorAll('link[data-pdl-panel-theme]')).toHaveLength(PANEL_THEME_STYLES.length)
  unmount()
  expect(document.documentElement.classList.contains('pdl-panel')).toBe(false)
  expect(document.querySelectorAll('link[data-pdl-panel-theme]')).toHaveLength(0)
  expect(document.body.style.minHeight).toBe('')
})
it('no saga o corpo das telas internas fica só com cor', () => {
  applyPublicBodyBackground('saga', '/roadmap')
  expect(document.body.style.backgroundImage).toBe('none')
  expect(document.body.style.background).not.toContain('bg/5')
  expect(document.body.style.backgroundColor).toBe('rgb(5, 5, 5)')

  applyPublicBodyBackground('saga', '/')
  expect(document.body.style.background).toContain('bg/5')

  applyPublicBodyBackground('default', '/roadmap')
  expect(document.body.style.background).toContain('bg/5')
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
it('o brasão do pacote instalado substitui o pdl-symbol padrão', () => {
  configureRuntimeTheme({
    'images/pdl-symbol.svg': '/media/themes/packaged/1.0.0/images/pdl-symbol.png',
  })
  expect(themeImage('pdl-symbol.svg')).toContain('pdl-symbol.png')
})

it('normaliza barra inicial nos caminhos de assets', () => {
  expect(themeAsset('/css/main.css')).toBe('/theme/default/css/main.css')
  expect(themeImage('/bg/5.jpg')).toBe('/theme/default/images/bg/5.jpg')
  expect(themeVideo('/coming-soon/video.mp4')).toBe('/theme/default/videos/coming-soon/video.mp4')
})

it('usa o castelo do hero da landing quando o tema club declara hero-bg', () => {
  expect(themeLandingHeroImage()).toBe('/theme/default/images/bg/1.png')
  configureRuntimeTheme({
    'images/hero-bg.jpg': '/media/themes/saga/1.0.0/images/hero-bg.jpg',
  })
  expect(themeLandingHeroImage()).toBe('/media/themes/saga/1.0.0/images/hero-bg.jpg')
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
  expect(PUBLIC_THEME_STYLES.map((href) => href)).toContain('/theme/pages/templates.css')
  expect(PANEL_THEME_STYLES.map((href) => href)).toContain('/theme/pages/panel.css')
  expect(PANEL_THEME_STYLES.map((href) => href)).toContain('/theme/public/css/terms.css')
})
it('aplica superfícies e densidade a partir do layout do pacote', () => {
  configureRuntimeTheme({
    'images/button/1.png': '/media/themes/demo/btn-a.png',
    'images/button/3.png': '/media/themes/demo/btn-c.png',
    'images/bg/3.jpg': '/media/themes/demo/art-3.jpg',
    'images/bg/5.jpg': '/media/themes/demo/art-5.jpg',
  })
  applyThemeSurfaceVars({
    panel: { sidebarWidth: 240, density: 'spacious', radius: 4 },
    surfaces: { buttonPrimary: 'images/button/1.png', buttonTab: 'images/button/3.png' },
  })
  const style = document.documentElement.style
  expect(document.documentElement.dataset.panelDensity).toBe('spacious')
  expect(style.getPropertyValue('--panel-sidebar-width')).toBe('240px')
  expect(style.getPropertyValue('--panel-shell-gap')).toBe('36px')
  expect(style.getPropertyValue('--theme-button-primary')).toContain('btn-a.png')
  expect(style.getPropertyValue('--theme-button-tab')).toContain('btn-c.png')
  expect(style.getPropertyValue('--theme-art-bg-1')).toContain('bg/1.png')
  expect(style.getPropertyValue('--theme-art-bg-3')).toContain('art-3.jpg')
  expect(style.getPropertyValue('--theme-art-bg-5')).toContain('art-5.jpg')
  expect(style.getPropertyValue('--theme-art-wallet-promo')).toContain('wallet-promo-banner.png')
  expect(style.getPropertyValue('--theme-art-games-monster')).toContain('games/monster-default.webp')
  expect(style.getPropertyValue('--theme-art-games-monster-drake')).toContain('games/monster-drake.webp')
  expect(style.getPropertyValue('--theme-art-games-monster-death-knight')).toContain(
    'games/monster-death-knight.webp',
  )
  expect(style.getPropertyValue('--theme-art-games-monster-queen-ant')).toContain(
    'games/monster-queen-ant.webp',
  )
})
it('remapeia arte dos jogos pelo mapa de assets do pacote', () => {
  configureRuntimeTheme({
    'images/games/box-legendary.webp': '/media/themes/demo/chest.webp',
    'images/games/box-legendary-open.webp': '/media/themes/demo/chest-open.webp',
  })
  applyThemeSurfaceVars()
  expect(document.documentElement.style.getPropertyValue('--theme-art-games-box-legendary')).toContain(
    'chest.webp',
  )
  expect(document.documentElement.style.getPropertyValue('--theme-art-games-box-legendary-open')).toContain(
    'chest-open.webp',
  )
})
it('publica as sprites da pescaria no tema', () => {
  applyThemeSurfaceVars()
  expect(document.documentElement.style.getPropertyValue('--theme-art-games-fish-dourado')).toContain(
    'games/fish-dourado.webp',
  )
  expect(document.documentElement.style.getPropertyValue('--theme-art-games-fish-pirarucu')).toContain(
    'games/fish-pirarucu.webp',
  )
  expect(document.documentElement.style.getPropertyValue('--theme-art-games-fish-serafim')).toContain(
    'games/fish-serafim.webp',
  )
  expect(document.documentElement.style.getPropertyValue('--theme-art-games-sword-10')).toContain(
    'games/sword-10.webp',
  )
  expect(document.documentElement.style.getPropertyValue('--theme-art-games-rod-1')).toContain(
    'games/rod-1.webp',
  )
  expect(document.documentElement.style.getPropertyValue('--theme-art-games-rod-10')).toContain(
    'games/rod-10.webp',
  )
})
it('publica a arte da loja no tema', () => {
  applyThemeSurfaceVars()
  expect(document.documentElement.style.getPropertyValue('--theme-art-shop-hall')).toContain('shop/hall.png')
  expect(document.documentElement.style.getPropertyValue('--theme-art-shop-crate')).toContain('shop/crate.png')
  expect(document.documentElement.style.getPropertyValue('--theme-art-shop-coins')).toContain('shop/coins.png')
})
it('remapeia arte da loja pelo mapa de assets do pacote', () => {
  configureRuntimeTheme({ 'images/shop/hall.png': '/media/themes/demo/bazaar.png' })
  applyThemeSurfaceVars()
  expect(document.documentElement.style.getPropertyValue('--theme-art-shop-hall')).toContain('bazaar.png')
})
