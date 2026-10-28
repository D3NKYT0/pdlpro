// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import type { ApiServerInfo } from '../../services/types'
import type { ComingSoonMemoriesStyle } from '../../lib/pageStyles'
import { useTheme } from '../../theme/ThemeProvider'
import { ComingSoonMemories } from './ComingSoonMemories'

vi.mock('../../services/api', () => ({ serverApi: { status: vi.fn().mockResolvedValue({ game_online: false }) } }))
vi.mock('../../theme/ThemeProvider', () => ({ useTheme: vi.fn(() => ({ presentation: null, pages: null })) }))
vi.mock('../public/BannerModal', () => ({
  BannerModal: ({ onInteract }: { onInteract?: () => void }) => (
    <button type="button" onClick={onInteract}>Banner da abertura</button>
  ),
}))

const style: ComingSoonMemoriesStyle = {
  background: null,
  timeZone: 'America/Sao_Paulo',
  scenes: [
    { id: 'first-steps', asset: 'images/memories/first-steps.webp' },
    { id: 'spoil', asset: 'images/memories/spoil.webp' },
    { id: 'siege', asset: 'images/memories/siege.webp', focus: '50% 45%' },
  ],
}

const info = {
  name: 'L2 Saga',
  slogan: '',
  description: '',
  chronicle: 'Interlude C6',
  rates: {},
  enchant: {},
  max_level: 80,
  features: [],
  notes: {},
  coming_soon: true,
  coming_soon_show_info: true,
  coming_soon_show_champions: false,
  coming_soon_title: '',
  coming_soon_subtitle: 'Sua história em Aden ainda não acabou.',
  coming_soon_at: '2027-03-06T21:00:00Z',
  staff_only_login: false,
  allow_registration: true,
  allow_l2_registration: true,
  discord_url: 'https://discord.gg/saga',
  youtube_url: 'https://youtube.com/@saga',
} as ApiServerInfo

const scenesText = {
  pt: {
    'first-steps': { category: 'O COMEÇO', caption: 'Você lembra do seu primeiro login?', alt: 'Vila inicial', thumb: 'Ver a vila inicial' },
    spoil: { category: 'A JORNADA', caption: 'Era só mais um spoil…', alt: 'Spoil', thumb: 'Ver o spoil' },
    siege: { category: 'DISPUTA DE CASTELOS', caption: 'Seu clã na disputa pelo castelo.', alt: 'Siege', thumb: 'Ver a siege' },
  },
  en: {
    'first-steps': { category: 'THE BEGINNING', caption: 'Do you remember your first login?', alt: 'Starting village', thumb: 'View the starting village' },
    spoil: { category: 'THE JOURNEY', caption: 'It was just one more spoil…', alt: 'Spoil', thumb: 'View the spoil' },
    siege: { category: 'CASTLE SIEGE', caption: 'Your clan fighting for the castle.', alt: 'Siege', thumb: 'View the siege' },
  },
}

let reducedMotion = false

beforeAll(() => {
  for (const [language, scenes] of Object.entries(scenesText)) {
    i18n.addResourceBundle(language, 'public', { comingSoonMemories: { scenes } }, true, true)
  }
})

afterAll(() => {
  i18n.reloadResources(['pt', 'en'], ['public'])
})

beforeEach(async () => {
  reducedMotion = false
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  vi.setSystemTime(new Date('2027-03-05T21:00:00Z'))
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: query.includes('reduce') ? reducedMotion : false, addEventListener() {}, removeEventListener() {} }),
  })
  Element.prototype.scrollIntoView = vi.fn()
  await i18n.changeLanguage('pt')
})

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  await i18n.changeLanguage('pt')
})

function mount(overrides: Partial<ApiServerInfo> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <ComingSoonMemories info={{ ...info, ...overrides }} style={style} />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )
  return { ...view, client }
}

const caption = () => document.querySelector('.launch-memories__phrase')?.textContent
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

it('mostra data em destaque, countdown, ações e redes configuradas', () => {
  mount()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('L2 Saga')
  expect(document.querySelector('.launch-memories__brand')).toHaveTextContent('L2 Saga')
  expect(document.querySelector('.launch-memories__chronicle')).toHaveTextContent('Interlude C6')
  expect(screen.getByText('06 MAR 2027')).toHaveAttribute('dateTime', '2027-03-06T21:00:00Z')
  expect(screen.getByText('18:00 · GMT-3')).toBeVisible()
  const countdown = screen.getByRole('group', { name: /Contagem regressiva para a abertura em 06 MAR 2027/ })
  expect(within(countdown).getByText('01')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/downloads')
  const socials = screen.getByRole('navigation', { name: 'Redes sociais' })
  expect(within(socials).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://youtube.com/@saga',
    'https://discord.gg/saga',
  ])
})

