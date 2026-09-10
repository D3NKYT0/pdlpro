// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeHeroVideo } from './ThemeHeroVideo'

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
})
