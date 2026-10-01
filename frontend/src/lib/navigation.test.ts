import { describe, expect, it } from 'vitest'
import { isNavigationItemEnabled } from './navigation'

describe('isNavigationItemEnabled', () => {
  it('retorna true quando recursos não foram carregados ou lista vazia', () => {
    expect(isNavigationItemEnabled('/wiki', undefined)).toBe(true)
    expect(isNavigationItemEnabled('/wiki', [])).toBe(true)
  })

  it('permite rota cujo recurso não está mapeado', () => {
    expect(isNavigationItemEnabled('/info', [{ code: 'wiki', enabled: false } as any])).toBe(true)
    expect(isNavigationItemEnabled('/', [{ code: 'wiki', enabled: false } as any])).toBe(true)
  })

  it('bloqueia rota quando o recurso correspondente estiver desabilitado', () => {
    const resources = [
      { code: 'wiki', enabled: false },
      { code: 'news', enabled: true },
    ] as any
    expect(isNavigationItemEnabled('/wiki', resources)).toBe(false)
    expect(isNavigationItemEnabled('/news', resources)).toBe(true)
  })
})
