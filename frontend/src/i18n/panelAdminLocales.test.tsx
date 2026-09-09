import { type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from './index'
import { SUPPORTED_LANGUAGES } from './locale'
import ptPanel from './locales/pt/panel.json'
import enPanel from './locales/en/panel.json'
import esPanel from './locales/es/panel.json'
import ptAdmin from './locales/pt/admin.json'
import enAdmin from './locales/en/admin.json'
import esAdmin from './locales/es/admin.json'
import { GamesPage } from '../pages/GamesPage'
import { RewardsPage } from '../pages/RewardsPage'
import { CharacterPage } from '../pages/CharacterPage'
import { SupportersPage } from '../pages/SupportersPage'
import { AdminHubPage } from '../pages/admin/AdminHubPage'
import { AdminReportsPage } from '../pages/admin/AdminReportsPage'

function keyPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  )
}

function render(ui: ReactNode, entries: string[] = ['/']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={entries}>{ui}</MemoryRouter>
      </QueryClientProvider>,
    )
  } finally {
    client.clear()
  }
}

async function withLanguage(language: string, run: () => string) {
  await i18n.changeLanguage(language)
  return run()
}

afterEach(async () => {
  await i18n.changeLanguage('pt')
})

describe('panel and admin locale bundles', () => {
  it.each([
    ['panel', ptPanel, enPanel, esPanel],
    ['admin', ptAdmin, enAdmin, esAdmin],
  ])('keeps %s keys in sync across pt, en and es', (_namespace, pt, en, es) => {
    const reference = keyPaths(pt).sort()
    expect(keyPaths(en).sort()).toEqual(reference)
    expect(keyPaths(es).sort()).toEqual(reference)
  })

  it('exposes the migrated engagement sections in every language', () => {
    for (const bundle of [ptPanel, enPanel, esPanel]) {
      for (const section of ['games', 'rewards', 'progress', 'supporters', 'character']) {
        expect(Object.keys(bundle)).toContain(section)
      }
    }
    expect(SUPPORTED_LANGUAGES).toEqual(['pt', 'en', 'es'])
  })
})

describe('panel engagement pages follow the active language', () => {
  it('renders the games hub in pt, en and es', async () => {
    expect(await withLanguage('pt', () => render(<GamesPage />, ['/painel/games']))).toContain('Central de jogos')
    const english = await withLanguage('en', () => render(<GamesPage />, ['/painel/games']))
    expect(english).toContain('Games hub')
    expect(english).toContain('Available balance')
    expect(english).not.toContain('Central de jogos')
    expect(await withLanguage('es', () => render(<GamesPage />, ['/painel/games']))).toContain('Centro de juegos')
  })

  it('renders the rewards tabs in the active language', async () => {
    const english = await withLanguage('en', () => render(<RewardsPage />, ['/painel/recompensas']))
    expect(english).toContain('Journey and rewards')
    expect(english).toContain('Battle pass')
    expect(english).not.toContain('Passe de batalha')
  })

  it('renders the supporters program in the active language', async () => {
    const spanish = await withLanguage('es', () => render(<SupportersPage />, ['/painel/apoiadores']))
    expect(spanish).toContain('Programa de patrocinadores')
    expect(spanish).not.toContain('Programa de apoiadores')
  })

  it('renders the character sheet chrome in the active language', async () => {
    const characterRoute = (
      <Routes>
        <Route path="/painel/personagem/:login/:charId" element={<CharacterPage />} />
      </Routes>
    )
    const english = await withLanguage('en', () => render(characterRoute, ['/painel/personagem/hero/7']))
    expect(english).toContain('Character sheet')
    expect(english).toContain('Accounts')
    expect(english).not.toContain('Ficha do personagem')
  })
})

describe('admin hub and reports follow the active language', () => {
  it('translates hub categories and entries', async () => {
    expect(await withLanguage('pt', () => render(<AdminHubPage />))).toContain('Programas e expansão')
    const english = await withLanguage('en', () => render(<AdminHubPage />))
    expect(english).toContain('Programs and growth')
    expect(english).toContain('Ticket queue')
    expect(english).not.toContain('Fila de chamados')
    expect(await withLanguage('es', () => render(<AdminHubPage />))).toContain('Cola de tickets')
  })

  it('translates the operational report hub categories', async () => {
    const reportsRoute = (
      <Routes>
        <Route path="/painel/admin/relatorios" element={<AdminReportsPage />} />
      </Routes>
    )
    const english = await withLanguage('en', () => render(reportsRoute, ['/painel/admin/relatorios']))
    expect(english).toContain('Shop purchases')
    expect(english).not.toContain('Compras da loja')
  })
})
