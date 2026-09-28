// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import { useSearchParamTab } from './useSearchParamTab'

afterEach(() => {
  cleanup()
})

const TABS = ['alpha', 'beta', 'gamma'] as const

function setup(initialEntry: string, param?: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  )
  return renderHook(
    () => {
      const [tab, setTab] = useSearchParamTab(TABS, 'alpha', param)
      const location = useLocation()
      return { tab, setTab, search: location.search }
    },
    { wrapper },
  )
}

it('lê a aba da URL e cai no padrão quando o parâmetro falta ou é desconhecido', () => {
  expect(setup('/page?tab=gamma').result.current.tab).toBe('gamma')
  cleanup()
  expect(setup('/page').result.current.tab).toBe('alpha')
  cleanup()
  expect(setup('/page?tab=delta').result.current.tab).toBe('alpha')
})

it('grava a aba na URL preservando os demais parâmetros', () => {
  const { result } = setup('/page?from=central&tab=alpha')

  act(() => result.current.setTab('beta'))

  expect(result.current.tab).toBe('beta')
  expect(result.current.search).toBe('?from=central&tab=beta')
})

it('usa um parâmetro próprio para sub-abas sem tocar no ?tab= da página', () => {
  const { result } = setup('/page?tab=battle', 'pass')
  expect(result.current.tab).toBe('alpha')

  act(() => result.current.setTab('gamma'))

  expect(result.current.tab).toBe('gamma')
  expect(result.current.search).toBe('?tab=battle&pass=gamma')
})
