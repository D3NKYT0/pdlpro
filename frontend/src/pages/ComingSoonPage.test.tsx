// @vitest-environment jsdom
import type { ReactNode } from 'react'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import type { ApiServerInfo } from '../services/types'
import { ComingSoonPage } from './ComingSoonPage'

const info: ApiServerInfo = {
  name: 'Imperium',
  slogan: '',
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

function mount(ui: ReactNode) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>,
  )
}

beforeEach(async () => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-02T00:00:00Z').getTime())
  await i18n.changeLanguage('pt')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('mostra título, subtítulo e contagem regressiva configuráveis', () => {
  mount(<ComingSoonPage info={info} />)

  expect(screen.getByText('Em breve')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'O portal se abre' })).toBeVisible()
  expect(screen.getByText('Prepare suas armas')).toBeVisible()
  expect(document.querySelector('.launch-gate')).toHaveAttribute('data-theme-surface', 'public')
  expect(document.querySelector('.launch-gate')).toHaveAttribute('data-theme-page', 'coming-soon')
  expect(screen.getByLabelText('Contagem regressiva do lançamento')).toHaveTextContent('01')
  expect(screen.getByLabelText('Contagem regressiva do lançamento')).toHaveTextContent('Dias')
  expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  expect(screen.getByRole('link', { name: 'Entrar' })).toHaveClass('ui-button--lg')
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/downloads')
  expect(screen.getByRole('link', { name: 'Download' })).toHaveClass('launch-gate__secondary')
  expect(screen.getByRole('combobox', { name: 'Idioma do site' })).toBeVisible()
  expect(document.querySelector('.launch-gate__panel')).not.toBeNull()
  expect(document.querySelector('.launch-gate__panel-rim')).not.toBeNull()
  expect(document.querySelector('.launch-gate__panel-texture')).not.toBeNull()
  expect(document.querySelector('.launch-gate__panel-texture')).toHaveStyle({
    backgroundImage: 'url("/theme/default/images/bg/1.png")',
  })
  expect(document.querySelectorAll('.launch-gate__panel-corner')).toHaveLength(8)
  expect(document.querySelector('.launch-gate__tableau.is-split')).not.toBeNull()
  expect(screen.getByLabelText('Informações do servidor')).toHaveClass('launch-gate__dossier')
  expect(screen.getByRole('heading', { name: 'O portal se abre' }).closest('.launch-gate__hero-panel')).not.toBeNull()
  expect(screen.getByLabelText('Informações do servidor')).toHaveTextContent('Interlude')
  expect(screen.getByLabelText('Informações do servidor')).toHaveTextContent('80')
  expect(document.querySelectorAll('.launch-gate__champion')).toHaveLength(4)
  expect(document.querySelector('.launch-gate__champion.is-left-back')).toHaveAttribute(
    'src',
    '/theme/default/images/coming-soon/phoenix-knight.png?v=2',
  )
  expect(document.querySelector('.launch-gate__champion.is-right-front')).toHaveAttribute(
    'src',
    '/theme/default/images/coming-soon/spell-singer.png?v=2',
  )
})

it('usa o nome do servidor como hero quando o título é genérico', () => {
  mount(<ComingSoonPage info={{ ...info, coming_soon_title: 'Em breve' }} />)
  expect(screen.getByRole('heading', { name: 'Imperium' })).toBeVisible()
  expect(screen.getByText('Em breve')).toBeVisible()
})

it('mostra slogan, descrição, crônica, rates e encantamento do painel', () => {
  mount(
    <ComingSoonPage
      info={{
        ...info,
        name: 'The One',
        slogan: 'O Número Um',
        description: 'O melhor servidor do mundo',
        coming_soon_title: 'Em breve',
        coming_soon_subtitle: '',
        chronicle: 'Interlude',
        max_level: 77,
        rates: { xp: 'x10', sp: 'x10', adena: 'x5', drop: 'x3', spoil: 'x3' },
        enchant: { safe: '+3', max: '+16' },
      }}
    />,
  )

  expect(screen.getByRole('heading', { name: 'The One' })).toBeVisible()
  expect(screen.getByText('O Número Um')).toBeVisible()
  expect(screen.getByText('O melhor servidor do mundo')).toBeVisible()
  const facts = screen.getByLabelText('Informações do servidor')
  expect(document.querySelector('.launch-gate__tableau.is-split')).not.toBeNull()
  expect(facts).toHaveClass('launch-gate__dossier')
  expect(screen.getByRole('heading', { name: 'The One' }).closest('.launch-gate__hero-panel')).not.toBeNull()
  expect(facts).toHaveTextContent('O servidor')
  expect(facts).toHaveTextContent('Crônica')
  expect(facts).toHaveTextContent('Interlude')
  expect(facts).toHaveTextContent('Nível')
  expect(facts).toHaveTextContent('77')
  expect(facts).toHaveTextContent('XP')
  expect(facts).toHaveTextContent('x10')
  expect(facts).toHaveTextContent('Adena')
  expect(facts).toHaveTextContent('x5')
  expect(facts).toHaveTextContent('Safe')
  expect(facts).toHaveTextContent('+3')
  expect(facts).toHaveTextContent('Max')
  expect(facts).toHaveTextContent('+16')
  expect(facts).toHaveTextContent('Rates')
  expect(facts).toHaveTextContent('Encantamento')
  expect(facts).not.toHaveTextContent('The One')
})

