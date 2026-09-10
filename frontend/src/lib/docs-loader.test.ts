// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), '../backend/static/pdl_admin/js/docs-loader.js'),
  'utf8',
)

type DocsLoaderApi = {
  init: () => void
  contentReady: () => boolean
  isSwaggerReady: (root: Element | null) => boolean
  isRedocReady: (root: Element | null) => boolean
  dismiss: (loader: HTMLElement) => void
}

const api = () => (window as unknown as { PDLDocsLoader: DocsLoaderApi }).PDLDocsLoader

beforeAll(() => {
  new Function('window', 'document', source)(window, document)
})

beforeEach(() => {
  vi.useFakeTimers()
  document.documentElement.className = 'pdl-docs pdl-docs--swagger'
  document.body.innerHTML = `
    <div id="pdl-docs-loader" data-pdl-docs-loader aria-busy="true"></div>
    <div id="swagger-ui"></div>
  `
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  document.body.innerHTML = ''
  document.documentElement.className = ''
})

it('reconhece conteúdo Swagger pronto e esconde o loader', () => {
  api().init()
  expect(document.getElementById('pdl-docs-loader')).not.toBeNull()

  document.getElementById('swagger-ui')!.innerHTML =
    '<div class="information-container"><div class="info"><h2>API</h2></div></div>'

  vi.advanceTimersByTime(50)
  // MutationObserver is sync in jsdom for many cases; force a re-check via API
  expect(api().contentReady()).toBe(true)
  api().dismiss(document.getElementById('pdl-docs-loader')!)
  expect(document.documentElement.classList.contains('pdl-docs-ready')).toBe(true)
  expect(document.getElementById('pdl-docs-loader')!.classList.contains('pdl-docs-loader--done')).toBe(true)

  vi.advanceTimersByTime(500)
  expect(document.getElementById('pdl-docs-loader')).toBeNull()
})

it('reconhece conteúdo ReDoc pronto', () => {
  document.documentElement.className = 'pdl-docs pdl-docs--redoc'
  document.body.innerHTML = `
    <div id="pdl-docs-loader" data-pdl-docs-loader aria-busy="true"></div>
    <div id="redoc-container"><div class="redoc-wrap"><div class="api-content"></div></div></div>
  `
  expect(api().contentReady()).toBe(true)
  expect(api().isRedocReady(document.getElementById('redoc-container'))).toBe(true)
})

it('descarta o loader no timeout de segurança', () => {
  api().init()
  expect(document.getElementById('pdl-docs-loader')).not.toBeNull()
  vi.advanceTimersByTime(16000)
  expect(document.getElementById('pdl-docs-loader')!.classList.contains('pdl-docs-loader--done')).toBe(true)
  vi.advanceTimersByTime(500)
  expect(document.getElementById('pdl-docs-loader')).toBeNull()
})