it('começa pela primeira cena e avança sozinha a cada 5 segundos, voltando ao início', () => {
  mount()
  expect(caption()).toBe('Você lembra do seu primeiro login?')
  expect(screen.getByRole('img', { name: 'Vila inicial' })).toHaveClass('is-active')
  advance(4999)
  expect(caption()).toBe('Você lembra do seu primeiro login?')
  advance(1)
  expect(caption()).toBe('Era só mais um spoil…')
  advance(5000)
  expect(caption()).toBe('Seu clã na disputa pelo castelo.')
  advance(5000)
  expect(caption()).toBe('Você lembra do seu primeiro login?')
})

it('miniaturas mostram só a imagem, trocam a cena e reiniciam o prazo', () => {
  mount()
  const thumbs = within(screen.getByRole('group', { name: 'Escolher memória' })).getAllByRole('button')
  expect(thumbs).toHaveLength(3)
  for (const thumb of thumbs) expect(thumb).toHaveTextContent('')
  expect(thumbs[2]).toHaveAccessibleName('Ver a siege')
  expect(thumbs[2].querySelector('img')).toHaveStyle({ objectPosition: '50% 45%' })

  advance(4000)
  fireEvent.click(thumbs[2])
  expect(thumbs[2]).toHaveAttribute('aria-pressed', 'true')
  expect(thumbs[0]).toHaveAttribute('aria-pressed', 'false')
  expect(caption()).toBe('Seu clã na disputa pelo castelo.')
  advance(4999)
  expect(caption()).toBe('Seu clã na disputa pelo castelo.')
  advance(1)
  expect(caption()).toBe('Você lembra do seu primeiro login?')
})

it('Pausar/Reproduzir controla a troca automática', () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Pausar a troca automática das imagens' }))
  advance(20000)
  expect(caption()).toBe('Você lembra do seu primeiro login?')
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar a troca automática das imagens' }))
  advance(5000)
  expect(caption()).toBe('Era só mais um spoil…')
})

it('pausa com o ponteiro ou o foco na galeria e retoma ao sair', () => {
  mount()
  const gallery = screen.getByRole('region', { name: 'Memórias do servidor' })
  fireEvent.mouseEnter(gallery)
  advance(10000)
  expect(caption()).toBe('Você lembra do seu primeiro login?')
  fireEvent.mouseLeave(gallery)
  advance(5000)
  expect(caption()).toBe('Era só mais um spoil…')

  const thumb = within(gallery).getAllByRole('button', { pressed: false })[0]
  fireEvent.focus(thumb)
  advance(10000)
  expect(caption()).toBe('Era só mais um spoil…')
  fireEvent.blur(thumb, { relatedTarget: document.body })
  advance(5000)
  expect(caption()).toBe('Seu clã na disputa pelo castelo.')
})

it('suspende com a aba oculta e retoma com intervalo completo', () => {
  mount()
  advance(3000)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  advance(10000)
  expect(caption()).toBe('Você lembra do seu primeiro login?')
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  advance(4999)
  expect(caption()).toBe('Você lembra do seu primeiro login?')
  advance(1)
  expect(caption()).toBe('Era só mais um spoil…')
})

it('com movimento reduzido começa em modo manual', () => {
  reducedMotion = true
  mount()
  expect(screen.getByRole('button', { name: 'Iniciar a troca automática das imagens' })).toBeVisible()
  advance(15000)
  expect(caption()).toBe('Você lembra do seu primeiro login?')
})

it('trocar o idioma mantém cena e reprodução e atualiza a legenda na hora', async () => {
  mount()
  advance(5000)
  fireEvent.click(screen.getByRole('button', { name: 'Pausar a troca automática das imagens' }))
  await act(async () => {
    await i18n.changeLanguage('en')
  })
  expect(caption()).toBe('It was just one more spoil…')
  expect(screen.getByRole('button', { name: 'Start the automatic image rotation' })).toBeVisible()
  expect(screen.getByText('06 MAR 2027')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Sign in' })).toBeVisible()
})

it('após o prazo não mostra números negativos e anuncia a abertura', () => {
  vi.setSystemTime(new Date('2027-03-07T00:00:00Z'))
  mount()
  expect(screen.queryByRole('group', { name: /Contagem regressiva/ })).toBeNull()
  expect(screen.getByRole('status')).toHaveTextContent('O assalto começou')
})

it('botão de descer leva às informações reais do servidor', () => {
  mount()
  const cue = screen.getByRole('link', { name: 'Descer para as informações do servidor' })
  expect(cue).toHaveAttribute('href', '#launch-geral')
  fireEvent.click(cue)
  expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1)).toHaveAttribute('id', 'launch-geral')
})

