// @vitest-environment jsdom
import type { ReactNode } from 'react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { serverApi } from '../services/api'
import type { ApiServerInfo } from '../services/types'
import { ComingSoonPage } from './ComingSoonPage'

vi.mock('../services/api', () => ({
  serverApi: { status: vi.fn() },
}))

const info: ApiServerInfo = {
  name: 'Imperium',
  slogan: '',
  description: 'Servidor de testes',
  chronicle: 'Interlude',
  rates: { xp: 'x10', sp: 'x10', adena: 'x10', drop: 'x1', spoil: 'x1' },
  enchant: { safe: '+3', max: '+16' },
  max_level: 80,
  features: ['PvP e guerras de castelo', 'Eventos periódicos'],
  notes: { pvp: 'Combate livre', start: 'Crie a conta' },
  coming_soon: true,
  coming_soon_show_info: false,
  coming_soon_show_champions: true,
  coming_soon_title: 'O portal se abre',
  coming_soon_subtitle: 'Prepare suas armas',
  coming_soon_at: '2027-01-03T00:00:00Z',
}

function mount(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/login" element={<p>Tela de login</p>} />
            <Route path="/downloads" element={<p>Tela de downloads</p>} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

function stubMediaPlayback() {
  const play = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: play,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  })
  return play
}

beforeEach(async () => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-02T00:00:00Z').getTime())
  vi.mocked(serverApi.status).mockResolvedValue({ game_online: false, login_online: true, players_online: 0 })
  await i18n.changeLanguage('pt')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
  expect(document.querySelector('.launch-gate__bg--cinematic')).toHaveAttribute(
    'src',
    '/theme/default/videos/coming-soon/video.mp4',
  )
  expect(document.querySelector('.launch-gate.is-entering')).toBeNull()
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
  expect(document.querySelector('.launch-gate__mist')).not.toBeNull()
  expect(document.querySelectorAll('.launch-gate__champion')).toHaveLength(4)
  expect(document.querySelector('.launch-gate__champion.is-left-back')).toHaveAttribute(
    'src',
    '/theme/default/images/coming-soon/phoenix-knight.png?v=4',
  )
  expect(document.querySelector('.launch-gate__champion.is-right-front')).toHaveAttribute(
    'src',
    '/theme/default/images/coming-soon/spell-singer.png?v=4',
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

it('anuncia o fim da contagem com o assalto ao castelo', () => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-04T00:00:00Z').getTime())
  const { container } = mount(<ComingSoonPage info={info} />)
  expect(container.querySelector('.launch-gate.is-open')).not.toBeNull()
  expect(container.querySelector('.launch-gate__fireworks')).toBeNull()
  expect(container.querySelector('.launch-gate__heroes')).toBeNull()
  expect(container.querySelector('.launch-gate__tableau.is-held')).toBeNull()
  expect(container.querySelector('.launch-gate__tableau.is-assault')).not.toBeNull()
  expect(container.querySelector('.launch-gate__tableau.is-split')).toBeNull()
  expect(container.querySelector('.launch-gate__dossier')).toBeNull()
  expect(container.querySelector('.launch-gate__roster.is-assault')).not.toBeNull()
  expect(container.querySelectorAll('.launch-gate__champion')).toHaveLength(4)
  expect(container.querySelector('.launch-gate__champion.is-left-front')).toHaveAttribute(
    'src',
    '/theme/default/images/coming-soon/assault-vanguard.png?v=4',
  )
  expect(container.querySelector('.launch-gate__champion.is-left-back')).toHaveAttribute(
    'src',
    '/theme/default/images/coming-soon/assault-raider.png?v=4',
  )
  expect(container.querySelector('.launch-gate__champion.is-right-front')).toHaveAttribute(
    'src',
    '/theme/default/images/coming-soon/assault-mage.png?v=4',
  )
  expect(container.querySelector('.launch-gate__bg--open.is-active')).not.toBeNull()
  expect(container.querySelector('.launch-gate__bg--waiting.is-active')).toBeNull()
  expect(screen.getByText('A guerra começou')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('O assalto começou')
  expect(screen.getByText(/O exército entra no castelo/)).toBeVisible()
  expect(screen.queryByLabelText('Contagem regressiva do lançamento')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Entrar' }).closest('.launch-gate__actions')).toHaveClass('is-emphasis')
})

it('não mostra o exército de assalto enquanto a contagem está ativa', () => {
  const { container } = mount(<ComingSoonPage info={info} />)
  expect(container.querySelector('.launch-gate__roster.is-assault')).toBeNull()
  expect(container.querySelector('.launch-gate__roster')).not.toBeNull()
  expect(container.querySelector('.launch-gate__champion.is-left-back')).toHaveAttribute(
    'src',
    '/theme/default/images/coming-soon/phoenix-knight.png?v=4',
  )
})

it('traduz a abertura do servidor para inglês', async () => {
  await i18n.changeLanguage('en')
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-04T00:00:00Z').getTime())
  mount(<ComingSoonPage info={info} />)

  expect(screen.getByText('The war has begun')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('The assault has begun')
  expect(screen.getByText(/The army storms the castle/)).toBeVisible()
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/downloads')
})

it('some a interface, reproduz o vídeo e só então abre o login', async () => {
  const play = stubMediaPlayback()
  const user = userEvent.setup()
  const { container } = mount(<ComingSoonPage info={info} />)

  await user.click(screen.getByRole('link', { name: 'Entrar' }))

  expect(container.querySelector('.launch-gate.is-entering')).not.toBeNull()
  expect(container.querySelector('.launch-gate__bg--cinematic.is-active')).not.toBeNull()
  expect(container.querySelector('.launch-gate__bg--cinematic')).toHaveProperty('muted', true)
  expect(container.querySelector('.launch-gate__stage')).toHaveAttribute('hidden')
  expect(container.querySelector('.launch-gate__hero-panel')).not.toBeVisible()
  expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
  expect(play).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('status')).toHaveTextContent('Entrando no site')
  expect(screen.queryByText('Tela de login')).not.toBeInTheDocument()

  fireEvent.ended(container.querySelector('.launch-gate__bg--cinematic')!)

  expect(screen.getByText('Tela de login')).toBeVisible()
})

it('abre o login se o vídeo falhar depois do clique', async () => {
  stubMediaPlayback()
  const user = userEvent.setup()
  const { container } = mount(<ComingSoonPage info={info} />)

  await user.click(screen.getByRole('link', { name: 'Entrar' }))
  fireEvent.error(container.querySelector('.launch-gate__bg--cinematic')!)

  expect(screen.getByText('Tela de login')).toBeVisible()
})

it('permite pular o vídeo de entrada', async () => {
  stubMediaPlayback()
  const user = userEvent.setup()
  mount(<ComingSoonPage info={info} />)

  await user.click(screen.getByRole('link', { name: 'Entrar' }))
  await user.click(screen.getByRole('button', { name: 'Pular' }))

  expect(screen.getByText('Tela de login')).toBeVisible()
})

it('ignora o vídeo quando o sistema pede menos movimento', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  )
  const play = stubMediaPlayback()
  const user = userEvent.setup()
  mount(<ComingSoonPage info={info} />)

  await user.click(screen.getByRole('link', { name: 'Entrar' }))

  expect(play).not.toHaveBeenCalled()
  expect(screen.getByText('Tela de login')).toBeVisible()
})

it('não dispara a cena com Ctrl+clique no Entrar', async () => {
  const play = stubMediaPlayback()
  const { container } = mount(<ComingSoonPage info={info} />)

  fireEvent.click(screen.getByRole('link', { name: 'Entrar' }), { ctrlKey: true })

  expect(play).not.toHaveBeenCalled()
  expect(container.querySelector('.launch-gate.is-entering')).toBeNull()
  expect(screen.queryByText('Tela de login')).not.toBeInTheDocument()
})

it('com informações habilitadas libera rolagem e mostra as seções da /info', async () => {
  const { container } = mount(
    <ComingSoonPage
      info={{
        ...info,
        coming_soon_show_info: true,
        description: 'O melhor servidor do mundo!',
      }}
    />,
  )

  expect(container.querySelector('.launch-gate--scrollable')).not.toBeNull()
  expect(document.documentElement.style.overflow).not.toBe('hidden')
  expect(screen.getByRole('link', { name: /Role para ver as informações/i })).toBeVisible()
  expect(container.querySelector('.launch-gate__scroll-chevron')).not.toBeNull()
  expect(container.querySelector('.launch-gate__info.info-page')).not.toBeNull()
  expect(screen.getByLabelText('Informações do servidor')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Rates do servidor' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Encantamento' })).toBeVisible()
  expect(screen.getByText('PvP e guerras de castelo')).toBeVisible()
  expect(container.querySelector('.launch-gate__dossier')).toBeNull()
})

