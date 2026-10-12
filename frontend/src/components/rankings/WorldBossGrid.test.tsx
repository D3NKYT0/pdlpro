// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../i18n'
import { RankingsPage } from '../../pages/RankingsPage'
import { WorldBossGrid } from './WorldBossGrid'
import { serverApi } from '../../services/api'
import { formatRespawn } from './rankingsFormat'
import { RankingsSection } from './RankingsSection'
import { localizeTab } from './useRankingTabs'
import { tabs } from './rankingsMeta'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('boss rankings', () => {
  it('shows loading, empty and failure states before rendering boss results', async () => {
    await i18n.changeLanguage('pt')
    const tab = localizeTab(tabs.find(tab => tab.id === 'raidboss')!, key => i18n.t(key, { ns: 'public' }))
    const props = { tab, Icon: tab.icon, isLoading: true, isError: false, rankingRows: [], worldRows: [] }
    const view = render(<RankingsSection {...props} />)
    expect(screen.getByText(i18n.t('rankings.loading', { ns: 'public' }))).toBeTruthy()
    view.rerender(<RankingsSection {...props} isLoading={false} />)
    expect(screen.getByText(i18n.t('rankings.emptyWorld', { ns: 'public' }))).toBeTruthy()
    view.rerender(<RankingsSection {...props} isLoading={false} isError />)
    expect(screen.getByText(i18n.t('rankings.error', { ns: 'public' }))).toBeTruthy()
  })
  it('renders configured names and distinguishes unknown respawn from alive', async () => {
    await i18n.changeLanguage('pt')
    render(<WorldBossGrid category="raid" rows={[
      { boss_id: 90001, name: 'Custom Dragon', respawn: 0 },
      { boss_id: 90002, name: 'Unknown Dragon', respawn: null },
    ]} />)
    expect(screen.getByText('Custom Dragon')).toBeTruthy()
    expect(screen.getByText(i18n.t('rankings.format.alive', { ns: 'public' }))).toBeTruthy()
    expect(screen.getByText('Respawn indisponível')).toBeTruthy()
    expect(formatRespawn(1999999999)).toEqual(formatRespawn(1999999999000))
    expect(formatRespawn(1999999999).live).toBe(false)
  })

  it('switches from epics to normal bosses through the public query', async () => {
    await i18n.changeLanguage('pt')
    vi.spyOn(serverApi, 'status').mockResolvedValue({ game_online: true } as Awaited<ReturnType<typeof serverApi.status>>)
    const world = vi.spyOn(serverApi, 'world').mockImplementation(async name =>
      [{ boss_id: 90001, name: name === 'raidboss_status' ? 'Custom Raid' : 'Custom Epic', respawn: 0 }])
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/rankings?tab=grandboss']}><RankingsPage /></MemoryRouter>
    </QueryClientProvider>)
    expect(await screen.findByText('Custom Epic')).toBeTruthy()
    await userEvent.click(screen.getByRole('link', { name: /Bosses normais/ }))
    expect(await screen.findByText('Custom Raid')).toBeTruthy()
    expect(world).toHaveBeenCalledWith('raidboss_status')
  })
})
