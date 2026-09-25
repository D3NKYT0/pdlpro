// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLandingPath } from './useLandingPath'

const session = vi.hoisted(() => ({ user: null as null | { username: string } }))
const launch = vi.hoisted(() => ({ comingSoon: false }))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: session.user }),
}))

vi.mock('../services/api', () => ({
  serverApi: {
    info: vi.fn(async () => ({ coming_soon: launch.comingSoon })),
  },
}))

function Probe() {
  return <span data-testid="landing">{useLandingPath()}</span>
}

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(['server-info'], { coming_soon: launch.comingSoon })
  return render(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  )
}

describe('useLandingPath', () => {
  beforeEach(() => {
    session.user = null
    launch.comingSoon = false
  })

  afterEach(() => {
    cleanup()
  })

  it('aponta para /home com Coming Soon ativo, visitante ou logado', () => {
    launch.comingSoon = true
    mount()
    expect(screen.getByTestId('landing')).toHaveTextContent('/home')

    cleanup()
    session.user = { username: 'root' }
    mount()
    expect(screen.getByTestId('landing')).toHaveTextContent('/home')
  })

  it('aponta para / com o site aberto', () => {
    session.user = { username: 'root' }
    mount()
    expect(screen.getByTestId('landing')).toHaveTextContent('/')
  })
})
