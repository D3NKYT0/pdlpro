/**
 * @vitest-environment jsdom
 */
/// <reference types="node" />
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { configureRuntimeTheme } from './assets'
import {
  DEFAULT_LOADER_CHROME,
  LOADER_CHROME_STORAGE_KEY,
  applyCachedLoaderChrome,
  captureLoaderChrome,
  persistAppliedLoaderChrome,
  sanitizeLoaderChrome,
  writeLoaderChrome,
} from './loaderChrome'

afterEach(() => {
  localStorage.clear()
  configureRuntimeTheme({})
  document.documentElement.style.cssText = ''
  delete document.documentElement.dataset.pdlLoaderTheme
  document.getElementById('app-bootstrap-loader')?.remove()
})

it('recusa chrome com URL ou cor injetável', () => {
  expect(
    sanitizeLoaderChrome({
      ...DEFAULT_LOADER_CHROME,
      symbol: 'javascript:alert(1)',
    }),
  ).toBeNull()
  expect(
    sanitizeLoaderChrome({
      ...DEFAULT_LOADER_CHROME,
      symbol: '/media/themes/../secret.png',
    }),
  ).toBeNull()
  expect(
    sanitizeLoaderChrome({
      ...DEFAULT_LOADER_CHROME,
      accent: 'red; background: url(https://evil.test)',
    }),
  ).toBeNull()
})

it('pinta o splash com o chrome do tema e grava o cache', () => {
  document.body.innerHTML = `
    <div id="app-bootstrap-loader">
      <div class="global-loader__crest"><img src="/theme/default/images/pdl-symbol.svg" alt="" /></div>
      <img class="global-loader__wordmark" src="/theme/default/images/logo.png" alt="" />
    </div>`
  document.documentElement.style.setProperty('--theme-accent', '#3dd6c6')
  document.documentElement.style.setProperty('--theme-accent-bright', '#7ef0e4')
  document.documentElement.style.setProperty('--theme-bg-deep', '#050a0c')
  configureRuntimeTheme({
    'images/pdl-symbol.svg': '/media/themes/packaged/1.0.0/images/pdl-symbol.png',
    'images/logo.png': '/media/themes/packaged/1.0.0/images/logo.png',
  })

  persistAppliedLoaderChrome('packaged')

  expect(document.querySelector('#app-bootstrap-loader .global-loader__crest img')).toHaveAttribute(
    'src',
    '/media/themes/packaged/1.0.0/images/pdl-symbol.png',
  )
  expect(document.querySelector('#app-bootstrap-loader .global-loader__wordmark')).toHaveAttribute(
    'src',
    '/media/themes/packaged/1.0.0/images/logo.png',
  )
  expect(document.documentElement.style.getPropertyValue('--loader-accent')).toBe('#3dd6c6')
  expect(document.documentElement.dataset.pdlLoaderTheme).toBe('packaged')
  expect(JSON.parse(localStorage.getItem(LOADER_CHROME_STORAGE_KEY) || '{}')).toMatchObject({
    id: 'packaged',
    symbol: '/media/themes/packaged/1.0.0/images/pdl-symbol.png',
    accent: '#3dd6c6',
    background: '#050a0c',
  })
})

it('o cache reabre o splash com o tema da visita anterior', () => {
  document.body.innerHTML =
    '<div id="app-bootstrap-loader"><img src="/theme/default/images/pdl-symbol.svg" alt="" /></div>'
  writeLoaderChrome({
    id: 'packaged',
    symbol: '/media/themes/packaged/1.0.0/images/pdl-symbol.png',
    accent: '#3dd6c6',
    accentBright: '#7ef0e4',
    background: '#050a0c',
  })

  applyCachedLoaderChrome()

  expect(document.querySelector('#app-bootstrap-loader img')).toHaveAttribute(
    'src',
    '/media/themes/packaged/1.0.0/images/pdl-symbol.png',
  )
  expect(document.documentElement.style.getPropertyValue('--loader-accent')).toBe('#3dd6c6')
})

it('o tema default ignora acento residual e grava o ouro clássico', () => {
  document.documentElement.style.setProperty('--theme-accent', '#3dd6c6')
  document.documentElement.style.setProperty('--theme-accent-bright', '#7ef0e4')
  const chrome = captureLoaderChrome('default')
  expect(chrome).toEqual(DEFAULT_LOADER_CHROME)
})

it('mantém o brasão instalado quando a URL traz cache-bust', () => {
  document.body.innerHTML = `
    <div id="app-bootstrap-loader">
      <div class="global-loader__crest"><img src="/theme/default/images/pdl-symbol.svg" alt="" /></div>
    </div>`
  configureRuntimeTheme({
    'images/pdl-symbol.svg': '/media/themes/saga/1.0.0/images/pdl-symbol.png?v=crest2',
  })

  persistAppliedLoaderChrome('saga')

  expect(document.querySelector('#app-bootstrap-loader .global-loader__crest img')).toHaveAttribute(
    'src',
    '/media/themes/saga/1.0.0/images/pdl-symbol.png?v=crest2',
  )
  expect(JSON.parse(localStorage.getItem(LOADER_CHROME_STORAGE_KEY) || '{}').symbol).toBe(
    '/media/themes/saga/1.0.0/images/pdl-symbol.png?v=crest2',
  )
})

it('recusa query injetável no brasão do loader', () => {
  expect(
    sanitizeLoaderChrome({
      ...DEFAULT_LOADER_CHROME,
      symbol: '/media/themes/saga/images/pdl-symbol.png?url=https://evil.test',
    }),
  ).toBeNull()
})

it('sem tokens do pacote cai no chrome clássico, mas mantém o brasão remapeado', () => {
  configureRuntimeTheme({
    'images/pdl-symbol.svg': '/media/themes/packaged/1.0.0/images/pdl-symbol.png',
  })
  const chrome = captureLoaderChrome('packaged')
  expect(chrome.symbol).toContain('pdl-symbol.png')
  expect(chrome.accent).toBe(DEFAULT_LOADER_CHROME.accent)
})

it('o splash HTML usa o layout clássico com losango, wordmark e barra', () => {
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')
  expect(html).toContain('bootstrap-loader.css')
  expect(html).toContain('global-loader__crest')
  expect(html).toContain('global-loader__wordmark')
  expect(html).toContain('global-loader__progress')
  expect(html).toContain('/theme/default/images/logo.png')
  expect(html).not.toContain('<span>LINE</span>')
})

it('o script estático de bootstrap aplica o chrome gravado', () => {
  document.body.innerHTML =
    '<div id="app-bootstrap-loader"><img src="/theme/default/images/pdl-symbol.svg" alt="" /><span>Preparando sua jornada</span></div>'
  localStorage.setItem(
    LOADER_CHROME_STORAGE_KEY,
    JSON.stringify({
      id: 'packaged',
      symbol: '/media/themes/packaged/1.0.0/images/pdl-symbol.png?v=crest2',
      accent: '#3dd6c6',
      accentBright: '#7ef0e4',
      background: '#050a0c',
    }),
  )
  const source = readFileSync(resolve(__dirname, '../../public/bootstrap-language.js'), 'utf8')
  window.eval(source)
  expect(document.querySelector('#app-bootstrap-loader img')).toHaveAttribute(
    'src',
    '/media/themes/packaged/1.0.0/images/pdl-symbol.png?v=crest2',
  )
  expect(document.documentElement.style.getPropertyValue('--loader-accent')).toBe('#3dd6c6')
  expect(document.documentElement.getAttribute('data-pdl-loader-theme')).toBe('packaged')
})
