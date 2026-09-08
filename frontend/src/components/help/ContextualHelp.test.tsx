// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import { ContextualHelp } from './ContextualHelp'
import { getHelpActionsForText, getHelpContext, dailyTipIndex } from './contextual'
afterEach(cleanup)
it('orienta na tela, encaminha o contexto e fecha com Escape sem enviar mensagem', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><ContextualHelp path="/painel/wallet" resources={[]} /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Denkynho: ajuda nesta tela' }))
  expect(screen.getByRole('heading')).toHaveTextContent('Carteira')
  expect(screen.getByRole('link', { name: 'Conversar sobre esta tela' })).toHaveAttribute('href', '/painel/ajuda?from=%2Fpainel%2Fwallet')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  expect(screen.getByRole('button')).toHaveFocus()
})
it('mostra consulta e falha de recursos, retira atalhos indisponíveis e não oferece tela desconhecida', async () => {
  const user = userEvent.setup()
  const { rerender } = render(<MemoryRouter><ContextualHelp path="/painel/wallet" loading /></MemoryRouter>)
  await user.click(screen.getByRole('button'))
  expect(screen.getByText('Verificando recursos disponíveis…')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Abrir troca para o jogo' })).not.toBeInTheDocument()
  rerender(<MemoryRouter><ContextualHelp path="/painel/wallet" error={new Error('failed')} /></MemoryRouter>)
  expect(screen.getByRole('alert')).toBeVisible()
  rerender(<MemoryRouter><ContextualHelp path="/painel/wallet" resources={[{ code: 'wallet', enabled: false }]} /></MemoryRouter>)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(getHelpContext('https://evil.test/painel/wallet')).toBeNull()
  expect(getHelpContext('/painel/admin')).toBeNull()
  expect(getHelpContext('/painel/accounts/alice/123')?.path).toBe('/painel/accounts')
})
it('gera somente destinos conhecidos, autorizados e disponíveis a partir da resposta', () => {
  expect(getHelpActionsForText('https://evil.test/painel/wallet /painel/admin /painel/unknown /painel/wallet?x=y /painel/support', null, [])).toEqual([{ to: '/painel/support', label: 'Ir ao atendimento' }])
  expect(getHelpActionsForText('/painel/wallet /painel/wallet /painel/inventory', null, [{ code: 'wallet', enabled: false }])).toEqual([{ to: '/painel/inventory', label: 'Abrir meu inventário' }])
  expect(getHelpActionsForText('/painel/wallet')).toEqual([])
  expect(getHelpActionsForText('/painel/accounts /painel/support /painel/security /painel', null, [], 'en')).toHaveLength(3)
  expect(getHelpContext('/painel/admin/temas', { role: 'admin' }, [], 'en')?.title).toBe('Administration')
})
it('mostra o mascote, o aviso de necessidade e o chamado pré-preenchido sem enviar o chat', async () => {
  const user = userEvent.setup()
  const hungry = {
    level: 1, experience: 0, experience_next: 100,
    attributes: { satiety: 8, energy: 80, happiness: 80, hygiene: 80 },
    emotion: { id: 'sad' as const, pose: '07-triste', idle_pose: '07-triste', source: 'needs' as const },
    cue: { id: 'satiety', message: { pt: 'O Denkynho está com fome.', en: 'Denkynho is hungry.' } },
    daily_visit: true, visit_xp: 8,
  }
  render(<MemoryRouter><ContextualHelp path="/painel/wallet" resources={[]} pet={hungry} /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'O Denkynho está com fome.' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'O Denkynho está com fome.' }))
  expect(screen.getByText('Visita +8 XP')).toBeVisible()
  expect(screen.getByText('Cantinho do Denkynho')).toBeVisible()
  expect(screen.getByRole('progressbar', { name: 'Saciedade' })).toHaveAttribute('aria-valuenow', '8')
  expect(screen.getByRole('link', { name: 'Abrir o cantinho' })).toHaveAttribute('href', '/painel/ajuda?from=%2Fpainel%2Fwallet')
  expect(screen.getByRole('link', { name: 'Alimentar no cantinho' })).toHaveAttribute('href', '/painel/ajuda?from=%2Fpainel%2Fwallet')
  expect(screen.getByRole('link', { name: 'Abrir chamado sobre esta tela' })).toHaveAttribute('href', expect.stringContaining('/painel/support?subject='))
  expect(screen.getByRole('link', { name: 'Abrir chamado sobre esta tela' }).getAttribute('href')).toContain('from=%2Fpainel%2Fwallet')
  expect(screen.getByRole('button', { name: 'Fechar ajuda da tela' })).toBeVisible()
  const tip = getHelpContext('/painel/wallet', null, [])?.tip
  expect(tip).toBeTruthy()
  expect(screen.getByRole('region', { name: 'Dica do dia' })).toHaveTextContent(tip!)
})
it('escolhe a dica do dia pela tela e pelo dia do calendário', () => {
  const dayA = getHelpContext('/painel/wallet', null, [], 'pt', new Date('2026-01-01T12:00:00Z'))
  const dayB = getHelpContext('/painel/wallet', null, [], 'pt', new Date('2026-01-02T12:00:00Z'))
  const other = getHelpContext('/painel/shop', null, [], 'pt', new Date('2026-01-01T12:00:00Z'))
  expect(dayA?.tip).toBeTruthy()
  expect(dayB?.tip).toBeTruthy()
  expect(dayA?.tip).not.toBe(dayB?.tip)
  expect(other?.tip).toBeTruthy()
  expect(other?.tip).not.toBe(dayA?.tip)
  expect(dailyTipIndex(3, '/painel/wallet', new Date('2026-01-01T12:00:00Z'))).toBe(dailyTipIndex(3, '/painel/wallet', new Date('2026-01-01T23:00:00Z')))
})
