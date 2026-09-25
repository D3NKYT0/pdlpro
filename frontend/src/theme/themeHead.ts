import type { ApiTheme } from '../services/api'

const ICON_SELECTOR = 'link[rel="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]'
const COLOR_META_KEYS = ['theme-color', 'msapplication-TileColor'] as const
const DEFAULT_MASK_COLOR = '#d4ad62'

/** Favicon do pacote: `images/favicon.png` ou `seo.ogImage` resolvido em assets. */
export function resolveThemeFaviconHref(theme: Pick<ApiTheme, 'assets' | 'metadata'>): string {
  const ogKey = theme.metadata?.seo?.ogImage?.trim()
  return (
    theme.assets['images/favicon.png']?.trim()
    || (ogKey ? theme.assets[ogKey]?.trim() : '')
    || ''
  )
}

function readAccentColor(): string {
  if (typeof document === 'undefined') return ''
  const computed = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim()
  if (computed) return normalizeCssColor(computed)
  const inline = document.documentElement.style.getPropertyValue('--theme-accent').trim()
  return normalizeCssColor(inline)
}

function normalizeCssColor(value: string): string {
  if (!value) return ''
  // Aceita hex curto; ignora funções CSS complexas no meta theme-color.
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value
  if (/^rgb(a)?\(/i.test(value)) return value
  return ''
}

function originalDataKey(attr: string) {
  return `pdlOriginal${attr[0].toUpperCase()}${attr.slice(1)}`
}

function rememberOriginal(node: HTMLElement, attr: string, value: string | null) {
  const key = originalDataKey(attr)
  if (node.dataset[key] === undefined) {
    node.dataset[key] = value ?? ''
  }
}

function restoreOriginal(node: HTMLElement, attr: string) {
  const key = originalDataKey(attr)
  const original = node.dataset[key]
  if (original === undefined) return
  if (original) node.setAttribute(attr, original)
  else node.removeAttribute(attr)
  delete node.dataset[key]
}

/** Atualiza todos os ícones do head (icon, apple-touch, mask) a partir do tema ativo. */
export function applyThemeHeadIcons(theme: Pick<ApiTheme, 'assets' | 'metadata'>) {
  if (typeof document === 'undefined') return
  const href = resolveThemeFaviconHref(theme)
  const accent = readAccentColor() || DEFAULT_MASK_COLOR
  const links = Array.from(document.head.querySelectorAll<HTMLLinkElement>(ICON_SELECTOR))

  if (!href) {
    for (const link of links) {
      if (link.dataset.pdlThemeCreated === 'true') {
        link.remove()
        continue
      }
      restoreOriginal(link, 'href')
      if (link.rel === 'mask-icon') restoreOriginal(link, 'color')
    }
    return
  }

  if (links.length === 0) {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.dataset.pdlThemeCreated = 'true'
    link.href = href
    document.head.appendChild(link)
    return
  }

  for (const link of links) {
    rememberOriginal(link, 'href', link.getAttribute('href'))
    link.href = href
    if (link.rel === 'mask-icon') {
      rememberOriginal(link, 'color', link.getAttribute('color'))
      link.setAttribute('color', accent)
    }
  }
}

/** Espelha o acento do tema em theme-color / TileColor; Classic restaura o shell. */
export function applyThemeChromeColors(theme: Pick<ApiTheme, 'builtin'> = { builtin: false }) {
  if (typeof document === 'undefined') return
  const accent = theme.builtin ? '' : readAccentColor()
  for (const key of COLOR_META_KEYS) {
    let node = document.head.querySelector<HTMLMetaElement>(`meta[name="${key}"]`)
    if (!accent) {
      if (node) restoreOriginal(node, 'content')
      continue
    }
    if (!node) {
      node = document.createElement('meta')
      node.setAttribute('name', key)
      document.head.appendChild(node)
    }
    rememberOriginal(node, 'content', node.getAttribute('content'))
    node.setAttribute('content', accent)
  }
}