it('mantém o slogan do painel mesmo com subtítulo de lançamento antigo', () => {
  mount(
    <ComingSoonPage
      info={{
        ...info,
        name: 'The One',
        slogan: 'O Número Um',
        description: 'O melhor servidor do mundo',
        coming_soon_title: 'The One',
        coming_soon_subtitle: 'O melhor servidor do brasil!',
      }}
    />,
  )

  expect(screen.getByRole('heading', { name: 'The One' })).toBeVisible()
  expect(screen.getByText('O Número Um')).toBeVisible()
  expect(screen.getByText('O melhor servidor do brasil!')).toBeVisible()
})

it('usa os botões texturizados compartilhados do projeto', () => {
  mount(<ComingSoonPage info={info} />)

  const primary = screen.getByRole('link', { name: 'Entrar' })
  const secondary = screen.getByRole('link', { name: 'Download' })
  expect(primary).toHaveClass('btn', 'ui-button')
  expect(primary).not.toHaveClass('ghost')
  expect(secondary).toHaveClass('btn', 'ui-button', 'ghost', 'ui-button--secondary')
  expect(primary).toHaveAttribute('data-theme-part', 'button')
})

it('pulsa o bloco de segundos quando a contagem avança', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2027-01-02T00:00:00Z'))
  mount(<ComingSoonPage info={info} />)

  const countdown = screen.getByLabelText('Contagem regressiva do lançamento')
  expect(countdown.querySelector('.is-tick')).toBeNull()

  act(() => {
    vi.setSystemTime(new Date('2027-01-02T00:00:01Z'))
    vi.advanceTimersByTime(1000)
  })

  expect(countdown.querySelector('.launch-gate__block.is-tick')).not.toBeNull()
  vi.useRealTimers()
})

it('anuncia o fim da contagem com efeitos de abertura', () => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-04T00:00:00Z').getTime())
  const { container } = mount(<ComingSoonPage info={info} />)
  expect(container.querySelector('.launch-gate.is-open')).not.toBeNull()
  expect(container.querySelector('.launch-gate__fireworks')).not.toBeNull()
  expect(container.querySelector('.launch-gate__heroes-img')).toHaveAttribute(
    'src',
    '/theme/default/images/bg/dynasty-couple-hold.png?v=6',
  )
  expect(container.querySelector('.launch-gate__tableau.is-held')).not.toBeNull()
  expect(container.querySelector('.launch-gate__tableau.is-split')).toBeNull()
  expect(container.querySelector('.launch-gate__dossier')).toBeNull()
  expect(container.querySelector('.launch-gate__roster')).toBeNull()
  expect(container.querySelectorAll('.launch-gate__shell').length).toBeGreaterThan(3)
  expect(container.querySelector('.launch-gate__bg--open.is-active')).not.toBeNull()
  expect(container.querySelector('.launch-gate__bg--waiting.is-active')).toBeNull()
  expect(screen.getByText('Servidor aberto')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('O momento chegou')
  expect(screen.getByText(/As portas se abriram/)).toBeVisible()
  expect(screen.queryByLabelText('Contagem regressiva do lançamento')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Entrar' }).closest('.launch-gate__actions')).toHaveClass('is-emphasis')
})

it('não mostra o casal Dynasty enquanto a contagem está ativa', () => {
  const { container } = mount(<ComingSoonPage info={info} />)
  expect(container.querySelector('.launch-gate__heroes')).toBeNull()
  expect(container.querySelector('.launch-gate__roster')).not.toBeNull()
})

it('traduz a abertura do servidor para inglês', async () => {
  await i18n.changeLanguage('en')
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-04T00:00:00Z').getTime())
  mount(<ComingSoonPage info={info} />)

  expect(screen.getByText('Server open')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('The moment has come')
  expect(screen.getByText(/The gates have opened/)).toBeVisible()
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/downloads')
})
