import type { ThemeLayout } from '../services/domain/theme.service'

export const THEME = '/theme/default'

let runtimeAssets: Record<string, string> = {}

const LAYOUT_STYLE_KEYS = [
  '--panel-sidebar-width',
  '--panel-shell-gap',
  '--panel-shell-pad-y',
  '--panel-shell-pad-x',
  '--panel-shell-pad-bottom',
  '--panel-sidebar-gap',
  '--panel-radius',
  '--public-header-height',
  '--public-container-width',
] as const

const SURFACE_STYLE_KEYS = [
  '--theme-button-primary',
  '--theme-button-secondary',
  '--theme-art-bg-2',
  '--theme-art-bg-3',
  '--theme-art-bg-4',
] as const

const DENSITY_PRESETS = {
  compact: {
    gap: '18px',
    padY: '14px',
    padX: '18px',
    padBottom: '28px',
    sidebarGap: '12px',
  },
  comfortable: {
    gap: '28px',
    padY: '22px',
    padX: '28px',
    padBottom: '42px',
    sidebarGap: '18px',
  },
  spacious: {
    gap: '36px',
    padY: '28px',
    padX: '36px',
    padBottom: '52px',
    sidebarGap: '24px',
  },
} as const

/** Atualiza somente aliases declarados pelo pacote. Assets ausentes continuam no default. */
export function configureRuntimeTheme(assets: Record<string, string> = {}) {
  runtimeAssets = { ...assets }
}

export function themeAsset(path: string) {
  const normalized = path.replace(/^\//, '')
  return runtimeAssets[normalized] || `${THEME}/${normalized}`
}

export function themeImage(path: string) {
  return themeAsset(`images/${path.replace(/^\//, '')}`)
}

function cssUrl(path: string) {
  return `url(${JSON.stringify(path)})`
}

function clearThemeStyleVars(target: CSSStyleDeclaration) {
  for (const key of [...LAYOUT_STYLE_KEYS, ...SURFACE_STYLE_KEYS]) {
    target.removeProperty(key)
  }
}

/**
 * Injeta texturas e knobs de layout como custom properties no `html`.
 * Pacotes sem `layout` ficam equivalentes ao default visual, com assets remapeados.
 */
export function applyThemeSurfaceVars(layout?: ThemeLayout | null) {
  const root = document.documentElement
  const style = root.style
  clearThemeStyleVars(style)

  const buttonPrimary = layout?.surfaces?.buttonPrimary ?? 'images/button/1.png'
  const buttonSecondary = layout?.surfaces?.buttonSecondary ?? 'images/button/2.png'
  style.setProperty('--theme-button-primary', cssUrl(themeAsset(buttonPrimary)))
  style.setProperty('--theme-button-secondary', cssUrl(themeAsset(buttonSecondary)))
  style.setProperty('--theme-art-bg-2', cssUrl(themeImage('bg/2.jpg')))
  style.setProperty('--theme-art-bg-3', cssUrl(themeImage('bg/3.jpg')))
  style.setProperty('--theme-art-bg-4', cssUrl(themeImage('bg/4.jpg')))

  const density = layout?.panel?.density ?? 'comfortable'
  root.dataset.panelDensity = density
  const preset = DENSITY_PRESETS[density]
  style.setProperty('--panel-shell-gap', preset.gap)
  style.setProperty('--panel-shell-pad-y', preset.padY)
  style.setProperty('--panel-shell-pad-x', preset.padX)
  style.setProperty('--panel-shell-pad-bottom', preset.padBottom)
  style.setProperty('--panel-sidebar-gap', preset.sidebarGap)

  if (layout?.panel?.sidebarWidth != null) {
    style.setProperty('--panel-sidebar-width', `${layout.panel.sidebarWidth}px`)
  }
  if (layout?.panel?.radius != null) {
    style.setProperty('--panel-radius', `${layout.panel.radius}px`)
  }
  if (layout?.public?.headerHeight != null) {
    style.setProperty('--public-header-height', `${layout.public.headerHeight}px`)
  }
  if (layout?.public?.containerWidth != null) {
    style.setProperty('--public-container-width', `${layout.public.containerWidth}px`)
  }
}

export const PUBLIC_THEME_STYLES = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@200;300;400;600;700;900&family=Orbitron:wght@600&display=swap',
  themeAsset('css/font/stylesheet.css'),
  themeAsset('css/font.css'),
  themeAsset('css/main.css'),
  themeAsset('css/media.css'),
  themeAsset('css/index.css'),
  '/theme/public/css/layout.css',
  '/theme/public/css/index-carousel.css',
  '/theme/public/css/news.css',
  '/theme/public/css/faq.css',
  '/theme/public/css/terms.css',
  '/theme/pages/home-extras.css',
  '/theme/pages/public-pages.css',
  '/theme/pages/news-page.css',
  '/theme/pages/faq-page.css',
  '/theme/pages/news-detail.css',
  '/theme/pages/extras.css',
  '/theme/pages/info-page.css',
  '/theme/pages/rankings-page.css',
  '/theme/pages/auth.css',
]

export const PANEL_THEME_STYLES = [
  'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@200;300;400;600;700;900&display=swap',
  themeAsset('css/font/stylesheet.css'),
  themeAsset('css/font.css'),
  '/theme/pages/panel.css',
]

export const ROUTE_THEME_STYLES: Array<{ test: (path: string) => boolean; href: string }> = []
