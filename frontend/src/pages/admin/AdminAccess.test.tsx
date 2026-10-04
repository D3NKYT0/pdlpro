// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminHubPage } from './AdminHubPage'
import { RequireStaff } from '../../app/routes/RequireStaff'
import { canAccessAdminPath, hasCapability } from '../../lib/staff'

const session = vi.hoisted(() => ({ user: { capabilities: ['content.view', 'content.manage'], is_superuser: false, is_staff: false } }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ ...session, loading: false }) }))
vi.mock('../../services/domain/programs.service', () => ({ programsApi: { resources: vi.fn(async () => []) } }))

afterEach(() => { cleanup(); session.user = { capabilities: ['content.view', 'content.manage'], is_superuser: false, is_staff: false } })

function mount(path = '/panel/admin') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route element={<RequireStaff />}>
      <Route path="/panel/admin" element={<AdminHubPage />} />
      <Route path="/panel/admin/news" element={<h1>Edição editorial</h1>} />
      <Route path="/panel/admin/coins" element={<h1>Configuração financeira</h1>} />
    </Route>
    <Route path="/panel" element={<h1>Painel pessoal</h1>} />
  </Routes></MemoryRouter></QueryClientProvider>)
}

describe('admin por capacidade', () => {
  it('editor encontra e abre conteúdo sem receber módulos financeiros ou grupos do Django', async () => {
    mount()
    const news = screen.getByRole('link', { name: /Notícias/ })
    expect(screen.queryByRole('link', { name: /Moedas do painel/ })).toBeNull()
    expect(document.querySelector('a[href="/panel/admin/coins"]')).toBeNull()
    expect(document.querySelector('a[href="/admin/"]')).toBeNull()
    await userEvent.click(news)
    expect(screen.getByRole('heading', { name: 'Edição editorial' })).toBeTruthy()
  })

  it('bloqueia URL financeira direta mesmo para editor com entrada no Jazzmin', () => {
    session.user.is_staff = true
    mount('/panel/admin/coins')
    expect(screen.getByRole('heading', { name: 'Painel pessoal' })).toBeTruthy()
    expect(screen.queryByText('Configuração financeira')).toBeNull()
  })

  it('retira módulo e bloqueia a rota depois da atualização da sessão revogada', () => {
    session.user.capabilities = []
    mount('/panel/admin/news')
    expect(screen.getByRole('heading', { name: 'Painel pessoal' })).toBeTruthy()
  })

  it('separa consultas de relatórios, configuradores e operações de superadministrador', () => {
    const auditor = { capabilities: ['financial_reports.view', 'settings.view'] }
    expect(canAccessAdminPath(auditor, '/panel/admin/reports')).toBe(true)
    expect(canAccessAdminPath(auditor, '/panel/admin/reports/financial/balances')).toBe(true)
    expect(canAccessAdminPath(auditor, '/panel/admin/reports/inventory')).toBe(false)
    expect(canAccessAdminPath(auditor, '/panel/admin/coins')).toBe(false)
    expect(canAccessAdminPath(auditor, '/panel/admin/server')).toBe(false)
    expect(canAccessAdminPath(auditor, '/panel/admin/themes')).toBe(false)
    expect(canAccessAdminPath(auditor, '/panel/admin/unknown')).toBe(false)
    expect(canAccessAdminPath(auditor, '/ext/test/staff')).toBe(false)
    expect(canAccessAdminPath({ ...auditor, is_superuser: true }, '/ext/test/staff')).toBe(true)
    expect(canAccessAdminPath({ ...auditor, is_superuser: true }, '/panel/admin/themes')).toBe(true)
    expect(canAccessAdminPath(auditor, '/panel/admin/')).toBe(true)
    expect(hasCapability(null, 'content.manage')).toBe(false)
  })
})
