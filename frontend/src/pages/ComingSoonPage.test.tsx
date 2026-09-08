// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ApiServerInfo } from '../services/types'
import { ComingSoonPage } from './ComingSoonPage'

const info: ApiServerInfo = {
  name: 'Imperium',
  description: 'Servidor de testes',
  chronicle: 'Interlude',
  rates: {},
  enchant: {},
  max_level: 80,
  features: [],
  notes: {},
  coming_soon: true,
  coming_soon_title: 'O portal se abre',
  coming_soon_subtitle: 'Prepare suas armas',
  coming_soon_at: '2027-01-03T00:00:00Z',
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-02T00:00:00Z').getTime())
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('mostra título, subtítulo e contagem regressiva configuráveis', () => {
  render(
    <MemoryRouter>
      <ComingSoonPage info={info} />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'O portal se abre' })).toBeVisible()
  expect(screen.getByText('Prepare suas armas')).toBeVisible()
  expect(screen.getByLabelText('Contagem regressiva do lançamento')).toHaveTextContent('01')
  expect(screen.getByLabelText('Contagem regressiva do lançamento')).toHaveTextContent('Dias')
  expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  expect(screen.queryByText('Crônica e Rates')).not.toBeInTheDocument()
})

it('anuncia o fim da contagem quando a data já passou', () => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-04T00:00:00Z').getTime())
  render(
    <MemoryRouter>
      <ComingSoonPage info={info} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('status')).toHaveTextContent('O momento chegou')
  expect(screen.queryByLabelText('Contagem regressiva do lançamento')).not.toBeInTheDocument()
})
