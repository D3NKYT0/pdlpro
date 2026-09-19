// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import {
  applyDocumentMetadata,
  resolveHomeIdentity,
  resolveSiteMetadata,
} from './site-metadata'

const theme = {
  builtin: false,
  name: 'Cruma',
  description: 'Pacote visual',
  assets: { 'images/favicon.png': '/media/themes/cruma/images/favicon.png' },
  metadata: {
    site: { name: 'Cruma', description: 'A Torre desperta' },
    seo: { title: 'Cruma SEO', ogImage: 'images/favicon.png' },
    social: { discordUrl: 'https://discord.gg/cruma', trailerYoutubeId: 'abcdefghijk' },
    server: {},
  },
}

afterEach(() => {
  document.head.querySelectorAll('meta[data-test], meta[name="description"], meta[property="og:title"]').forEach((node) => {
    if ((node as HTMLMetaElement).getAttribute('name') === 'description' || (node as HTMLMetaElement).getAttribute('property') === 'og:title') {
      node.remove()
    }
  })
})

it('a home prefere admin customizado, depois tema, depois o copy padrão', () => {
  const adminName = resolveHomeIdentity(
    { name: 'Imperium', description: 'Reino', site_name_customized: true } as never,
    theme,
    '',
    '',
    'Fallback',
    'Desc fallback',
  )
  expect(adminName.name).toBe('Imperium')

  const themeName = resolveHomeIdentity(
    { name: 'PDL PRO', description: '', site_name_customized: false } as never,
    theme,
    '',
    '',
    'Fallback',
    'Desc fallback',
  )
  expect(themeName.name).toBe('Cruma')

  const builtin = resolveHomeIdentity(
    { name: 'PDL PRO', description: '', site_name_customized: false } as never,
    { builtin: true, name: 'PDL Classic', description: 'Classic', metadata: null },
    '',
    '',
    'Inicie sua Jornada',
    'Onde Lendas Nascem',
  )
  expect(builtin.name).toBe('Inicie sua Jornada')
})

it('resolve SEO, Discord e trailer com env < tema < admin', () => {
  const resolved = resolveSiteMetadata(
    {
      name: 'Imperium',
      seo_title: 'Imperium SEO',
      discord_url: 'https://discord.gg/imperium',
    } as never,
    theme,
    { discordUrl: 'https://discord.gg/env', trailerYoutubeId: 'envtrailer1' },
  )
  expect(resolved.seoTitle).toBe('Imperium SEO')
  expect(resolved.discordUrl).toBe('https://discord.gg/imperium')
  expect(resolved.ogImage).toBe('/media/themes/cruma/images/favicon.png')
  expect(resolved.trailerYoutubeId).toBe('abcdefghijk')
})

it('aplica title e Open Graph no documento', () => {
  applyDocumentMetadata({
    name: 'Cruma',
    slogan: '',
    description: 'A Torre',
    seoTitle: 'Cruma — Lineage 2',
    seoDescription: 'Pedra antiga',
    ogTitle: 'Cruma OG',
    ogDescription: 'OG desc',
    ogImage: '/media/themes/cruma/images/favicon.png',
    discordUrl: '',
    trailerYoutubeId: 'Mm19W1PKMFQ',
  })
  expect(document.title).toBe('Cruma — Lineage 2')
  expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Pedra antiga')
  expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Cruma OG')
})
