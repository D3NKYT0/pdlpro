// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, expect, it } from 'vitest'
import { applyDocumentMetadata, resolveSiteMetadata } from '../src/lib/site-metadata'

const originalHead = document.head.innerHTML
const originalBody = document.body.innerHTML
afterEach(() => {
  document.head.innerHTML = originalHead
  document.body.innerHTML = originalBody
})

it('o HTML estático continua inicializável sem SSI e a API atualiza as tags sem duplicá-las', () => {
  const html = readFileSync('index.html', 'utf8')
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  document.head.innerHTML = parsed.head.innerHTML
  document.body.innerHTML = parsed.body.innerHTML
  expect(document.title).toContain('PDL PRO')
  expect(document.getElementById('root')).not.toBeNull()
  const info = {
    name: 'Saga Club', seo_title: 'Saga SEO', seo_description: 'Saga descrição',
    og_title: 'Saga compartilhamento', og_description: 'Jogue no Saga', og_image: '/media/saga.png',
  }
  applyDocumentMetadata(resolveSiteMetadata(info as never, { assets: {}, metadata: null }))
  expect(document.title).toBe('Saga SEO')
  for (const key of ['og:title', 'twitter:title']) {
    const nodes = document.head.querySelectorAll(`meta[property="${key}"], meta[name="${key}"]`)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].getAttribute('content')).toBe('Saga compartilhamento')
  }
  expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toMatch(/\/media\/saga.png$/)
})