it('esconde os personagens laterais quando o admin desliga', () => {
  const { container } = mount(
    <ComingSoonPage info={{ ...info, coming_soon_show_champions: false }} />,
  )

  expect(container.querySelector('.launch-gate__roster')).toBeNull()
  expect(container.querySelector('.launch-gate__champion')).toBeNull()
})

it('mostra só as redes com URL preenchida, lado a lado abaixo do contador', () => {
  const { container } = mount(
    <ComingSoonPage
      info={{
        ...info,
        whatsapp_url: 'https://wa.me/5511999999999',
        facebook_url: '',
        instagram_url: 'https://instagram.com/theone',
        youtube_url: 'https://youtube.com/@theone',
        discord_url: 'https://discord.gg/theone',
      }}
    />,
  )

  const socials = container.querySelector('.launch-gate__socials')
  expect(socials).not.toBeNull()
  expect(screen.getByRole('navigation', { name: 'Redes sociais' })).toBe(socials)
  expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
    'href',
    'https://wa.me/5511999999999',
  )
  expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
    'href',
    'https://instagram.com/theone',
  )
  expect(screen.getByRole('link', { name: 'YouTube' })).toHaveAttribute(
    'href',
    'https://youtube.com/@theone',
  )
  expect(screen.getByRole('link', { name: 'Discord' })).toHaveAttribute(
    'href',
    'https://discord.gg/theone',
  )
  expect(screen.queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument()
})

it('não renderiza a barra de redes quando todas as URLs estão vazias', () => {
  const { container } = mount(<ComingSoonPage info={info} />)
  expect(container.querySelector('.launch-gate__socials')).toBeNull()
})