it('sem informações liberadas não mostra o botão de descer', () => {
  mount({ coming_soon_show_info: false })
  expect(screen.queryByRole('link', { name: 'Descer para as informações do servidor' })).toBeNull()
})

it('remove os timers ao desmontar', () => {
  const view = mount()
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  view.unmount()
  view.client.clear()
  expect(vi.getTimerCount()).toBe(0)
})

it('fundo fixo opcional do tema fica atrás do conteúdo, sem descrição para leitores de tela', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <ComingSoonMemories info={info} style={{ ...style, background: 'images/memories/backdrop.webp' }} />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )
  const backdrop = document.querySelector('.launch-memories__backdrop')
  expect(backdrop).toHaveAttribute('aria-hidden', 'true')
  expect((backdrop as HTMLElement).style.backgroundImage).toContain('images/memories/backdrop.webp')
  expect(document.querySelector('.launch-memories')).toHaveClass('has-backdrop')
})

it('sem fundo declarado não renderiza a camada fixa', () => {
  mount()
  expect(document.querySelector('.launch-memories__backdrop')).toBeNull()
  expect(document.querySelector('.launch-memories')).not.toHaveClass('has-backdrop')
})

it('mostra as brasas da abertura como decoração escondida dos leitores de tela', () => {
  mount()
  const sparks = document.querySelector('.launch-memories__sparks')
  expect(sparks).toHaveAttribute('aria-hidden', 'true')
  expect(sparks?.querySelectorAll('.launch-gate__spark')).toHaveLength(68)
})

describe('trilha do tema', () => {
  let play: ReturnType<typeof vi.fn>
  let pause: ReturnType<typeof vi.fn>

  beforeEach(() => {
    play = vi.fn().mockResolvedValue(undefined)
    pause = vi.fn()
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: play })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pause })
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get() { return !(this as HTMLMediaElement & { __playing?: boolean }).__playing },
    })
    play.mockImplementation(function (this: HTMLMediaElement & { __playing?: boolean }) {
      this.__playing = true
      return Promise.resolve()
    })
    pause.mockImplementation(function (this: HTMLMediaElement & { __playing?: boolean }) {
      this.__playing = false
    })
    vi.mocked(useTheme).mockReturnValue({ presentation: null, pages: { comingSoon: { style: 'memories', music: 'audio/theme.mp3' } } } as never)
  })

  afterEach(() => {
    vi.mocked(useTheme).mockReturnValue({ presentation: null, pages: null } as never)
  })

  it('não toca sozinha; o clique no banner inicia a música em loop', async () => {
    mount()
    expect(play).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Banner da abertura' }))
    })
    expect(play).toHaveBeenCalledTimes(1)
    const audio = play.mock.contexts[0] as HTMLAudioElement
    expect(audio.src).toContain('audio/theme.mp3')
    expect(audio.loop).toBe(true)
    expect(screen.getByRole('button', { name: 'Desligar a música' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('o visitante desliga e um novo clique no banner não religa; o botão religa', async () => {
    mount()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Banner da abertura' }))
    })
    fireEvent.click(screen.getByRole('button', { name: 'Desligar a música' }))
    expect(pause).toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Banner da abertura' }))
    })
    expect(play).toHaveBeenCalledTimes(1)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ligar a música' }))
    })
    expect(play).toHaveBeenCalledTimes(2)
  })

  it('bloqueio do navegador mantém o botão em desligado', async () => {
    play.mockRejectedValueOnce(new Error('NotAllowedError'))
    mount()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Banner da abertura' }))
    })
    expect(screen.getByRole('button', { name: 'Ligar a música' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('para a música ao sair da página', async () => {
    const view = mount()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Banner da abertura' }))
    })
    view.unmount()
    expect(pause).toHaveBeenCalled()
  })

  it('sem música no tema não mostra o botão de som', () => {
    vi.mocked(useTheme).mockReturnValue({ presentation: null, pages: null } as never)
    mount()
    expect(screen.queryByRole('button', { name: /música/ })).toBeNull()
  })
})
