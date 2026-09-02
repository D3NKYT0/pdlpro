// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { TicketMessages } from './TicketMessages'

afterEach(cleanup)
const messages = [
  { id: 'public', body: 'Resposta pública', author_name: 'Moderador', is_staff_reply: true, is_internal: false, created_at: '2026-09-02T12:00:00Z' },
  { id: 'internal', body: 'Investigação interna', author_name: 'Moderador', is_staff_reply: true, is_internal: true, created_at: '2026-09-02T12:00:00Z' },
  { id: 'player', body: 'Preciso de ajuda', author_name: 'Jogador', is_staff_reply: false, is_internal: false, created_at: '2026-09-02T12:00:00Z' },
]
it('jogador vê respostas públicas e não recebe notas internas na interface', () => {
  render(<TicketMessages messages={messages} />)
  expect(screen.getByText('Resposta pública')).toBeVisible()
  expect(screen.getByText('Equipe PDL')).toBeVisible()
  expect(screen.getByText('Jogador')).toBeVisible()
  expect(screen.queryByText('Investigação interna')).not.toBeInTheDocument()
  expect(screen.queryByText('Moderador')).not.toBeInTheDocument()
})
it('equipe vê autores e identificação explícita da nota interna', () => {
  render(<TicketMessages messages={messages} staff />)
  expect(screen.getByText('Investigação interna')).toBeVisible()
  expect(screen.getByText('Moderador · nota interna')).toBeVisible()
  expect(screen.getByText('Moderador')).toBeVisible()
})
