// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { PetProgress } from './PetProgress'
import { resetHttpClient } from '../../services/infra/http'
import type { ApiDenkynhoProfile } from '../../services/domain/content.service'
const profile: ApiDenkynhoProfile = { level: 2, experience: 7, experience_next: 150, attributes: { energy: 75, satiety: 100, happiness: 80, hygiene: 75 }, appearance: { accessory: '', outfit: '', object: '' }, unlocks: [{ id: 'star-pin', slot: 'accessory', level: 2, unlocked: true, label: { pt: 'Broche de estrela', en: 'Star pin' } }, { id: 'dance', slot: 'interaction', level: 3, unlocked: false, label: { pt: 'Dançar juntos', en: 'Dance together' } }] }
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
afterEach(() => { cleanup(); resetHttpClient(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('mostra ganhos confirmados, bloqueia duplicação e equipa e remove via HTTP', async () => {
  const user = userEvent.setup(), changed = vi.fn()
  let resolve!: (value: Response) => void
  const fetcher = vi.fn((url: RequestInfo | URL) => String(url).includes('/csrf/') ? Promise.resolve(response({ csrfToken: 'test' })) : new Promise<Response>(done => { resolve = done }))
  vi.stubGlobal('fetch', fetcher)
  const gains = { ...profile, action: 'feed' as const, xp_gained: 12, replayed: false, level_up: true, unlocked: ['star-pin'], attributes_gained: { satiety: 25 } }
  const { rerender } = render(<PetProgress profile={profile} language="pt" careResult={gains} onProfileChange={changed} />)
  expect(screen.getByRole('status')).toHaveTextContent('+12 XP · Novo nível: 2!')
  await user.dblClick(screen.getByRole('button', { name: 'Usar Broche de estrela' }))
  expect(screen.getByRole('button')).toBeDisabled()
  expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/wardrobe/'))).toHaveLength(1)
  const updated = { ...profile, appearance: { ...profile.appearance!, accessory: 'star-pin' } }
  resolve(response(updated))
  await waitFor(() => expect(changed).toHaveBeenCalledWith(updated))
  rerender(<PetProgress profile={updated} language="pt" careResult={{ ...gains, replayed: true }} onProfileChange={changed} />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Retirar Broche de estrela' }))
  resolve(response(profile))
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(2))
})
it('preserva a aparência no erro e recusa resposta inválida', async () => {
  const changed = vi.fn(), user = userEvent.setup()
  const fetcher = vi.fn((url: RequestInfo | URL) => Promise.resolve(response(String(url).includes('/csrf/') ? { csrfToken: 'test' } : { invalid: true })))
  vi.stubGlobal('fetch', fetcher)
  render(<PetProgress profile={profile} language="en" onProfileChange={changed} />)
  await user.click(screen.getByRole('button', { name: 'Equip Star pin' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid wardrobe response')
  expect(changed).not.toHaveBeenCalled()
  fetcher.mockImplementation(() => Promise.resolve(response({ message: 'Locked' }, 400)))
  await user.click(screen.getByRole('button', { name: 'Equip Star pin' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Locked')
})

it('seleciona cenários pela prévia, respeita níveis e envia o slot scene', async () => {
  const changed = vi.fn(), user = userEvent.setup()
  const state: ApiDenkynhoProfile = { ...profile, unlocks: [
    { id: 'garden', slot: 'scene', level: 1, unlocked: true, label: { pt: 'Jardim encantado', en: 'Enchanted garden' } },
    { id: 'study', slot: 'scene', level: 4, unlocked: false, label: { pt: 'Biblioteca aconchegante', en: 'Cozy library' } },
  ] }
  const fetcher = vi.fn((url: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(response(String(url).includes('/csrf/') ? { csrfToken: 'test' } : { ...state, appearance: { ...state.appearance, scene: 'garden' } })))
  vi.stubGlobal('fetch', fetcher)
  render(<PetProgress profile={state} language="pt" onProfileChange={changed} />)
  expect(screen.getByRole('button', { name: 'Usar Biblioteca aconchegante' })).toBeDisabled()
  expect(screen.getByText('Fonte, flores e um cantinho ao sol.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Usar Jardim encantado' }))
  await waitFor(() => expect(changed).toHaveBeenCalled())
  const request = fetcher.mock.calls.find(([url]) => String(url).includes('/wardrobe/'))!
  expect(request[1]?.method).toBe('PATCH')
  expect(JSON.parse(request[1]?.body as string)).toEqual({ slot: 'scene', item_id: 'garden' })
})
