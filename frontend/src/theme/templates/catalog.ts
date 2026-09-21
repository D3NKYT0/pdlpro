import type { ThemeHomeSection } from '../../services/api'
import { THEME_CATALOG_IDS, type ThemeCatalogId } from './ids'

export type TemplateShellVariant = 'bar' | 'banner' | 'masthead' | 'court' | 'minimal'
export type TemplateMark = 'crest' | 'wordmark' | 'symbol'
export type TemplateFamily =
  | 'cinematic'
  | 'portal'
  | 'classic'
  | 'editorial'
  | 'war'
  | 'launcher'
  | 'fame'
  | 'codex'
  | 'split'
  | 'atlas'
  | 'class'
  | 'manuscript'
  | 'void'
  | 'tavern'
  | 'court'
  | 'bazaar'
  | 'arena'
  | 'theater'
  | 'path'
  | 'vigil'

export type PublicTemplate = {
  id: ThemeCatalogId
  name: string
  family: TemplateFamily
  composition: string
  shell: TemplateShellVariant
  mark: TemplateMark
  defaultSections: ThemeHomeSection[]
  /** Arquétipo real de site L2 que o layout reconstrói. */
  archetype: string
}

const CLASSIC: ThemeHomeSection[] = ['hero', 'stats', 'features', 'pillars', 'ranking', 'cta', 'news']
const GEM: ThemeHomeSection[] = ['hero', 'features', 'ranking', 'cta', 'news']

