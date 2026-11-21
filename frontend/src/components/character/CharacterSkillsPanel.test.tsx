// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import type { ApiGameSkill } from '../../services/api'
import { CharacterSkillsPanel } from './CharacterSkillsPanel'

const slash: ApiGameSkill = {
  skill_id: 1,
  name: 'Triple Slash',
  level: 3,
  class_index: 0,
  icon_url: '',
  operate: 'active',
  kind: 'attack',
  group: 'physical',
  skill_type: 'PDAM',
  enchant: 0,
  enchant_route: 0,
  enchant_max: 0,
  enchantable: false,
}

afterEach(cleanup)

it('mostra as skills de uma classe por vez e mantém o filtro de ativas ou passivas', async () => {
  const skills: ApiGameSkill[] = [
    { ...slash, level: 15, class_index: 2 },
    { ...slash, skill_id: 141, name: 'Weapon Mastery', operate: 'passive', class_index: 2, class_id: 102 },
    { ...slash, skill_id: 142, name: 'Magic Mastery', operate: 'passive', class_index: 5, class_id: 999 },
    { ...slash, class_id: 0 },
  ]
  const user = userEvent.setup()
  render(<CharacterSkillsPanel skills={skills} loading={false} error={false} />)

  const select = screen.getByRole('combobox', { name: 'Classe das skills' })
  expect(select).toHaveTextContent('Classe base · Human Fighter')
  expect(screen.getByLabelText('Triple Slash · Nv. 3')).toBeVisible()
  expect(screen.queryByLabelText('Triple Slash · Nv. 15')).not.toBeInTheDocument()

  await user.click(select)
  expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual([
    'Classe base · Human Fighter', 'Subclasse 2 · Moonlight Sentinel', 'Subclasse 5',
  ])
  await user.click(screen.getByRole('option', { name: 'Subclasse 2 · Moonlight Sentinel' }))
  expect(screen.getByLabelText('Triple Slash · Nv. 15')).toBeVisible()
  expect(screen.queryByLabelText('Triple Slash · Nv. 3')).not.toBeInTheDocument()

  await user.click(screen.getByRole('tab', { name: 'Passivas' }))
  expect(screen.getByLabelText('Weapon Mastery · Nv. 3')).toBeVisible()
  expect(screen.queryByLabelText('Magic Mastery · Nv. 3')).not.toBeInTheDocument()
  await user.click(select)
  await user.click(screen.getByRole('option', { name: 'Subclasse 5' }))
  expect(screen.getByRole('tab', { name: 'Passivas' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByLabelText('Magic Mastery · Nv. 3')).toBeVisible()
  expect(screen.queryByLabelText('Weapon Mastery · Nv. 3')).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Ativas' }))
  expect(screen.getByText('Nenhuma skill nesta aba.')).toBeVisible()
})

it('seleciona a primeira subclasse disponível quando a classe base está ausente', async () => {
  const first = { ...slash, class_index: 3 }
  const second = { ...slash, class_index: 7, level: 20 }
  const user = userEvent.setup()
  const { rerender } = render(<CharacterSkillsPanel skills={[second, first]} loading={false} error={false} />)

  const select = screen.getByRole('combobox', { name: 'Classe das skills' })
  expect(select).toHaveTextContent('Subclasse 3')
  expect(screen.getByLabelText('Triple Slash · Nv. 3')).toBeVisible()
  await user.click(select)
  await user.click(screen.getByRole('option', { name: 'Subclasse 7' }))
  expect(screen.getByLabelText('Triple Slash · Nv. 20')).toBeVisible()

  rerender(<CharacterSkillsPanel skills={[first]} loading={false} error={false} />)
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Triple Slash · Nv. 3')).toBeVisible()
})

it('mantém o seletor fora dos estados de carregamento, erro e lista vazia', () => {
  const skills = [slash, { ...slash, class_index: 1 }]
  const { rerender } = render(<CharacterSkillsPanel skills={skills} loading error={false} />)
  expect(screen.getByText('Carregando skills...')).toBeVisible()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

  rerender(<CharacterSkillsPanel skills={skills} loading={false} error />)
  expect(screen.getByText('Não foi possível carregar as skills deste personagem.')).toBeVisible()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

  rerender(<CharacterSkillsPanel skills={[]} loading={false} error={false} />)
  expect(screen.getByText('Nenhuma skill encontrada.')).toBeVisible()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
})

it('exibe skills de snapshots antigos que não têm índice de classe', () => {
  const legacySkill = { ...slash }
  Reflect.deleteProperty(legacySkill, 'class_index')

  render(<CharacterSkillsPanel skills={[legacySkill]} loading={false} error={false} />)

  expect(screen.getByLabelText('Triple Slash · Nv. 3')).toBeVisible()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
})
