import { MicroResource } from '../components/programs/MicroResource'
import { useResourceControls } from '../contexts/ResourceControlsContext'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { RankingsHero } from '../components/rankings/RankingsHero'
import { RankingsNav } from '../components/rankings/RankingsNav'
import { RankingsSearch } from '../components/rankings/RankingsSearch'
import { RankingsSection } from '../components/rankings/RankingsSection'
import { asRankingRows } from '../components/rankings/rankingsFormat'
import { tabs, tabFromParam } from '../components/rankings/rankingsMeta'
import { useRankingTab } from '../components/rankings/useRankingTabs'
import { serverApi } from '../services/api'

export function RankingsPage() {
  const resourceOn = useResourceControls()
  const { t } = useTranslation('public')
  const [searchParams] = useSearchParams()
  const requested = tabFromParam(searchParams.get('tab'))
  const selected = resourceOn(`rankings-${requested.id}`) ? requested : tabs.find(row => resourceOn(`rankings-${row.id}`)) ?? requested
  const tab = useRankingTab(selected)
  const Icon = tab.icon
  const [search, setSearch] = useState('')

  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const rankings = useQuery({
    queryKey: ['rankings', tab.type === 'ranking' ? tab.kind : '', 50],
    queryFn: () => serverApi.rankings(tab.type === 'ranking' ? tab.kind : 'pvp', 50),
    enabled: resourceOn(`rankings-${tab.id}`) && tab.type === 'ranking',
  })
  const world = useQuery({
    queryKey: ['world', tab.type === 'world' ? tab.name : ''],
    queryFn: () => serverApi.world(tab.type === 'world' ? tab.name : 'olympiad_ranking'),
    enabled: resourceOn(`rankings-${tab.id}`) && tab.type === 'world',
  })
  const characters = useQuery({
    queryKey: ['world-search', search],
    queryFn: () => serverApi.world('search_characters', { query: search }),
    enabled: resourceOn('rankings-search') && search.trim().length >= 2,
  })

  const worldRows = world.data ?? []
  const rankingRows =
    tab.type === 'ranking' ? (rankings.data ?? []) : tab.id === 'olympiad' ? asRankingRows(worldRows) : []
  const isLoading = tab.type === 'ranking' ? rankings.isLoading : world.isLoading
  const isError = tab.type === 'ranking' ? rankings.isError : world.isError
  const leader = rankingRows[0]
  const statusLabel = status.isLoading
    ? t('rankings.status.checking')
    : status.data?.game_online
      ? t('rankings.status.online')
      : t('rankings.status.offline')
  const statusClass = status.isLoading ? 'is-checking' : status.data?.game_online ? 'is-online' : 'is-offline'

  return (
    <div className="rankings-page">
      <RankingsHero
        tab={tab}
        Icon={Icon}
        statusLabel={statusLabel}
        statusClass={statusClass}
        leader={leader}
        rankingCount={rankingRows.length}
        worldCount={worldRows.length}
        playersOnline={status.data?.players_online}
        isLoading={isLoading}
      />

      <RankingsNav activeTab={tab} />

      <main className="container rankings-content">
        <MicroResource code={`rankings-${tab.id}`}><RankingsSection
          tab={tab}
          Icon={Icon}
          isLoading={isLoading}
          isError={isError}
          rankingRows={rankingRows}
          worldRows={worldRows}
        /></MicroResource>

        <MicroResource code="rankings-search"><RankingsSearch
          search={search}
          onSearchChange={setSearch}
          isLoading={characters.isLoading}
          results={characters.data ?? []}
        /></MicroResource>
      </main>
    </div>
  )
}
