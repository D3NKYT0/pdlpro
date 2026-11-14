// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeHeroVideo } from './ThemeHeroVideo'

const themeState = vi.hoisted(() => ({ assets: {} as Record<string, string> }))
vi.mock('../theme/ThemeProvider', () => ({ useTheme: () => themeState }))

vi.mock('../theme/assets', () => ({
  themeImage: (path: string) => `/theme/default/images/${path}`,
}))

function stubMatchMedia(matches: boolean) {
  const media = {
    matches,
    media: '(max-width: 768px)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  return media
}

beforeEach(() => { themeState.assets = {} })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('ThemeHeroVideo', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('usa o vídeo retrato no mobile', () => {
    stubMatchMedia(true)
    const { container } = render(<ThemeHeroVideo />)
    const video = container.querySelector('video')
    expect(video).toHaveAttribute('src', '/theme/default/images/video-mobile.mp4')
    expect(video).toHaveAttribute('poster', '/theme/default/images/video-mobile-poster.jpg')
  })

  it('usa o vídeo landscape no desktop', () => {
    stubMatchMedia(false)
    const { container } = render(<ThemeHeroVideo />)
    const video = container.querySelector('video')
    expect(video).toHaveAttribute('src', '/theme/default/images/video.mp4')
    expect(video).toHaveAttribute('poster', '/theme/default/images/video-poster.jpg')
  })

  it('mantém a imagem de fallback quando o vídeo não pode ser carregado', () => {
    stubMatchMedia(false)
    const { container } = render(<ThemeHeroVideo />)
    const video = container.querySelector('video')!
    fireEvent.error(video)
    expect(container.querySelector('video')).not.toHaveAttribute('src')
    expect(container.querySelector('video')).toHaveAttribute('poster', '/theme/default/images/video-poster.jpg')
  })
})


it('tenta o MP4 desktop quando o vídeo móvel com nome customizado falha', () => {
  stubMatchMedia(true)
  themeState.assets = { 'images/video-mobile.mp4': '/media/portrait-a.mp4', 'images/video.mp4': '/media/scene-b.mp4' }
  const { container } = render(<ThemeHeroVideo />)
  expect(container.querySelector('video')).toHaveAttribute('src', '/media/portrait-a.mp4')
  fireEvent.error(container.querySelector('video')!)
  expect(container.querySelector('video')).toHaveAttribute('src', '/media/scene-b.mp4')
  fireEvent.error(container.querySelector('video')!)
  expect(container.querySelector('video')).not.toHaveAttribute('src')
  expect(container.querySelector('video')).toHaveAttribute('poster', '/theme/default/images/video-mobile-poster.jpg')
})

it('atualiza a fonte ao aplicar outro pacote sem remontar a página', () => {
  stubMatchMedia(false)
  themeState.assets = { 'images/video.mp4': '/media/first.mp4' }
  const { container, rerender } = render(<ThemeHeroVideo />)
  expect(container.querySelector('video')).toHaveAttribute('src', '/media/first.mp4')
  themeState.assets = { 'images/video.mp4': '/media/second.mp4' }
  rerender(<ThemeHeroVideo />)
  expect(container.querySelector('video')).toHaveAttribute('src', '/media/second.mp4')
  expect(container.querySelector('video')).toHaveProperty('muted', true)
  expect(container.querySelectorAll('video')).toHaveLength(1)
})

it('troca para a fonte móvel quando a largura muda', () => {
  const media = stubMatchMedia(false)
  const { container } = render(<ThemeHeroVideo />)
  expect(container.querySelector('video')).toHaveAttribute('src', '/theme/default/images/video.mp4')
  act(() => { media.matches = true; media.addEventListener.mock.calls[0][1]() })
  expect(container.querySelector('video')).toHaveAttribute('src', '/theme/default/images/video-mobile.mp4')
})
