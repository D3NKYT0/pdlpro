// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import type { ApiServerInfo } from '../../services/types'
import type { InfoGuideStyle } from '../../lib/pageStyles'
import { InfoGuide } from './InfoGuide'

const style: InfoGuideStyle = {
  heroImage: 'images/info/hero.webp',
  categories: [
    { id: 'general', icon: 'compass', items: ['fairPlay', 'farm'], aliases: ['geral'] },
    { id: 'combat', icon: 'swords', items: ['pvpZones'], aliases: ['pvp'] },
    { id: 'enchant', icon: 'shield', items: ['weapons'] },
  ],
}

const info = {
  name: 'Saga',
  chronicle: 'Interlude Classic',
  max_level: 80,
  rates: { xp: 'x20', sp: 'x20', adena: 'x5', drop: 'x1', spoil: 'x1' },
  enchant: { safe: '+3', weapon: '+16' },
  notes: {},
} as unknown as ApiServerInfo

/** Simula o overlay `locales/<lang>.json` de um tema instalado. */
const themeTexts = {
  pt: {
    general: { label: 'Visão geral', title: 'A experiência', items: {
      fairPlay: { label: 'Fair play', summary: 'Anti-bot', detail: 'Até dois clientes por PC.' },
      farm: { label: 'Farm', summary: 'Sem auto-farm' },
    } },
    combat: { label: 'PvP e bosses', title: 'Conquiste seu lugar', items: {
      pvpZones: { label: 'Zonas PvP', summary: 'Rotação de 8h', detail: 'Rates em dobro.' },
    } },
    enchant: { label: 'Encantamento', title: 'Limites', items: {
      weapons: { label: 'Armas', summary: 'Máximo {{enchant.weapon}}', detail: 'Seguro até {{enchant.safe}}.' },
    } },
  },
  en: {
    general: { label: 'Overview', title: 'The experience', items: {
      fairPlay: { label: 'Fair play', summary: 'Anti-bot', detail: 'Up to two clients per PC.' },
      farm: { label: 'Farming', summary: 'No auto-farm' },
    } },
    combat: { label: 'PvP & bosses', title: 'Earn your place', items: {
      pvpZones: { label: 'PvP zones', summary: '8h rotation', detail: 'Double rates.' },
    } },
    enchant: { label: 'Enchant', title: 'Limits', items: {
      weapons: { label: 'Weapons', summary: 'Max {{enchant.weapon}}', detail: 'Safe up to {{enchant.safe}}.' },
    } },
  },
}

beforeAll(() => {
  for (const [language, categories] of Object.entries(themeTexts)) {
    i18n.addResourceBundle(language, 'public', { infoGuide: { categories } }, true, true)
  }
})

afterAll(() => {
  i18n.removeResourceBundle('pt', 'public')
  i18n.removeResourceBundle('en', 'public')
  i18n.reloadResources(['pt', 'en'], ['public'])
})

beforeEach(async () => {
  await i18n.changeLanguage('pt')
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await i18n.changeLanguage('pt')
})

function mount(props: Partial<Parameters<typeof InfoGuide>[0]> = {}, entry = '/info') {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[entry]}>
        <InfoGuide style={style} data={info} {...props} />
      </MemoryRouter>
    </I18nextProvider>,
  )
}

