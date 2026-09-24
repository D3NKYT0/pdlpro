import { firstText } from './site-metadata'

export const DEFAULT_SITE_BRAND = 'PDL PRO'
export const DEFAULT_SITE_TAGLINE = 'Lineage'

export interface SiteBrandSource {
  name?: string | null
  slogan?: string | null
  chronicle?: string | null
}

export function resolveSiteBrand(info?: SiteBrandSource | null) {
  const name = firstText(info?.name) || DEFAULT_SITE_BRAND
  const slogan = firstText(info?.slogan)
  const tagline =
    slogan && slogan.toLocaleLowerCase() !== name.toLocaleLowerCase()
      ? slogan
      : firstText(info?.chronicle, DEFAULT_SITE_TAGLINE) || DEFAULT_SITE_TAGLINE
  return { name, tagline }
}
