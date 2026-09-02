// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useAsyncAction } from './useAsyncAction'

afterEach(cleanup)
it('bloqueia concorrência no mesmo tick e retorna o valor da operação', async () => {
  const { result } = renderHook(useAsyncAction)
  let finish!: (value: number) => void
  const operation = vi.fn(() => new Promise<number>(resolve => { finish = resolve }))
  let pending!: ReturnType<typeof result.current.run>
  await act(async () => {
    pending = result.current.run(operation)
    expect(await result.current.run(operation)).toMatchObject({ ok: false, skipped: true })
  })
  expect(result.current.pending).toBe(true)
  expect(operation).toHaveBeenCalledTimes(1)
  await act(async () => { finish(42); await pending })
  expect(await pending).toEqual({ ok: true, value: 42 })
  expect(result.current.pending).toBe(false)
})
it('expõe erro e libera nova tentativa sem carregar o erro anterior', async () => {
  const { result } = renderHook(useAsyncAction)
  const error = new Error('Falha')
  await act(async () => { expect(await result.current.run(async () => { throw error })).toEqual({ ok: false, error }) })
  expect(result.current.error).toBe(error)
  await act(async () => { await result.current.run(async () => 'ok') })
  expect(result.current.error).toBeNull()
  expect(result.current.pending).toBe(false)
})
it('operação pode terminar após desmontar sem atualizar estado da tela', async () => {
  const { result, unmount } = renderHook(useAsyncAction)
  let finish!: () => void
  let pending!: ReturnType<typeof result.current.run>
  act(() => { pending = result.current.run(() => new Promise<void>(resolve => { finish = resolve })) })
  unmount()
  finish()
  expect(await pending).toEqual({ ok: true, value: undefined })
})
