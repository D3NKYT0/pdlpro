import { useTranslation } from 'react-i18next'
import { tabHasValueLabel, tabs, type LocalizedTab, type Tab } from './rankingsMeta'

export function localizeTab(tab: Tab, t: (key: string) => string): LocalizedTab {
  return {
    ...tab,
    label: t(`rankings.tabs.${tab.id}.label`),
    kicker: t(`rankings.tabs.${tab.id}.kicker`),
    blurb: t(`rankings.tabs.${tab.id}.blurb`),
    valueLabel: tabHasValueLabel(tab) ? t(`rankings.tabs.${tab.id}.valueLabel`) : undefined,
  }
}

export function useRankingTab(tab: Tab): LocalizedTab {
  const { t } = useTranslation('public')
  return localizeTab(tab, t)
}

export function useRankingTabs(): LocalizedTab[] {
  const { t } = useTranslation('public')
  return tabs.map((tab) => localizeTab(tab, t))
}
