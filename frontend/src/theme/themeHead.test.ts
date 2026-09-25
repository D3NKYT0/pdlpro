// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, expect, it } from 'vitest'
import { applyThemeChromeColors, applyThemeHeadIcons, resolveThemeFaviconHref } from './themeHead'

afterEach(() => {
  document.head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]').forEach((n) => n.remove())
  document.head.querySelectorAll('meta[name="theme-color"], meta[name="msapplication-TileColor"]').forEach((n) => n.remove())
  document.documentElement.style.cssText = ''
})

it('resolve o favicon do pacote por images/favicon.png ou seo.ogImage', () => {
  expect(
    resolveThemeFaviconHref({
      assets: { 'images/favicon.png': '/media/themes/pack/favicon.png' },
      metadata: { site: {}, seo: { ogImage: 'images/logo.png' }, social: {}, server: {} },
    }),
  ).toBe('/media/themes/pack/favicon.png')
  expect(
    resolveThemeFaviconHref({
      assets: { 'images/logo.png': '/media/themes/pack/logo.png' },
      metadata: { site: {}, seo: { ogImage: 'images/logo.png' }, social: {}, server: {} },
    }),
  ).toBe('/media/themes/pack/logo.png')
  expect(resolveThemeFaviconHref({ assets: {}, metadata: null })).toBe('')
})

it('atualiza icon, apple-touch e mask-icon e restaura ao Classic', () => {
  document.head.insertAdjacentHTML(
    'beforeend',
    `
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
    <link rel="mask-icon" href="/favicon/safari-pinned-tab.svg" color="#d4ad62" />
    `,
  )
  document.documentElement.style.setProperty('--theme-accent', '#3dd6c6')

  applyThemeHeadIcons({
    assets: { 'images/favicon.png': '/media/themes/pack/favicon.png' },
    metadata: null,
  })

  const icons = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'))
  expect(icons).toHaveLength(2)
  expect(icons.every((link) => link.getAttribute('href') === '/media/themes/pack/favicon.png')).toBe(true)
  expect(document.querySelector('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/media/themes/pack/favicon.png',
  )
  expect(document.querySelector('link[rel="mask-icon"]')).toHaveAttribute('href', '/media/themes/pack/favicon.png')
  expect(document.querySelector('link[rel="mask-icon"]')).toHaveAttribute('color', '#3dd6c6')

  applyThemeHeadIcons({ assets: {}, metadata: null })
  expect(document.querySelector('link[rel="icon"][sizes="any"]')).toHaveAttribute('href', '/favicon.ico')
  expect(document.querySelector('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    'href',
    '/favicon/favicon-32x32.png',
  )
  expect(document.querySelector('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/favicon/apple-touch-icon.png',
  )
  expect(document.querySelector('link[rel="mask-icon"]')).toHaveAttribute('href', '/favicon/safari-pinned-tab.svg')
  expect(document.querySelector('link[rel="mask-icon"]')).toHaveAttribute('color', '#d4ad62')
})

it('espelha o acento em theme-color e restaura o valor original', () => {
  document.head.insertAdjacentHTML('beforeend', '<meta name="theme-color" content="#0b0a08" />')
  document.documentElement.style.setProperty('--theme-accent', '#c5a161')
  applyThemeChromeColors({ builtin: false })
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#c5a161')
  expect(document.querySelector('meta[name="msapplication-TileColor"]')).toHaveAttribute('content', '#c5a161')

  applyThemeChromeColors({ builtin: true })
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0a08')
})
