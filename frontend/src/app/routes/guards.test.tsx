// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'
import { RequireStaff } from './RequireStaff'
import { canAccessStaff } from '../../lib/staff'

const session = vi.hoisted(() => ({ user: null as any, loading: false }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => session }))
afterEach(cleanup)

function Location() {
  const location = useLocation()
  return <output>{location.pathname}{location.search}</output>
}
function mount(staff = false) {
  return render(<MemoryRouter initialEntries={['/private?tab=history']}><Routes>
    <Route element={staff ? <RequireStaff /> : <RequireAuth />}>
      <Route path="/private" element={<h1>Conteúdo privado</h1>} />
    </Route>
    <Route path="*" element={<Location />} />
  </Routes></MemoryRouter>)
}

describe('proteção de rotas', () => {
  it.each([false, true])('aguarda restauração antes de decidir acesso (staff=%s)', staff => {
    Object.assign(session, { user: null, loading: true })
    mount(staff)
    expect(screen.getByText('Carregando sessão...')).toBeTruthy()
    expect(screen.queryByText('Conteúdo privado')).toBeNull()
  })
  it('preserva destino e query na ida ao login', () => {
    Object.assign(session, { user: null, loading: false })
    mount()
    expect(screen.getByRole('status').textContent).toBe('/login?next=%2Fprivate%3Ftab%3Dhistory')
  })
  it('libera usuário autenticado', () => {
    Object.assign(session, { user: { username: 'hero' }, loading: false })
    mount()
    expect(screen.getByRole('heading').textContent).toBe('Conteúdo privado')
  })
  it.each([null, { role: 'player' }])('impede acesso administrativo de %j', user => {
    Object.assign(session, { user, loading: false })
    mount(true)
    expect(screen.getByRole('status').textContent).toBe('/painel')
  })
  it.each([{ is_staff: true }, { is_superuser: true }, { is_staff_member: true }, { role: 'staff' }, { role: 'admin' }, { role: 'moderator' }])('libera equipe %j', user => {
    Object.assign(session, { user, loading: false })
    mount(true)
    expect(screen.getByRole('heading').textContent).toBe('Conteúdo privado')
  })
  it.each([null, {}, { role: 'player' }, { role: 'administrator' }, { is_staff: false }])('não concede privilégio implícito a %j', user => {
    expect(canAccessStaff(user)).toBe(false)
  })
})
