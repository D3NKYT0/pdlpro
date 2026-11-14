import { useTranslation } from 'react-i18next'
import type { ThemePresentation } from '../services/api'

/** Translates package copy when a locale supplies it, retaining manifest defaults. */
export function useLocalizedPresentation(presentation: ThemePresentation | null | undefined) {
  const { t } = useTranslation('public')
  if (!presentation?.home) return presentation

  const copy = (key: string, fallback: string) => t('themePresentation.' + key, { defaultValue: fallback })
  const { hero, features, ranking, cta, news, stats } = presentation.home
  return {
    ...presentation,
    navigation: presentation.navigation.map(item => ({
      ...item,
      label: copy('navigation.' + (item.to === '/' ? 'home' : encodeURIComponent(item.to.slice(1))), item.label),
    })),
    home: {
      ...presentation.home,
      hero: {
        ...hero,
        title: copy('hero.title', hero.title),
        description: copy('hero.description', hero.description),
        actionLabel: copy('hero.actionLabel', hero.actionLabel),
        secondaryLabel: hero.secondaryLabel ? copy('hero.secondaryLabel', hero.secondaryLabel) : undefined,
      },
      features: {
        ...features,
        title: copy('features.title', features.title),
        subtitle: copy('features.subtitle', features.subtitle),
        actionLabel: copy('features.actionLabel', features.actionLabel),
        items: features.items.map((item, index) => ({
          ...item,
          title: copy('features.items.' + index + '.title', item.title),
          description: copy('features.items.' + index + '.description', item.description),
        })),
      },
      ranking: { ...ranking, title: copy('ranking.title', ranking.title), subtitle: copy('ranking.subtitle', ranking.subtitle), actionLabel: copy('ranking.actionLabel', ranking.actionLabel) },
      cta: { ...cta, title: copy('cta.title', cta.title), description: copy('cta.description', cta.description), actionLabel: copy('cta.actionLabel', cta.actionLabel) },
      news: { ...news, title: copy('news.title', news.title) },
      stats: stats && { ...stats, items: stats.items.map(item => ({ ...item, label: copy('stats.' + item.id, item.label) })) },
    },
    footer: { ...presentation.footer, tagline: copy('footer.tagline', presentation.footer.tagline) },
  }
}
