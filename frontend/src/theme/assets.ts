export const THEME = '/theme/default'

let runtimeAssets: Record<string, string> = {}

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