it('mostra as rates da configuração com EXP/SP juntos e a primeira categoria aberta', () => {
  mount()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Conheça o reino.')
  expect(screen.getByText('Interlude Classic · Nível máximo 80')).toBeVisible()
  const rates = screen.getByLabelText('Rates do servidor')
  expect(within(rates).getByText('EXP / SP')).toBeVisible()
  expect(within(rates).getByText('x20')).toBeVisible()
  expect(within(rates).getByText('x5')).toBeVisible()
  expect(within(rates).queryByText('EXP')).toBeNull()
  expect(screen.getByRole('tab', { name: 'Visão geral' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel')).toHaveTextContent('A experiência')
  expect(screen.queryByText('Conquiste seu lugar')).toBeNull()
})

it('linhas começam fechadas, abrem de forma independente e linha sem detalhe não expande', async () => {
  const user = userEvent.setup()
  mount()
  const fairPlay = screen.getByRole('button', { name: /Fair play/ })
  expect(fairPlay).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByText('Até dois clientes por PC.')).not.toBeVisible()
  await user.click(fairPlay)
  expect(fairPlay).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Até dois clientes por PC.')).toBeVisible()
  expect(screen.getByRole('button', { name: /Farm/ })).toBeDisabled()
  await user.click(fairPlay)
  expect(fairPlay).toHaveAttribute('aria-expanded', 'false')
})

it('trocar de categoria mostra só a nova e fecha os detalhes; teclado navega pelas abas', async () => {
  const user = userEvent.setup()
  mount()
  await user.click(screen.getByRole('button', { name: /Fair play/ }))
  await user.click(screen.getByRole('tab', { name: 'PvP e bosses' }))
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Conquiste seu lugar')
  expect(screen.queryByText('A experiência')).toBeNull()
  expect(screen.getByRole('button', { name: /Zonas PvP/ })).toHaveAttribute('aria-expanded', 'false')
  await user.click(screen.getByRole('tab', { name: 'Visão geral' }))
  expect(screen.getByRole('button', { name: /Fair play/ })).toHaveAttribute('aria-expanded', 'false')

  screen.getByRole('tab', { name: 'Visão geral' }).focus()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: 'PvP e bosses' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: 'PvP e bosses' })).toHaveFocus()
})

it('interpola enchant da configuração do servidor no texto do tema', async () => {
  const user = userEvent.setup()
  mount()
  await user.click(screen.getByRole('tab', { name: 'Encantamento' }))
  expect(screen.getByText('Máximo +16')).toBeVisible()
  await user.click(screen.getByRole('button', { name: /Armas/ }))
  expect(screen.getByText('Seguro até +3.')).toBeVisible()
})

it('trocar o idioma mantém a categoria e os detalhes abertos', async () => {
  const user = userEvent.setup()
  mount()
  await user.click(screen.getByRole('tab', { name: 'PvP e bosses' }))
  await user.click(screen.getByRole('button', { name: /Zonas PvP/ }))
  await act(async () => {
    await i18n.changeLanguage('en')
  })
  expect(screen.getByRole('tab', { name: 'PvP & bosses' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('button', { name: /PvP zones/ })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Double rates.')).toBeVisible()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Discover the realm.')
})

it.each([
  ['/info#pvp', 'PvP e bosses', 'guide-content'],
  ['/info#geral', 'Visão geral', 'guide-content'],
  ['/info#enchant', 'Encantamento', 'guide-content'],
  ['/info#features', 'Visão geral', 'features'],
])('link antigo %s seleciona a categoria e rola até o destino', (entry, tab, anchor) => {
  mount({}, entry)
  expect(screen.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1)).toHaveAttribute('id', anchor)
})

it('#rates e #comecar levam à faixa de rates e às ações finais', () => {
  mount({}, '/info#comecar')
  expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1)).toHaveAttribute('id', 'comecar')
  cleanup()
  mount({}, '/info#rates')
  expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1)).toHaveAttribute('id', 'rates')
})

it('ações finais usam as rotas de cadastro, download e wiki', () => {
  mount()
  expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register')
  expect(screen.getByRole('link', { name: /Baixar/ })).toHaveAttribute('href', '/downloads')
  expect(screen.getByRole('link', { name: /wiki/i })).toHaveAttribute('href', '/wiki')
})

it('mostra carregamento e erro sem renderizar categorias', () => {
  mount({ data: undefined, loading: true })
  expect(screen.getByRole('status')).toBeVisible()
  expect(screen.queryByRole('tablist')).toBeNull()
  cleanup()
  mount({ data: undefined, error: true })
  expect(screen.getByRole('alert')).toBeVisible()
})

it('embutido na Coming Soon usa âncoras prefixadas, h2 e sem ações repetidas', () => {
  mount({ idPrefix: 'launch-', embedded: true })
  expect(document.getElementById('launch-geral')).not.toBeNull()
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Criar conta' })).toBeNull()
  expect(document.querySelector('.info-guide__hero-art')).toBeNull()
})
