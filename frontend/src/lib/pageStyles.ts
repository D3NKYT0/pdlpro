import type { ApiTheme, ThemeInfoGuideCategory, ThemeMemoryScene } from '../services/api'

/** Estilos de página opcionais declarados pelo tema; sem declaração a página clássica continua. */

export type InfoGuideStyle = {
  categories: ThemeInfoGuideCategory[]
  heroImage: string | null
}

export type ComingSoonMemoriesStyle = {
  scenes: ThemeMemoryScene[]
  timeZone: string | null
  background: string | null
}

export function infoGuideStyle(theme: Pick<ApiTheme, 'pages'> | null | undefined): InfoGuideStyle | null {
  const info = theme?.pages?.info
  if (info?.style !== 'guide') return null
  const categories = (info.categories ?? []).filter((category) => category.id && category.items?.length)
  if (!categories.length) return null
  return { categories, heroImage: info.heroImage || null }
}

export function comingSoonMemoriesStyle(
  theme: Pick<ApiTheme, 'pages'> | null | undefined,
): ComingSoonMemoriesStyle | null {
  const comingSoon = theme?.pages?.comingSoon
  if (comingSoon?.style !== 'memories') return null
  const scenes = (comingSoon.scenes ?? []).filter((scene) => scene.id && scene.asset)
  if (!scenes.length) return null
  return { scenes, timeZone: comingSoon.timeZone || null, background: comingSoon.background || null }
}

/** Trilha da Coming Soon declarada pelo tema, independente do estilo da página. */
export function comingSoonMusic(theme: Pick<ApiTheme, 'pages'> | null | undefined): string | null {
  return theme?.pages?.comingSoon?.music || null
}

/** Âncoras fixas do estilo `guide`; independentes do idioma. */
export const INFO_GUIDE_ANCHORS = {
  root: 'geral',
  content: 'guide-content',
  rates: 'rates',
  menu: 'features',
  start: 'comecar',
} as const

export type InfoGuideHashTarget = {
  /** Categoria a selecionar; `null` mantém a seleção atual. */
  category: string | null
  /** Âncora (sem prefixo) para rolar; `null` não rola. */
  anchor: string | null
}

/**
 * Converte o hash da URL no estado do guia, preservando links antigos da /info
 * (`#geral`, `#rates`, `#features`, `#comecar`) e os aliases declarados pelo tema.
 */
export function resolveInfoGuideHash(rawHash: string, categories: ThemeInfoGuideCategory[]): InfoGuideHashTarget {
  let hash: string
  try {
    hash = decodeURIComponent(rawHash.replace(/^#/, '')).trim()
  } catch {
    return { category: null, anchor: null }
  }
  const first = categories[0]?.id ?? null
  if (!hash) return { category: null, anchor: null }
  const matched = categories.find((category) => category.id === hash || category.aliases?.includes(hash))
  if (matched) return { category: matched.id, anchor: INFO_GUIDE_ANCHORS.content }
  if (hash === INFO_GUIDE_ANCHORS.root) return { category: first, anchor: INFO_GUIDE_ANCHORS.content }
  if (hash === INFO_GUIDE_ANCHORS.menu) return { category: first, anchor: INFO_GUIDE_ANCHORS.menu }
  if (hash === INFO_GUIDE_ANCHORS.rates || hash === INFO_GUIDE_ANCHORS.start) return { category: null, anchor: hash }
  return { category: null, anchor: null }
}

export type GuideRate = { id: 'xpSp' | 'xp' | 'sp' | 'adena' | 'drop' | 'spoil'; value: string }

/** Faixa de rates: EXP e SP dividem o indicador quando o valor configurado é o mesmo. */
export function guideRates(rates: Record<string, string> | null | undefined): GuideRate[] {
  const value = (key: string) => String(rates?.[key] ?? '').trim()
  const items: GuideRate[] = []
  const xp = value('xp')
  const sp = value('sp')
  if (xp && xp === sp) {
    items.push({ id: 'xpSp', value: xp })
  } else {
    if (xp) items.push({ id: 'xp', value: xp })
    if (sp) items.push({ id: 'sp', value: sp })
  }
  for (const key of ['adena', 'drop', 'spoil'] as const) {
    const configured = value(key)
    if (configured) items.push({ id: key, value: configured })
  }
  return items
}