export const PUBLIC_TEMPLATES: Record<ThemeCatalogId, PublicTemplate> = {
  vesperlyn: {
    id: 'vesperlyn',
    name: 'Vesperlyn',
    family: 'cinematic',
    composition: 'cinematic-dock',
    shell: 'bar',
    mark: 'crest',
    defaultSections: CLASSIC,
    archetype: 'Landing 2024 (Aether/Saga): vídeo full-bleed, wordmark, dois CTAs, faixa de stats e doca.',
  },
  gemwright: {
    id: 'gemwright',
    name: 'Gemwright',
    family: 'portal',
    composition: 'gem-countdown',
    shell: 'bar',
    mark: 'wordmark',
    defaultSections: GEM,
    archetype: 'Portal de gemas (Valorem / PDL SITE): countdown, botões lapidados e cards de ícone.',
  },
  ironspine: {
    id: 'ironspine',
    name: 'Ironspine',
    family: 'classic',
    composition: 'three-column-spine',
    shell: 'banner',
    mark: 'wordmark',
    defaultSections: ['hero', 'news', 'ranking', 'stats', 'features', 'cta'],
    archetype: 'Site L2 de 2008 (PHP-Fusion / L2J): banner, menu esquerdo, poço de notícias e widgets.',
  },
  ashenledger: {
    id: 'ashenledger',
    name: 'Ashen Ledger',
    family: 'editorial',
    composition: 'gazette',
    shell: 'masthead',
    mark: 'wordmark',
    defaultSections: ['news', 'hero', 'ranking', 'features', 'cta'],
    archetype: 'Gazeta do reino: manchete, colunas e ranking como apêndice — não como hall.',
  },
  warhorn: {
    id: 'warhorn',
    name: 'Warhorn',
    family: 'war',
    composition: 'war-room',
    shell: 'bar',
    mark: 'crest',
    defaultSections: ['hero', 'stats', 'features', 'cta', 'ranking', 'news'],
    archetype: 'Comando de siege: relógio de guerra, alistamento e relatórios de campanha.',
  },
  ironpatch: {
    id: 'ironpatch',
    name: 'Ironpatch',
    family: 'launcher',
    composition: 'launcher',
    shell: 'bar',
    mark: 'wordmark',
    defaultSections: ['hero', 'news', 'features', 'cta', 'ranking'],
    archetype: 'Launcher/updater: download primeiro, changelog e o que vem no cliente.',
  },
  laurelwake: {
    id: 'laurelwake',
    name: 'Laurelwake',
    family: 'fame',
    composition: 'podium-hall',
    shell: 'bar',
    mark: 'crest',
    defaultSections: ['ranking', 'stats', 'news', 'features', 'cta', 'hero'],
    archetype: 'Hall da fama: pódio acima da dobra, notícia e features em segundo plano.',
  },
  meridian: {
    id: 'meridian',
    name: 'Meridian',
    family: 'codex',
    composition: 'codex',
    shell: 'bar',
    mark: 'symbol',
    defaultSections: ['stats', 'features', 'pillars', 'news', 'cta', 'ranking'],
    archetype: 'Códice / wiki-first: rates e crônica abertos, como Essence e Chronicles mostram o servidor.',
  },
  twinwake: {
    id: 'twinwake',
    name: 'Twinwake',
    family: 'split',
    composition: 'split-gate',
    shell: 'minimal',
    mark: 'wordmark',
    defaultSections: ['hero', 'features', 'news', 'cta'],
    archetype: 'Portão duplo (Chronicles): criar conta | baixar cliente, dois caminhos iguais.',
  },
  cartograph: {
    id: 'cartograph',
    name: 'Cartograph',
    family: 'atlas',
    composition: 'realm-atlas',
    shell: 'bar',
    mark: 'symbol',
    defaultSections: ['features', 'hero', 'stats', 'news', 'cta'],
    archetype: 'Mapa do reino: seções viram regiões clicáveis, sem hero de marketing.',
  },
  classing: {
    id: 'classing',
    name: 'Classing',
    family: 'class',
    composition: 'path-gallery',
    shell: 'bar',
    mark: 'crest',
    defaultSections: ['features', 'hero', 'pillars', 'cta', 'news'],
    archetype: 'Seleção de classe: cada feature é um caminho (guerreiro, místico, suporte).',
  },
  parchment: {
    id: 'parchment',
    name: 'Parchment',
    family: 'manuscript',
    composition: 'manuscript',
    shell: 'minimal',
    mark: 'symbol',
    defaultSections: ['hero', 'pillars', 'features', 'news', 'cta'],
    archetype: 'Manuscrito: coluna estreita, capítulos numerados, lore antes de CTA.',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    family: 'void',
    composition: 'void-stage',
    shell: 'minimal',
    mark: 'crest',
    defaultSections: ['hero', 'news', 'cta'],
    archetype: 'Luxo mínimo: emblema, dois atos, ticker de notícias. Sem grade de cards.',
  },
  hearthspire: {
    id: 'hearthspire',
    name: 'Hearthspire',
    family: 'tavern',
    composition: 'tavern-board',
    shell: 'bar',
    mark: 'symbol',
    defaultSections: ['news', 'cta', 'features', 'pillars', 'ranking'],
    archetype: 'Taverna: mural de recados primeiro, regras da casa e só então o ranking.',
  },
  goldleaf: {
    id: 'goldleaf',
    name: 'Goldleaf',
    family: 'court',
    composition: 'royal-court',
    shell: 'court',
    mark: 'crest',
    defaultSections: ['hero', 'news', 'ranking', 'pillars', 'cta'],
    archetype: 'Corte heráldica: brasão central, decretos (notícias) e ranking da corte.',
  },
  lampmarket: {
    id: 'lampmarket',
    name: 'Lampmarket',
    family: 'bazaar',
    composition: 'bazaar-stalls',
    shell: 'bar',
    mark: 'wordmark',
    defaultSections: ['features', 'cta', 'news', 'ranking'],
    archetype: 'Bazar (Giran): features viram bancas, CTA de loja no centro da praça.',
  },
  bracket: {
    id: 'bracket',
    name: 'Bracket',
    family: 'arena',
    composition: 'olympiad-bracket',
    shell: 'bar',
    mark: 'crest',
    defaultSections: ['ranking', 'features', 'hero', 'cta', 'news'],
    archetype: 'Grand Olympiad: chave/tabela primeiro, regras da arena depois.',
  },
  eventide: {
    id: 'eventide',
    name: 'Eventide',
    family: 'theater',
    composition: 'trailer-theater',
    shell: 'bar',
    mark: 'crest',
    defaultSections: ['hero', 'news', 'ranking', 'cta', 'features'],
    archetype: 'Cinema do trailer (Essence “journey comes alive”): palco de vídeo, depois fila.',
  },
  wayfarer: {
    id: 'wayfarer',
    name: 'Wayfarer',
    family: 'path',
    composition: 'three-steps',
    shell: 'bar',
    mark: 'wordmark',
    defaultSections: ['features', 'hero', 'news', 'cta'],
    archetype: 'Primeiro login em 3 passos (Essence / Chronicles): registrar, conta, baixar.',
  },
  watchfire: {
    id: 'watchfire',
    name: 'Watchfire',
    family: 'vigil',
    composition: 'live-vigil',
    shell: 'bar',
    mark: 'symbol',
    defaultSections: ['stats', 'hero', 'ranking', 'news', 'cta'],
    archetype: 'Vigília ao vivo: números do servidor são o hero (status bar da Essence virada página).',
  },
}

export const PUBLIC_TEMPLATE_LIST: PublicTemplate[] = THEME_CATALOG_IDS.map((id) => PUBLIC_TEMPLATES[id])
