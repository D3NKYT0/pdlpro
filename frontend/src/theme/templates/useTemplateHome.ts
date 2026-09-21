import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { contentApi, serverApi, type ThemeHomeSection, type ThemePresentation } from '../../services/api'
import { contentLang } from '../../i18n/locale'
import { PUBLIC_TEMPLATES } from './catalog'
import type { ThemeCatalogId } from '../../services/api'

export type CountdownValue = { days: string; hours: string; mins: string; secs: string }

export function countdownValue(target: string): CountdownValue {
  const remaining = Math.max(0, Date.parse(target) - Date.now())
  const total = Math.floor(remaining / 1000)
  const pad = (value: number) => String(Math.max(0, value)).padStart(2, '0')
  return {
    days: pad(Math.floor(total / 86400)),
    hours: pad(Math.floor((total % 86400) / 3600)),
    mins: pad(Math.floor((total % 3600) / 60)),
    secs: pad(total % 60),
  }
}

export function useCountdown(target: string) {
  const [value, setValue] = useState(() => countdownValue(target))
  useEffect(() => {
    setValue(countdownValue(target))
    const timer = window.setInterval(() => setValue(countdownValue(target)), 1000)
    return () => window.clearInterval(timer)
  }, [target])
  return value
}

export function visibleTemplateSections(presentation: ThemePresentation, templateId: ThemeCatalogId) {
  const declared = presentation.home.sections ?? PUBLIC_TEMPLATES[templateId].defaultSections
  return declared.filter((name) => {
    if (name === 'stats') return Boolean(presentation.home.stats?.items.length)
    if (name === 'pillars') return Boolean(presentation.home.pillars?.items.length)
    return true
  })
}

export function useTemplateHome(presentation: ThemePresentation, templateId: ThemeCatalogId) {
  const { t, i18n } = useTranslation('public')
  const language = contentLang(i18n.language)
  const template = PUBLIC_TEMPLATES[templateId]
  const { hero, features, ranking, cta, news: newsContent, stats, pillars } = presentation.home
  const sections = visibleTemplateSections(presentation, templateId)
  const countdown = useCountdown(hero.countdownAt)
  const [activeTab, setActiveTab] = useState(ranking.tabs[0]?.id ?? '')
  const selectedTab = useMemo(
    () => ranking.tabs.find((item) => item.id === activeTab) ?? ranking.tabs[0],
    [activeTab, ranking.tabs],
  )
  const needsStats = sections.includes('stats')
  const needsRanking = sections.includes('ranking')
  const needsNews = sections.includes('news')

  const status = useQuery({
    queryKey: ['server-status'],
    queryFn: serverApi.status,
    enabled: needsStats,
  })
  const info = useQuery({
    queryKey: ['server-info'],
    queryFn: serverApi.info,
    enabled: needsStats,
  })
  const rankings = useQuery({
    queryKey: ['theme-home-ranking', selectedTab?.kind],
    queryFn: () => serverApi.rankings(selectedTab?.kind ?? 'pvp', 5),
    enabled: Boolean(selectedTab) && needsRanking,
  })
  const news = useQuery({
    queryKey: ['news', language],
    queryFn: () => contentApi.news(language),
    enabled: needsNews,
  })

  return {
    t,
    template,
    sections,
    hero,
    features,
    ranking,
    cta,
    newsContent,
    stats,
    pillars,
    countdown,
    selectedTab,
    setActiveTab,
    status,
    info,
    rankings,
    news,
    has: (name: ThemeHomeSection) => sections.includes(name),
  }
}
