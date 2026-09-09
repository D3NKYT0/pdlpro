import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { RankingsHero } from '../components/rankings/RankingsHero'
import { RankingsNav } from '../components/rankings/RankingsNav'
import { RankingsSearch } from '../components/rankings/RankingsSearch'
import { RankingsSection } from '../components/rankings/RankingsSection'
import { asRankingRows } from '../components/rankings/rankingsFormat'
import { tabFromParam } from '../components/rankings/rankingsMeta'
import { serverApi } from '../services/api'

export function RankingsPage() {
  const [searchParams] = useSearchParams()
  const tab = tabFromParam(searchParams.get('tab'))
  const Icon = tab.icon
  const [search, setSearch] = useState('')

  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const rankings = useQuery({
    queryKey: ['rankings', tab.type === 'ranking' ? tab.kind : '', 50],
    queryFn: () => serverApi.rankings(tab.type === 'ranking' ? tab.kind : 'pvp', 50),
    enabled: tab.type === 'ranking',
  })
  const world = useQuery({
    queryKey: ['world', tab.type === 'world' ? tab.name : ''],
    queryFn: () => serverApi.world(tab.type === 'world' ? tab.name : 'olympiad_ranking'),
    enabled: tab.type === 'world',
  })
  const characters = useQuery({
    queryKey: ['world-search', search],
    queryFn: () => serverApi.world('search_characters', { query: search }),
    enabled: search.trim().length >= 2,
  })

  const worldRows = world.data ?? []
  const rankingRows =
    tab.type === 'ranking' ? (rankings.data ?? []) : tab.id === 'olympiad' ? asRankingRows(worldRows) : []
  const isLoading = tab.type === 'ranking' ? rankings.isLoading : world.isLoading
  const isError = tab.type === 'ranking' ? rankings.isError : world.isError
  const leader = rankingRows[0]
  const statusLabel = status.isLoading ? 'Verificando' : status.data?.game_online ? 'Online' : 'Offline'
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
        <RankingsSection
          tab={tab}
          Icon={Icon}
          isLoading={isLoading}
          isError={isError}
          rankingRows={rankingRows}
          worldRows={worldRows}
        />

        <RankingsSearch
          search={search}
          onSearchChange={setSearch}
          isLoading={characters.isLoading}
          results={characters.data ?? []}
        />
      </main>
    </div>
  )
}
