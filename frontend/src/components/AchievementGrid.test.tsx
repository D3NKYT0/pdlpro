/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it } from 'vitest'
import i18n from '../i18n'
import { AchievementGrid, type AchievementRow } from './AchievementGrid'

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('pt')
})

beforeEach(async () => {
  await i18n.changeLanguage('pt')
})

function rows(count: number, unlocked = false): AchievementRow[] {
  return Array.from({ length: count }, (_, index) => ({
    code: `a${index}`,
    name: `Achievement ${index + 1}`,
    description: `Desc ${index + 1}`,
    unlocked,
  }))
}

function mount(achievements: AchievementRow[]) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <AchievementGrid achievements={achievements} />
      </MemoryRouter>
    </I18nextProvider>,
  )
}

it('mostra chrome de conquistas em português e pagina a lista', async () => {
  const user = userEvent.setup()
  mount(rows(13))
  expect(screen.getByText('Marcos da conta')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Conquistas' })).toBeVisible()
  expect(screen.getByRole('link', { name: /Ver prêmios/ })).toHaveAttribute('href', '/painel/progress')
  expect(screen.getAllByText('Conquista bloqueada').length).toBeGreaterThan(0)
  expect(screen.getByText('1 / 2')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Próxima' }))
  expect(screen.getByText('2 / 2')).toBeVisible()
  expect(screen.getByText('Achievement 13')).toBeVisible()
})

it('traduz o chrome para inglês', async () => {
  await i18n.changeLanguage('en')
  mount(rows(1))
  expect(screen.getByText('Account milestones')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Achievements' })).toBeVisible()
  expect(screen.getByRole('link', { name: /View rewards/ })).toBeVisible()
  expect(screen.getByText('Achievement locked')).toBeVisible()
})
