// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Denkynho } from './Denkynho'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('Image', class {
    onload: null | (() => void) = null
    onerror: null | (() => void) = null
    set src(_: string) { Promise.resolve().then(() => this.onload?.()) }
  })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })
const settle = async () => { await act(async () => { await Promise.resolve() }) }
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

it('espelha a próxima visita à ação como um conjunto, sem virar durante o ciclo', async () => {
  const { container, rerender, unmount } = render(<Denkynho pose="11-comendo" />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-transition', 'none')
  expect(container.querySelector('.denk-facing')).toHaveStyle({ transform: 'scaleX(1)' })
  rerender(<Denkynho pose="01-boas-vindas" />); await settle(); await advance(560)
  rerender(<Denkynho pose="11-comendo" />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-transition', 'turn')
  const incoming = container.querySelector('.is-entering .denk-facing')!
  expect(incoming).toHaveStyle({ transform: 'scaleX(-1)' })
  expect(incoming.querySelector('image')).toHaveAttribute('href', '/mascot/denkynho/11-comendo-sequencia.png')
  expect(container.querySelector('.is-leaving .denk-facing')).toHaveStyle({ transform: 'scaleX(1)' })
  await advance(719)
  expect(incoming.querySelector('svg')).toHaveAttribute('data-frame', '0')
  await advance(1)
  expect(screen.getByRole('img')).toHaveAttribute('data-transition', 'none')
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(1)
  await advance(500)
  expect(incoming.querySelector('svg')).toHaveAttribute('data-frame', '1')
  expect(incoming).toHaveStyle({ transform: 'scaleX(-1)' })
  unmount(); expect(vi.getTimerCount()).toBe(0)
})

it('congela a ação de saída no quadro atual e espera a entrada antes de animar a próxima', async () => {
  const { container, rerender } = render(<Denkynho pose="12-jogando" />); await settle(); await advance(350)
  expect(container.querySelector('svg')).toHaveAttribute('data-frame', '1')
  rerender(<Denkynho pose="06-rindo" />); await settle()
  const outgoing = container.querySelector('.is-leaving svg')!
  const incoming = container.querySelector('.is-entering svg')!
  expect(outgoing).toHaveAttribute('data-frame', '1')
  await advance(559)
  expect(outgoing).toHaveAttribute('data-frame', '1')
  expect(incoming).toHaveAttribute('data-frame', '0')
  await advance(1)
  expect(outgoing).not.toBeInTheDocument()
  await advance(300)
  expect(incoming).toHaveAttribute('data-frame', '1')
})

it('usa ritmos próprios para deitar e levantar e cancela a transição sem movimento', async () => {
  const { container, rerender } = render(<Denkynho pose="01-boas-vindas" />); await settle()
  rerender(<Denkynho pose="05-dormindo" />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-transition', 'rest')
  expect(screen.getByRole('img').style.getPropertyValue('--denk-transition-duration')).toBe('800ms')
  await advance(800)
  rerender(<Denkynho pose="03-pensando" />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-transition', 'wake')
  expect(screen.getByRole('img').style.getPropertyValue('--denk-transition-duration')).toBe('760ms')
  rerender(<Denkynho pose="03-pensando" animated={false} />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-transition', 'none')
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(1)
  expect(vi.getTimerCount()).toBe(0)
})

it('não espelha durante a fala e mantém boca e olhos dentro da mesma orientação', async () => {
  const { container, rerender } = render(<Denkynho pose="02-sucesso" />); await settle()
  rerender(<Denkynho pose="01-boas-vindas" />); await settle(); await advance(560)
  rerender(<Denkynho pose="02-sucesso" talking mouthOpen={false} />); await settle(); await advance(560)
  expect(screen.getByRole('img')).toHaveAttribute('data-mirrored', 'false')
  rerender(<Denkynho pose="01-boas-vindas" />); await settle(); await advance(560)
  rerender(<Denkynho pose="02-sucesso" />); await settle(); await advance(720)
  expect(screen.getByRole('img')).toHaveAttribute('data-mirrored', 'true')
  rerender(<Denkynho pose="02-sucesso" talking mouthOpen={false} />); await settle()
  const facing = container.querySelector('.denk-facing')!
  expect(facing).toHaveStyle({ transform: 'scaleX(-1)' })
  expect(facing.querySelector('.denk-face')).toHaveAttribute('src', '/mascot/denkynho/02-sucesso-boca.png')
  expect(screen.getByRole('img')).toHaveAttribute('data-transition', 'none')
  rerender(<Denkynho pose="02-sucesso" talking mouthOpen />); await settle()
  expect(facing.querySelector('.denk-face')).toBeNull()
  expect(facing).toHaveStyle({ transform: 'scaleX(-1)' })
})

it('mantém só o pedido mais recente durante uma troca rápida, sem empilhar personagens', async () => {
  const { container, rerender, unmount } = render(<Denkynho pose="01-boas-vindas" />); await settle()
  rerender(<Denkynho pose="11-comendo" />); await settle(); await advance(100)
  rerender(<Denkynho pose="12-jogando" />); await settle()
  rerender(<Denkynho pose="06-rindo" />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '11-comendo')
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(2)
  await advance(460)
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '06-rindo')
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(2)
  await advance(560)
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(1)
  unmount(); expect(vi.getTimerCount()).toBe(0)
})

it('preserva a orientação ao desativar/religar e não consome visitas com animação desligada', async () => {
  const { container, rerender } = render(<Denkynho pose="11-comendo" />); await settle()
  rerender(<Denkynho pose="01-boas-vindas" animated={false} />); await settle()
  rerender(<Denkynho pose="11-comendo" animated={false} />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-mirrored', 'false')
  rerender(<Denkynho pose="01-boas-vindas" />); await settle(); await advance(560)
  rerender(<Denkynho pose="11-comendo" />); await settle(); await advance(720)
  expect(screen.getByRole('img')).toHaveAttribute('data-mirrored', 'true')
  rerender(<Denkynho pose="11-comendo" animated={false} />); await settle()
  expect(container.querySelector('.denk-facing')).toHaveStyle({ transform: 'scaleX(-1)' })
  rerender(<Denkynho pose="11-comendo" />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-transition', 'none')
  expect(container.querySelector('.denk-facing')).toHaveStyle({ transform: 'scaleX(-1)' })
})

it('interrompe a fila de lazer para atender a conversa imediatamente', async () => {
  const { container, rerender } = render(<Denkynho pose="01-boas-vindas" />); await settle()
  rerender(<Denkynho pose="11-comendo" />); await settle(); await advance(100)
  rerender(<Denkynho pose="12-jogando" />); await settle()
  rerender(<Denkynho pose="04-dica" talking mouthOpen />); await settle()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '04-dica')
  expect(screen.getByRole('img')).toHaveAttribute('data-mirrored', 'false')
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(2)
  await advance(1000)
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '04-dica')
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(1)
})
