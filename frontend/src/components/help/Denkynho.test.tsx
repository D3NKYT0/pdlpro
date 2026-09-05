// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Denkynho } from './Denkynho'
let fail = false
beforeEach(() => {
  fail = false; vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0)
  vi.stubGlobal('Image', class { onload: null | (() => void) = null; onerror: null | (() => void) = null; set src(_: string) { Promise.resolve().then(() => fail ? this.onerror?.() : this.onload?.()) } })
})
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const settle = async () => { await act(async () => { await Promise.resolve() }) }
it('exibe peças equipadas e dança distinta, preservando representação estática com movimento reduzido', async () => {
  const appearance = { accessory: 'star-pin', outfit: 'golden-scarf', object: 'lantern', scene: 'garden' }
  const { container, rerender } = render(<Denkynho pose="02-sucesso" appearance={appearance} dancing celebration />)
  await settle()
  expect(screen.getByRole('img')).toHaveAccessibleName('Denkynho — Dançando')
  expect(container.querySelector('.denk-sprite')).toHaveAttribute('data-frame', '0')
  expect(container.querySelector('.denk-cosmetics')).toBeNull()
  expect(container.querySelector('.denk-scarf')).toBeNull()
  expect(container.querySelector('.denk-scene img')).toHaveAttribute('src', '/mascot/denkynho/scenes/garden.png')
  expect(screen.getByRole('img')).toHaveClass('is-dancing', 'is-celebrating')
  rerender(<Denkynho pose="02-sucesso" appearance={appearance} dancing animated={false} />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-animated', 'false')
  expect(container.querySelector('[data-cosmetic="star-pin"]')).toBeTruthy()
  expect(container.querySelector('.pose-sucesso [data-cosmetic="star-pin"]')).toBeTruthy()
  rerender(<Denkynho pose="02-sucesso" appearance={{ accessory: 'invalid', outfit: '', object: '' }} talking />); await settle()
  expect(container.querySelector('[data-cosmetic="star-pin"]')).toBeNull()
  expect(screen.getByRole('img')).toHaveAttribute('data-gesture', 'true')
})
it('ancora o broche na pose em pé de boas-vindas', async () => {
  const { container } = render(<Denkynho pose="01-boas-vindas" appearance={{ accessory: 'star-pin', outfit: '', object: '' }} animated={false} />)
  await settle()
  expect(container.querySelector('.pose-boas-vindas [data-cosmetic="star-pin"]')).toBeTruthy()
})
it.each(['11-comendo', '12-jogando', '06-rindo', '13-dancando', '14-carinho', '15-banho', '16-andando', '03-pensando', '09-confuso'])('reproduz quadros diferentes de %s e para ao desativar', async pose => {
  const { container, rerender, unmount } = render(<Denkynho pose={pose} />); await settle()
  const sprite = () => container.querySelector('.denk-sprite')
  expect(sprite()).toHaveAttribute('data-frame', '0')
  const firstView = sprite()?.getAttribute('viewBox')
  await act(async () => { await vi.advanceTimersByTimeAsync(600) })
  expect(sprite()).not.toHaveAttribute('data-frame', '0')
  expect(sprite()?.getAttribute('viewBox')).not.toBe(firstView)
  rerender(<Denkynho pose={pose} animated={false} />); await settle()
  expect(sprite()).toBeNull()
  expect(container.querySelector('.denk-base')).toHaveAttribute('src', `/mascot/denkynho/${pose}.png`)
  await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
  expect(sprite()).toBeNull()
  unmount(); expect(vi.getTimerCount()).toBe(0)
})
it.each(['11-comendo', '12-jogando', '13-dancando', '14-carinho', '15-banho', '16-andando'])('carrega %s sem sobrepor recortes faciais de outra pose', async pose => {
  const { container } = render(<Denkynho pose={pose} talking mouthOpen />); await settle()
  await act(async () => { vi.advanceTimersByTime(2800) })
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', pose)
  expect(container.querySelector('.denk-base')).toHaveAttribute('src', `/mascot/denkynho/${pose}.png`)
  expect(container.querySelector('.denk-face')).toBeNull()
})
it('carrega a pose antes de transicionar, pisca e anima a boca', async () => {
  const { rerender, container } = render(<Denkynho pose="01-boas-vindas" />); await settle()
  expect(screen.getByRole('img')).toHaveAccessibleName('Denkynho — Boas-vindas')
  await act(async () => { vi.advanceTimersByTime(2800) })
  expect(container.querySelectorAll('.denk-face')).toHaveLength(2)
  await act(async () => { vi.advanceTimersByTime(150) })
  expect(container.querySelectorAll('.denk-face')).toHaveLength(0)
  rerender(<Denkynho pose="04-dica" talking mouthOpen={false} />); await settle()
  expect(screen.getByRole('img')).toHaveAccessibleName('Denkynho — Dica, falando')
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(2)
  expect(container.querySelector('.denk-face')).toHaveAttribute('src', expect.stringContaining('04-dica-boca'))
  await act(async () => { vi.advanceTimersByTime(560) })
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(1)
})
it('reproduz a comemoração só no atlas de sucesso e mantém a pose estática no idle', async () => {
  const { container, rerender } = render(<Denkynho pose="02-sucesso" celebration />)
  await settle()
  expect(container.querySelector('.denk-sprite')).toHaveAttribute('data-frame', '0')
  rerender(<Denkynho pose="02-sucesso" />)
  await settle()
  expect(container.querySelector('.denk-sprite')).toBeNull()
  expect(container.querySelector('.denk-base')).toHaveAttribute('src', '/mascot/denkynho/02-sucesso.png')
})
it('expõe uma animação de ociosidade própria, sem usar o atlas da cama', async () => {
  const { container } = render(<Denkynho pose="01-boas-vindas" idle />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-idle', 'true')
  expect(container.querySelector('.denk-pose')).toHaveClass('is-moving')
  expect(container.querySelector('.denk-sprite')).toBeNull()
  expect(container.querySelector('.denk-base')).toHaveAttribute('src', '/mascot/denkynho/01-boas-vindas.png')
})
it('mantém a imagem anterior se o novo asset falhar', async () => {
  const { rerender } = render(<Denkynho pose="01-boas-vindas" />); await settle(); fail = true
  rerender(<Denkynho pose="07-triste" />); await settle()
  expect(screen.getByText(/Não foi possível carregar/)).toBeVisible()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '01-boas-vindas')
})
it('aguarda o atlas completo e preserva a pose anterior quando ele falha', async () => {
  const { rerender, container } = render(<Denkynho pose="01-boas-vindas" />); await settle()
  let atlas: { onload: null | (() => void); onerror: null | (() => void) } | undefined
  vi.stubGlobal('Image', class {
    onload: null | (() => void) = null
    onerror: null | (() => void) = null
    set src(value: string) {
      if (value.includes('-sequencia')) atlas = this
      else Promise.resolve().then(() => this.onload?.())
    }
  })
  rerender(<Denkynho pose="11-comendo" />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '01-boas-vindas')
  expect(container.querySelector('.denk-sprite')).toBeNull()
  await act(async () => { atlas!.onerror?.() })
  expect(screen.getByText(/Não foi possível carregar/)).toBeVisible()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '01-boas-vindas')
  rerender(<Denkynho pose="12-jogando" />); await settle()
  await act(async () => { atlas!.onload?.() })
  expect(screen.queryByText(/Não foi possível carregar/)).toBeNull()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '12-jogando')
  expect(container.querySelector('.denk-sprite')).toHaveAttribute('data-frame', '0')
})
it('prioriza a fala e recomeça o ciclo de risada ao terminar de falar', async () => {
  const { container, rerender } = render(<Denkynho pose="06-rindo" />); await settle()
  rerender(<Denkynho pose="06-rindo" talking mouthOpen={false} />); await settle()
  expect(container.querySelector('.denk-sprite')).toBeNull()
  expect(container.querySelector('.denk-face')).toHaveAttribute('src', expect.stringContaining('06-rindo-boca'))
  rerender(<Denkynho pose="06-rindo" />); await settle()
  expect(container.querySelector('.denk-sprite')).toHaveAttribute('data-frame', '0')
})
it('respeita mudança de movimento reduzido mesmo quando usado sem a página de Ajuda', async () => {
  const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', () => media)
  const { container, unmount } = render(<Denkynho pose="11-comendo" />); await settle()
  expect(container.querySelector('.denk-sprite')).not.toBeNull()
  const update = media.addEventListener.mock.calls[0][1]
  await act(async () => { media.matches = true; update() })
  expect(container.querySelector('.denk-sprite')).toBeNull()
  expect(screen.getByRole('img')).toHaveAttribute('data-animated', 'false')
  unmount()
  expect(media.removeEventListener).toHaveBeenCalledWith('change', update)
  expect(vi.getTimerCount()).toBe(0)
})
it('desativa movimentos e cancela carregamento e timers ao desmontar', async () => {
  const { rerender, container, unmount } = render(<Denkynho pose="inexistente" animated={false} talking mouthOpen />); await settle()
  expect(container.querySelector('.is-moving')).toBeNull()
  await act(async () => { vi.advanceTimersByTime(4000) })
  expect(container.querySelector('.denk-face')).toBeNull()
  rerender(<Denkynho pose="05-dormindo" />); unmount(); await settle()
  expect(vi.getTimerCount()).toBe(0)
})
