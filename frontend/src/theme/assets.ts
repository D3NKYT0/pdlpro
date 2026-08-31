export const THEME = '/theme/default'

export function themeAsset(path: string) {
  return `${THEME}/${path.replace(/^\//, '')}`
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
  '/theme/pages/news-page.css',
  '/theme/pages/faq-page.css',
  '/theme/pages/news-detail.css',
  '/theme/pages/extras.css',
  '/theme/pages/info-page.css',
]

export const ROUTE_THEME_STYLES = [
  { test: (path: string) => path.startsWith('/wiki'), href: themeAsset('css/wiki.css') },
  { test: (path: string) => path.startsWith('/rankings'), href: themeAsset('css/tops.css') },
  { test: (path: string) => path.startsWith('/rankings'), href: themeAsset('css/tops-tables.css') },
]
