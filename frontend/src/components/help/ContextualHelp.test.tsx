// @vitest-environment jsdom
import type { ReactElement } from 'react'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it } from 'vitest'
import i18n from '../../i18n'
import { ContextualHelp } from './ContextualHelp'
import { getHelpActionsForText, getHelpContext, dailyTipIndex } from './contextual'

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('pt')
})

beforeEach(async () => {
  await i18n.changeLanguage('pt')
})

function mount(ui: ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>,
  )
}

it('orienta na tela, encaminha o contexto e fecha com Escape sem enviar mensagem', async () => {
  const user = userEvent.setup()
  mount(<ContextualHelp path="/panel/wallet" resources={[]} />)
  await user.click(screen.getByRole('button', { name: 'Denkynho: ajuda nesta tela' }))
  expect(screen.getByRole('heading')).toHaveTextContent('Carteira')
  expect(screen.getByRole('link', { name: 'Conversar sobre esta tela' })).toHaveAttribute('href', '/panel/help?from=%2Fpanel%2Fwallet')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  expect(screen.getByRole('button')).toHaveFocus()
})
it('mostra consulta e falha de recursos, retira atalhos indisponíveis e não oferece tela desconhecida', async () => {
  const user = userEvent.setup()
  const { rerender } = mount(<ContextualHelp path="/panel/wallet" loading />)
  await user.click(screen.getByRole('button'))
  expect(screen.getByText('Verificando recursos disponíveis…')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Abrir troca para o jogo' })).not.toBeInTheDocument()
  rerender(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter><ContextualHelp path="/panel/wallet" error={new Error('failed')} /></MemoryRouter>
    </I18nextProvider>,
  )
  expect(screen.getByRole('alert')).toBeVisible()
  rerender(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter><ContextualHelp path="/panel/wallet" resources={[{ code: 'wallet', enabled: false }]} /></MemoryRouter>
    </I18nextProvider>,
  )
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(getHelpContext('https://evil.test/panel/wallet')).toBeNull()
  expect(getHelpContext('/panel/admin')).toBeNull()
  expect(getHelpContext('/panel/accounts/alice/123')?.path).toBe('/panel/accounts')
})
it('gera somente destinos conhecidos, autorizados e disponíveis a partir da resposta', () => {
  expect(getHelpActionsForText('https://evil.test/panel/wallet /panel/admin /panel/unknown /panel/wallet?x=y /panel/support', null, [])).toEqual([{ to: '/panel/support', label: 'Ir ao atendimento' }])
  expect(getHelpActionsForText('/panel/wallet /panel/wallet /panel/inventory', null, [{ code: 'wallet', enabled: false }])).toEqual([{ to: '/panel/inventory', label: 'Abrir meu inventário' }])
  expect(getHelpActionsForText('/panel/wallet')).toEqual([])
  expect(getHelpActionsForText('/panel/accounts /panel/support /panel/security /panel', null, [], 'en')).toHaveLength(3)
  expect(getHelpContext('/panel/admin/themes', { role: 'admin' }, [], 'en')?.title).toBe('Administration')
})
it('mostra o mascote, o aviso de necessidade e o chamado pré-preenchido sem enviar o chat', async () => {
  const user = userEvent.setup()
  const hungry = {
    level: 1, experience: 0, experience_next: 100,
    attributes: { satiety: 8, energy: 80, happiness: 80, hygiene: 80 },
    emotion: { id: 'sad' as const, pose: '07-triste', idle_pose: '07-triste', source: 'needs' as const },
    cue: { id: 'satiety', message: { pt: 'O Denkynho está com fome.', en: 'Denkynho is hungry.', es: 'Denkynho tiene hambre.' } },
    daily_visit: true, visit_xp: 8,
  }
  mount(<ContextualHelp path="/panel/wallet" resources={[]} pet={hungry} />)
  expect(screen.getByRole('button', { name: 'O Denkynho está com fome.' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'O Denkynho está com fome.' }))
  expect(screen.getByText('Visita +8 XP')).toBeVisible()
  expect(screen.getByText('Cantinho do Denkynho')).toBeVisible()
  expect(screen.getByRole('progressbar', { name: 'Saciedade' })).toHaveAttribute('aria-valuenow', '8')
  expect(screen.getByRole('link', { name: 'Abrir o cantinho' })).toHaveAttribute('href', '/panel/help?from=%2Fpanel%2Fwallet')
  expect(screen.getByRole('link', { name: 'Alimentar no cantinho' })).toHaveAttribute('href', '/panel/help?from=%2Fpanel%2Fwallet')
  expect(screen.getByRole('link', { name: 'Abrir chamado sobre esta tela' })).toHaveAttribute('href', expect.stringContaining('/panel/support?subject='))
  expect(screen.getByRole('link', { name: 'Abrir chamado sobre esta tela' }).getAttribute('href')).toContain('from=%2Fpanel%2Fwallet')
  expect(screen.getByRole('button', { name: 'Fechar ajuda da tela' })).toBeVisible()
  const tip = getHelpContext('/panel/wallet', null, [])?.tip
  expect(tip).toBeTruthy()
  expect(screen.getByRole('region', { name: 'Dica do dia' })).toHaveTextContent(tip!)
})
it('traduz o cantinho quando o idioma do site muda', async () => {
  const user = userEvent.setup()
  await i18n.changeLanguage('es')
  mount(<ContextualHelp path="/panel/admin" resources={[]} user={{ role: 'admin', is_staff: true }} />)
  await user.click(screen.getByRole('button', { name: 'Denkynho: ayuda en esta pantalla' }))
  expect(screen.getByText('Rincón de Denkynho')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Administración' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Conversar sobre esta pantalla' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Consejo del día' })).toBeVisible()
})
it('escolhe a dica do dia pela tela e pelo dia do calendário', () => {
  const dayA = getHelpContext('/panel/wallet', null, [], 'pt', new Date('2026-01-01T12:00:00Z'))
  const dayB = getHelpContext('/panel/wallet', null, [], 'pt', new Date('2026-01-02T12:00:00Z'))
  const other = getHelpContext('/panel/shop', null, [], 'pt', new Date('2026-01-01T12:00:00Z'))
  expect(dayA?.tip).toBeTruthy()
  expect(dayB?.tip).toBeTruthy()
  expect(dayA?.tip).not.toBe(dayB?.tip)
  expect(other?.tip).toBeTruthy()
  expect(other?.tip).not.toBe(dayA?.tip)
  expect(dailyTipIndex(3, '/panel/wallet', new Date('2026-01-01T12:00:00Z'))).toBe(dailyTipIndex(3, '/panel/wallet', new Date('2026-01-01T23:00:00Z')))
})
