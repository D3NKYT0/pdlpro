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
  await act(async () => { vi.advanceTimersByTime(430) })
  expect(container.querySelectorAll('.denk-transition')).toHaveLength(1)
})
it('mantém a imagem anterior se o novo asset falhar', async () => {
  const { rerender } = render(<Denkynho pose="01-boas-vindas" />); await settle(); fail = true
  rerender(<Denkynho pose="07-triste" />); await settle()
  expect(screen.getByText(/Não foi possível carregar/)).toBeVisible()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '01-boas-vindas')
})
it('desativa movimentos e cancela carregamento e timers ao desmontar', async () => {
  const { rerender, container, unmount } = render(<Denkynho pose="inexistente" animated={false} talking mouthOpen />); await settle()
  expect(container.querySelector('.is-moving')).toBeNull()
  await act(async () => { vi.advanceTimersByTime(4000) })
  expect(container.querySelector('.denk-face')).toBeNull()
  rerender(<Denkynho pose="05-dormindo" />); unmount(); await settle()
  expect(vi.getTimerCount()).toBe(0)
})
