import type { ApiServerInfo } from '../services/types'
import type { ApiTheme, ThemeSiteMetadata } from '../services/domain/theme.service'

export const DEFAULT_TRAILER_YOUTUBE_ID = 'Mm19W1PKMFQ'
export const DEFAULT_OG_IMAGE = '/favicon/apple-touch-icon.png'

export interface ResolvedSiteMetadata {
  name: string
  slogan: string
  description: string
  seoTitle: string
  seoDescription: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  discordUrl: string
  trailerYoutubeId: string
}

export function firstText(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const text = value?.trim()
    if (text) return text
  }
  return ''
}

export function resolveHomeIdentity(
  info: ApiServerInfo | undefined,
  theme: Pick<ApiTheme, 'builtin' | 'name' | 'description' | 'metadata'>,
  envName: string,
  envDescription: string,
  fallbackName: string,
  fallbackDescription: string,
) {
  const site = theme.metadata?.site
  const packagedName = !theme.builtin ? theme.name?.trim() : ''
  const packagedDescription = !theme.builtin ? theme.description?.trim() : ''
  return {
    name: firstText(
      envName,
      info?.site_name_customized ? info.name : '',
      site?.name,
      packagedName,
      fallbackName,
    ),
    description: firstText(
      envDescription,
      info?.site_description_customized ? info.description : '',
      site?.description,
      packagedDescription,
      fallbackDescription,
    ),
  }
}

export function resolveSiteMetadata(
  info: ApiServerInfo | undefined,
  theme: Pick<ApiTheme, 'assets' | 'metadata'>,
  env: { discordUrl?: string; trailerYoutubeId?: string } = {},
): ResolvedSiteMetadata {
  const metadata = theme.metadata ?? emptyThemeMetadata()
  const site = metadata.site
  const seo = metadata.seo
  const social = metadata.social
  const name = firstText(info?.name, site.name)
  const description = firstText(info?.description, site.description)
  const seoTitle = firstText(info?.seo_title, seo.title, site.title, name)
  const seoDescription = firstText(info?.seo_description, seo.description, description)
  const ogImage = firstText(
    info?.og_image,
    seo.ogImage ? theme.assets[seo.ogImage] : '',
    theme.assets['images/favicon.png'],
    DEFAULT_OG_IMAGE,
  )
  return {
    name,
    slogan: firstText(info?.slogan, site.slogan),
    description,
    seoTitle,
    seoDescription,
    ogTitle: firstText(info?.og_title, seo.ogTitle, seoTitle),
    ogDescription: firstText(info?.og_description, seo.ogDescription, seoDescription),
    ogImage,
    discordUrl: firstText(info?.discord_url, social.discordUrl, env.discordUrl),
    trailerYoutubeId: firstText(
      info?.trailer_youtube_id,
      social.trailerYoutubeId,
      env.trailerYoutubeId,
      DEFAULT_TRAILER_YOUTUBE_ID,
    ),
  }
}

export function emptyThemeMetadata(): ThemeSiteMetadata {
  return { site: {}, seo: {}, social: {}, server: {} }
}

export function applyDocumentMetadata(meta: ResolvedSiteMetadata) {
  if (typeof document === 'undefined') return
  if (meta.seoTitle) document.title = meta.seoTitle
  setMeta('name', 'title', meta.seoTitle)
  setMeta('name', 'description', meta.seoDescription)
  setMeta('name', 'apple-mobile-web-app-title', meta.name || meta.seoTitle)
  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:title', meta.ogTitle)
  setMeta('property', 'og:description', meta.ogDescription)
  setMeta('property', 'og:image', absoluteAssetUrl(meta.ogImage))
  setMeta('name', 'twitter:card', 'summary')
  setMeta('name', 'twitter:title', meta.ogTitle)
  setMeta('name', 'twitter:description', meta.ogDescription)
  setMeta('name', 'twitter:image', absoluteAssetUrl(meta.ogImage))
}

function absoluteAssetUrl(value: string) {
  if (!value || value.startsWith('https://') || value.startsWith('http://')) return value
  if (typeof window === 'undefined') return value
  try {
    return new URL(value, window.location.origin).toString()
  } catch {
    return value
  }
}

function setMeta(kind: 'name' | 'property', key: string, value: string) {
  if (!value) return
  const selector = kind === 'property' ? `meta[property="${key}"]` : `meta[name="${key}"]`
  let node = document.head.querySelector<HTMLMetaElement>(selector)
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute(kind, key)
    document.head.appendChild(node)
  }
  node.setAttribute('content', value)
}
