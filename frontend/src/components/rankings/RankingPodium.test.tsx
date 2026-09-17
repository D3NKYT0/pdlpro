// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Swords } from 'lucide-react'
import { afterEach, expect, it } from 'vitest'
import '../../i18n'
import { RankingPodium } from './RankingPodium'
import type { LocalizedTab } from './rankingsMeta'

afterEach(() => cleanup())

const tab: LocalizedTab = {
  id: 'pvp',
  type: 'ranking',
  kind: 'pvp',
  icon: Swords,
  label: 'PvP',
  kicker: '',
  blurb: '',
  valueLabel: 'kills',
}

it('mostra retrato quando o ranking traz classe e sexo', () => {
  render(
    <RankingPodium
      tab={tab}
      rows={[{ position: 1, name: 'Dawn', value: 90, extra: { class_id: 99, sex: 1 } }]}
    />,
  )
  expect(screen.getByRole('img', { name: 'Retrato de Dawn' })).toHaveAttribute('src', '/theme/avatars/elf-f.png')
})

it('mantém o brasão com inicial nos clãs sem classe', () => {
  render(
    <RankingPodium
      tab={{ ...tab, id: 'clans' }}
      rows={[{ position: 1, name: 'Aden', value: 12 }]}
    />,
  )
  expect(screen.queryByRole('img', { name: /Retrato/ })).not.toBeInTheDocument()
  expect(screen.getByText('A')).toBeVisible()
})
