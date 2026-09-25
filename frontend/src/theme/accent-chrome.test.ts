/// <reference types="node" />
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

const themeRoot = resolve(__dirname, '../../public/theme')
const sagaPkg = resolve(__dirname, '../../theme-packages/saga/pkg')
const sagaTheme = resolve(sagaPkg, 'theme.css')
const sagaMediaRoot = resolve(__dirname, '../../../backend/media/themes/saga')
const sagaInstalledCss = existsSync(sagaMediaRoot)
  ? readdirSync(sagaMediaRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(sagaMediaRoot, entry.name, 'theme.css'))
      .find((path) => existsSync(path)) ?? ''
  : ''
const comingSoon = readFileSync(resolve(themeRoot, 'pages/coming-soon.css'), 'utf8')
const club = readFileSync(resolve(themeRoot, 'pages/club.css'), 'utf8')
const templates = readFileSync(resolve(themeRoot, 'pages/templates.css'), 'utf8')
const panel = readFileSync(resolve(themeRoot, 'pages/panel.css'), 'utf8')
const auth = readFileSync(resolve(themeRoot, 'pages/auth.css'), 'utf8')
const layout = readFileSync(resolve(themeRoot, 'public/css/layout.css'), 'utf8')
const info = readFileSync(resolve(themeRoot, 'pages/info-page.css'), 'utf8')
const rankings = readFileSync(resolve(themeRoot, 'pages/rankings-page.css'), 'utf8')
const extras = readFileSync(resolve(themeRoot, 'pages/extras.css'), 'utf8')
const publicPages = readFileSync(resolve(themeRoot, 'pages/public-pages.css'), 'utf8')
const termsCss = readFileSync(resolve(themeRoot, 'public/css/terms.css'), 'utf8')
const homeExtras = readFileSync(resolve(themeRoot, 'pages/home-extras.css'), 'utf8')
const carousel = readFileSync(resolve(themeRoot, 'public/css/index-carousel.css'), 'utf8')
const emblem = readFileSync(resolve(themeRoot, 'default/css/main.css'), 'utf8')
const wikiCss = readFileSync(resolve(themeRoot, 'default/css/wiki.css'), 'utf8')
const globalCss = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8')
const loaderCss = readFileSync(resolve(__dirname, '../../public/bootstrap-loader.css'), 'utf8')
const uiCss = readFileSync(resolve(__dirname, '../components/ui/ui.css'), 'utf8')
const helpCss = readFileSync(resolve(__dirname, '../components/help/help.css'), 'utf8')
const speechCss = readFileSync(resolve(__dirname, '../components/help/speech-bubble.css'), 'utf8')
const petProgressCss = readFileSync(resolve(__dirname, '../components/help/pet-progress.css'), 'utf8')
const contextualHelpCss = readFileSync(resolve(__dirname, '../components/help/contextual-help.css'), 'utf8')
const programsCss = readFileSync(resolve(__dirname, '../components/programs/programs.css'), 'utf8')
const observationCss = readFileSync(resolve(__dirname, '../pages/admin/item-observation.css'), 'utf8')

it('o casco de autenticação do catálogo tem layout e o Vesperlyn empilha no club', () => {
  expect(auth).toMatch(/\.portal-auth-shell\s*\{[\s\S]*?min-height:\s*100svh/)
  expect(auth).toMatch(/\.portal-auth-backdrop\s*\{[\s\S]*?var\(--tpl-art-hero/)
  expect(auth).toMatch(/\.portal-auth-frame\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/)
  expect(auth).toMatch(/\.portal-auth-card \.auth-field input:not\(\[type='checkbox'\]\)\s*\{[\s\S]*?min-height:\s*48px/)
  expect(auth).toMatch(/\.auth-panel > \.muted,\s*\.portal-auth-card > \.muted\s*\{[\s\S]*?text-align:\s*center/)
  expect(club).toMatch(/\.club-auth \.portal-auth-frame\s*\{[\s\S]*?grid-template-columns:\s*1fr/)
  expect(club).toMatch(/\.club-auth \.portal-auth-brand\s*\{[\s\S]*?align-items:\s*center/)
  expect(club).toMatch(/\.club-logo--footer\s*\{[\s\S]*?border-radius:\s*50%/)
  expect(club).toMatch(/\.club-auth \.portal-auth-card \.h-link :is\(button, a\)\s*\{[\s\S]*?background-image:\s*none/)
})

it('o véu público não come clique das seções da landing', () => {
  expect(layout).toMatch(/body::before\s*\{[\s\S]*?pointer-events:\s*none/)
  expect(club).toMatch(/\.club-shell\s*\{[\s\S]*?z-index:\s*1/)
  expect(templates).toMatch(/\.tpl-shell\s*\{[\s\S]*?z-index:\s*1/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.portal-shell\s*\{[\s\S]*?z-index:\s*1/)
})

it('o Gemwright no Classic pinta o casco de portal com tokens e a arte do layout', () => {
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.portal-shell nav\s*\{[\s\S]*?position:\s*static/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.hero\s*\{[\s\S]*?max-width:\s*none/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.hero\s*\{[\s\S]*?min-height:\s*100vh/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.site-header__inner\s*\{[\s\S]*?grid-template-areas:/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.nav-main,\s*html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.header-actions\s*\{[\s\S]*?flex-wrap:\s*nowrap/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.hero__bg\s*\{[\s\S]*?var\(--tpl-art-hero/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.hero__content \.pdl-emblem-stage\s*\{[\s\S]*?width:\s*168px/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.hero__content \.pdl-emblem-symbol\s*\{[\s\S]*?width:\s*124px/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.hero__actions\s*\{/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.cta-banner\s*\{[\s\S]*?var\(--tpl-art-cta/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.portal-footer-mark\s*\{/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.countdown__grid\s*\{/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.feature-card--scene\s*\{/)
  expect(templates).toMatch(/html\[data-pdl-theme="default"\]\[data-pdl-template="gemwright"\] \.feature-card__art\s*\{/)
})

it('o catálogo clássico pinta cada composição com tokens, sem ouro cravado', () => {
  expect(templates).toContain('var(--theme-accent')
  expect(templates).toContain('var(--theme-bg-deep')
  expect(templates).not.toMatch(/#d4ad62/i)
  expect(templates).not.toMatch(/#c5a161/i)
  for (const id of [
    'ironspine', 'ashenledger', 'warhorn', 'ironpatch', 'laurelwake', 'meridian',
    'twinwake', 'cartograph', 'classing', 'parchment', 'obsidian', 'hearthspire',
    'goldleaf', 'lampmarket', 'bracket', 'eventide', 'wayfarer', 'watchfire',
  ]) {
    expect(templates).toContain(`[data-theme-template="${id}"]`)
  }
  expect(templates).toMatch(/\.tpl-spine__grid\s*\{[\s\S]*?grid-template-columns:\s*200px/)
  expect(templates).toMatch(/\[data-theme-template="ironspine"\] \.tpl-spine__nav\s*\{[\s\S]*?justify-content:\s*flex-start/)
  expect(templates).toMatch(/\[data-theme-template="ironspine"\] \.tpl-spine__banner\s*\{[\s\S]*?min-height:\s*280px/)
  expect(templates).toMatch(/\[data-theme-template="ironspine"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-theme-template="ironspine"\] \.tpl-header \.site-nav-actions \.download\s*\{[\s\S]*?width:\s*auto/)
  expect(templates).toMatch(/\[data-theme-template="ironspine"\] \.tpl-header \.site-nav-actions \.user\s*\{[\s\S]*?clip-path:\s*none/)
  expect(templates).toMatch(/\[data-theme-template="ironspine"\] \.tpl-header \.site-nav-language \.ui-select-trigger,\s*\[data-theme-template="ironspine"\] \.tpl-header \.site-nav-actions \.user,\s*\[data-theme-template="ironspine"\] \.tpl-header \.site-nav-actions \.download\s*\{[\s\S]*?height:\s*40px/)
  expect(templates).toMatch(/\[data-theme-template="ashenledger"\] \.tpl-ledger__mast\s*\{[\s\S]*?min-height:\s*280px/)
  expect(templates).toMatch(/\[data-theme-template="ashenledger"\] \.tpl-ledger__columns\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.4fr\)/)
  expect(templates).toMatch(/\[data-theme-template="ashenledger"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-pdl-template\] \.tpl-header \.site-nav-actions \.download\s*\{[\s\S]*?width:\s*auto/)
  expect(templates).toMatch(/\[data-theme-template="warhorn"\] \.tpl-war\s*\{[\s\S]*?min-height:\s*320px/)
  expect(templates).toMatch(/\[data-theme-template="warhorn"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-theme-template="ironpatch"\] \.tpl-launcher__hero\s*\{[\s\S]*?min-height:\s*280px/)
  expect(templates).toMatch(/\[data-theme-template="ironpatch"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-theme-template="laurelwake"\] \.tpl-hall\s*\{[\s\S]*?min-height:\s*420px/)
  expect(templates).toMatch(/\[data-theme-template="laurelwake"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-theme-template="meridian"\] \.tpl-codex__open\s*\{[\s\S]*?min-height:\s*360px/)
  expect(templates).toMatch(/\[data-theme-template="meridian"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-theme-template="twinwake"\] \.tpl-split \.ui-button\s*\{[\s\S]*?background-image:\s*none/)
  expect(templates).toMatch(/\[data-theme-template="twinwake"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-theme-template="cartograph"\] \.tpl-atlas__legend\s*\{[\s\S]*?min-height:\s*280px/)
  expect(templates).toMatch(/\[data-theme-template="cartograph"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\.tpl-split\s*\{[\s\S]*?grid-template-columns:\s*1fr 1fr/)
  expect(templates).toMatch(/\[data-theme-template="classing"\] \.tpl-features--paths \.tpl-feature\s*\{[\s\S]*?min-height:\s*68vh/)
  expect(templates).toMatch(/\[data-theme-template="classing"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-theme-template="hearthspire"\] \.tpl-tavern__board\s*\{[\s\S]*?min-height:\s*280px/)
  expect(templates).toMatch(/\[data-theme-template="hearthspire"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-theme-template="obsidian"\] \.tpl-void__stage\s*\{[\s\S]*?min-height:\s*100vh/)
  expect(templates).toMatch(/\[data-theme-template="obsidian"\] \.tpl-footer__nav\s*\{[\s\S]*?justify-content:\s*center/)
  expect(templates).toMatch(/\[data-theme-template="parchment"\] \.tpl-manuscript > header\s*\{[\s\S]*?background:\s*none/)
  expect(templates).toMatch(/\.tpl-manuscript\s*\{[\s\S]*?width:\s*min\(100% - 32px, 680px\)/)
})

it('o layout club-v1 pinta com tokens do tema, sem ouro clássico cravado', () => {
  expect(club).toContain('var(--theme-accent')
  expect(club).toContain('var(--theme-bg-deep')
  expect(club).toContain('[data-pdl-renderer="club-v1"]')
  expect(club).not.toMatch(/#d4ad62/i)
  expect(club).not.toMatch(/#c5a161/i)
  expect(club).toMatch(
    /\[data-pdl-renderer="club-v1"\][\s\S]*?\.club-shell nav\s*\{[\s\S]*?position:\s*static/,
  )
  expect(club).toMatch(
    /\[data-pdl-renderer="club-v1"\][\s\S]*?\.club-header__inner\s*\{[\s\S]*?grid-template-columns:\s*1fr auto/,
  )
  expect(club).toMatch(
    /\[data-pdl-renderer="club-v1"\][\s\S]*?\.club-header \.site-nav-actions \.user[\s\S]*?display:\s*flex/,
  )
  expect(club).not.toContain('.club-header__lang')
  expect(club).not.toContain('.club-header__login')
  expect(club).toContain('.club-pillar')
  expect(club).toContain('.club-dock__more')
  expect(club).toContain('.club-hero__character')
  expect(club).toContain('--club-ember')
  expect(club).toMatch(/\.club-hero__character\s*\{[\s\S]*?display:\s*none/)
  expect(homeExtras).toMatch(
    /html\[data-pdl-theme="saga"\] \.home-features \.character[\s\S]*?display:\s*none/,
  )
  expect(club).toMatch(/\.club-hero__title\s*\{[\s\S]*?max-width:\s*18ch/)
  expect(club).toMatch(/\.club-kicker\s*\{[\s\S]*?color:\s*var\(--club-ember\)/)
  expect(club).toMatch(/\.club-nav a::after\s*\{[\s\S]*?background:\s*var\(--club-ember\)/)
  expect(club).toMatch(/\.club-pillar__index\s*\{[\s\S]*?color:\s*var\(--club-ember\)/)
  expect(club).toMatch(/\.club-stat strong\s*\{[\s\S]*?var\(--theme-accent-bright/)
  expect(club).toMatch(/\.club-dock \.club-dock__more\.ui-button\s*\{[\s\S]*?color:\s*var\(--club-ember\)/)
})

it.skipIf(!existsSync(sagaTheme))(
  'no Saga club-v1 o hero segue o Classic no castelo, sem personagem',
  () => {
  const css = readFileSync(sagaTheme, 'utf8')
  const character = css.match(
    /html\[data-pdl-theme="saga"\]\[data-pdl-renderer="club-v1"\] \.club-hero__character\s*\{[\s\S]*?\}/,
  )?.[0] ?? ''
  expect(character).toMatch(/display:\s*none/)
  expect(css).toMatch(/\.h\.club-hero\s*\{[\s\S]*?url\("images\/hero-bg\.jpg"\)/)
  expect(css).not.toMatch(/images\/bg\/1\.png/)
  expect(css).toMatch(/\.nav-main a::after\s*\{[\s\S]*?var\(--theme-accent\)/)
  expect(css).toMatch(/--launch-ember:\s*var\(--theme-accent\)/)
  expect(css).toMatch(/--theme-ember:\s*var\(--theme-accent\)/)
  expect(css).toMatch(
    /\.portal-auth-card \.h-link :is\(button, a\)\s*\{[\s\S]*?var\(--theme-button-primary/,
  )
  expect(css).toMatch(
    /\.portal-auth-card :is\(input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\), select\)/,
  )
  expect(css).toMatch(
    /\.portal-auth-card \.auth-check\s*\{[\s\S]*?grid-template-columns:\s*16px 1fr/,
  )
  const panelButtons = css.match(
    /html\[data-pdl-theme="saga"\]\.pdl-panel \.btn,\s*html\[data-pdl-theme="saga"\]\.pdl-panel \.btn\.ui-button\s*\{[\s\S]*?\}/,
  )?.[0] ?? ''
  expect(panelButtons).toContain('var(--theme-button-primary')
  expect(panelButtons).not.toMatch(/padding:\s*0 28px/)
  expect(panelButtons).not.toMatch(/min-height:\s*52px/)
  expect(css).toMatch(
    /html\[data-pdl-theme="saga"\] \.portal-panel-shell \.shell\s*\{[\s\S]*?width:\s*100%/,
  )
  expect(css).not.toContain('1480px')
  const sagaManifest = JSON.parse(
    readFileSync(resolve(sagaPkg, 'theme.json'), 'utf8'),
  ) as { assets: Record<string, string> }
  expect(sagaManifest.assets['images/logo.png']).toBe('images/logo.png')
  expect(sagaManifest.assets['images/logo.png']).not.toBe('images/logo-text.png')
  const sagaImages = resolve(sagaPkg, 'images')
  const hashes = ['logo-circle.png', 'logo-text.png', 'logo.png', 'logo-icon.png'].map((file) => {
    const path = resolve(sagaImages, file)
    expect(existsSync(path)).toBe(true)
    return createHash('md5').update(readFileSync(path)).digest('hex')
  })
  expect(new Set(hashes).size).toBe(4)
  const buttons = ['button/1.png', 'button/2.png', 'button/3.png'].map((file) => {
    const path = resolve(sagaImages, file)
    expect(existsSync(path)).toBe(true)
    const bytes = readFileSync(path)
    expect(bytes.subarray(12, 16).toString()).toBe('IHDR')
    expect(bytes[25]).toBe(6)
    return createHash('md5').update(bytes).digest('hex')
  })
  expect(new Set(buttons).size).toBe(3)
  },
)

it.skipIf(!sagaInstalledCss)(
  'o Saga Club no painel e no admin usa só degradê, sem foto de fundo',
  () => {
    const css = readFileSync(sagaInstalledCss, 'utf8')
    expect(css).toMatch(
      /html\[data-pdl-theme="saga"\]\.pdl-panel\s*\{[\s\S]*?--theme-panel-body-bg:/,
    )
    expect(css).toMatch(
      /html\[data-pdl-theme="saga"\]\.pdl-panel body[\s\S]*?--theme-art-bg-1:\s*none/,
    )
    expect(css).toMatch(
      /html\[data-pdl-theme="saga"\]\.pdl-panel body[\s\S]*?--theme-art-shop-hall:\s*none/,
    )
    expect(css).toMatch(
      /html\[data-pdl-theme="saga"\]\.pdl-panel body[\s\S]*?--theme-art-wallet-promo:\s*none/,
    )
    const panelShell = css.match(
      /html\[data-pdl-theme="saga"\] \.portal-panel-shell\s*\{[^}]*min-height:\s*100vh[^}]*\}/,
    )?.[0] ?? ''
    expect(panelShell).toContain('linear-gradient(115deg')
    expect(panelShell).not.toContain('url("images/')
    expect(css).toMatch(/\[data-theme-surface="auth"\][\s\S]*?url\("images\/hero-bg\.jpg"\)/)
    const manifest = JSON.parse(
      readFileSync(resolve(sagaInstalledCss, '..', 'theme.json'), 'utf8'),
    ) as { assets: Record<string, string> }
    expect(manifest.assets['images/shop/hall.png']).toBeUndefined()
    expect(manifest.assets['images/bg/wallet-promo-banner.png']).toBeUndefined()
    expect(manifest.assets['images/cta-banner.jpg']).toBe('images/cta-banner.jpg')
    expect(manifest.assets['images/hero-bg.jpg']).toBe('images/hero-bg.jpg')
  },
)

it('o quadro da coming soon usa o acento do tema, não o ouro clássico', () => {
  expect(comingSoon).toContain('--launch-ember: var(--theme-accent')
  expect(comingSoon).toContain('--launch-panel: color-mix(in srgb, var(--theme-surface')
  expect(comingSoon).toMatch(
    /\.launch-gate__panel\s*\{[\s\S]*?border:\s*1px solid color-mix\(in srgb, var\(--launch-ember\)/,
  )
  expect(comingSoon).toMatch(/\.launch-gate__panel\s*\{[\s\S]*?var\(--launch-panel\)/)
  expect(comingSoon).not.toMatch(/rgba\(\s*212\s*,\s*162\s*,\s*74/)
  expect(comingSoon).not.toMatch(/rgba\(\s*18\s*,\s*13\s*,\s*8/)
  expect(comingSoon).not.toMatch(/rgba\(\s*8\s*,\s*6\s*,\s*4/)
  expect(comingSoon).not.toMatch(/rgba\(\s*42\s*,\s*28\s*,\s*14/)
  expect(comingSoon).not.toMatch(/rgba\(\s*120\s*,\s*68\s*,\s*22/)
  expect(comingSoon).not.toMatch(/rgba\(\s*246\s*,\s*236\s*,\s*212/)
  expect(comingSoon).not.toMatch(/#f0d48a/i)
  expect(comingSoon).not.toMatch(/#c5a161/i)
  expect(comingSoon).toMatch(
    /\.launch-gate__champion\.is-left-front\s*\{[\s\S]*?height:\s*min\(80vh/,
  )
  expect(comingSoon).toMatch(
    /\.launch-gate__roster\.is-assault \.launch-gate__champion\.is-left-front\s*\{[\s\S]*?height:\s*min\(86vh/,
  )
  expect(comingSoon).not.toMatch(/height:\s*min\(62vh/)
  expect(comingSoon).not.toMatch(/height:\s*min\(68vh/)
  expect(comingSoon).toMatch(/\.launch-gate__mist\s*\{/)
  expect(comingSoon).toMatch(/\.launch-gate__mist-bank[\s\S]*?var\(--launch-deep\)/)
  expect(comingSoon).toMatch(/\.launch-gate__mist-bank[\s\S]*?var\(--launch-ember\)/)
  expect(comingSoon).not.toMatch(/text-shadow:\s*0 0 \d+px orange/)
  expect(comingSoon).toMatch(
    /\.launch-gate \.btn\.ui-button:hover\s*\{[\s\S]*?var\(--launch-ember-bright\)/,
  )
  expect(comingSoon).toMatch(
    /@keyframes launch-cta-pulse[\s\S]*?var\(--launch-ember-bright\)/,
  )
})

it('o chrome do painel e do auth seguem --panel-gold / --theme-accent', () => {
  const panelBody = panel.replace(/html\.pdl-panel\[data-pdl-theme="default"\][\s\S]*?--panel-gold:\s*#c5a161/, '')
  expect(panel).toContain('--panel-gold: var(--theme-accent')
  expect(panel).toContain('color-mix(in srgb, var(--panel-gold)')
  expect(panel).toContain('.security-hero > span')
  expect(panel).toContain('color: var(--panel-gold-bright)')
  expect(panel).not.toMatch(/rgba\(\s*218\s*,\s*174\s*,\s*81/)
  expect(panel).not.toMatch(/#e1bd70/)
  expect(panel).toMatch(/\.progress-bar i\s*\{[\s\S]*?linear-gradient\(90deg, color-mix\(in srgb, var\(--panel-gold\)/)
  expect(panel).toMatch(/\.fragment-progress-fill\s*\{[\s\S]*?var\(--panel-gold\)/)
  expect(panel).toMatch(/\.battle-hp-fill\s*\{[\s\S]*?var\(--panel-gold\)/)
  expect(panel).toMatch(/\.respawn-timer-fill\s*\{[\s\S]*?stroke:\s*var\(--panel-gold-bright\)/)
  expect(panel).not.toMatch(/#76551f|#d1a94f|#f1d88c/)
  expect(panel).not.toMatch(/rgba\(\s*117\s*,\s*85\s*,\s*34/)
  expect(panel).not.toMatch(/rgba\(\s*156\s*,\s*121\s*,\s*55/)
  expect(panel).not.toMatch(/text-shadow:\s*0 0 \d+px orange/)
  expect(panelBody).not.toMatch(/rgba\(\s*197\s*,\s*161\s*,\s*97/)
  expect(auth).toContain('var(--theme-accent, var(--panel-gold, #c5a161))')
  expect(auth).not.toMatch(/rgba\(\s*197\s*,\s*161\s*,\s*97/)
  expect(auth).toMatch(/\.portal-auth-card \.h-link button[\s\S]*?var\(--theme-button-primary/)
  expect(auth).toMatch(/\.portal-auth-card \.h-link\s*\{[\s\S]*?flex-direction:\s*column/)
  expect(auth).toMatch(/\.auth-check\s*\{[\s\S]*?grid-template-columns:\s*auto 1fr/)
  expect(auth).toMatch(/\.auth-check input\[type="checkbox"\]\s*\{[\s\S]*?min-height:\s*0/)
  expect(auth).toMatch(/\.auth-methods\s*\{[\s\S]*?auto-fit/)
  expect(panel).toMatch(
    /html\[data-pdl-theme="saga"\]\.pdl-panel \.shell\s*\{[\s\S]*?max-width:\s*none[\s\S]*?padding-inline:\s*12px/,
  )
})

it('o header público e o emblema de auth leem o acento e as artes do tema', () => {
  expect(layout).toContain('var(--theme-button-tab, url(\'/theme/default/images/button/3.png\'))')
  expect(layout).not.toMatch(/background:\s*url\('\/theme\/default\/images\/button\/3\.png'\)/)
  expect(layout).not.toMatch(/color:\s*#caa55f/)
  expect(layout).not.toMatch(/color:\s*#d7b66d/)
  expect(emblem).toContain('.pdl-emblem-orbit')
  expect(emblem).toMatch(/border-top-color:\s*var\(--theme-accent/)
  expect(emblem).not.toMatch(/border-top-color:\s*#d9b665/)
})

it('Info, Rankings, extras e o loader usam tokens em vez de ouro/default cravados', () => {
  expect(info).toContain('--info-gold: var(--theme-accent')
  expect(info).toContain('var(--theme-art-bg-5')
  expect(info).toContain('var(--theme-art-bg-1')
  expect(info).toContain('linear-gradient(135deg, var(--theme-accent-bright')
  expect(info).not.toMatch(/rgba\(\s*212\s*,\s*173\s*,\s*98/)
  expect(info).not.toMatch(/background:\s*linear-gradient\(135deg, #efd18e/)
  expect(info).not.toMatch(/color:\s*#c8a65f/)
  expect(info).not.toMatch(/color:\s*#e8c777/)
  expect(info).not.toMatch(/color:\s*#f0d28c/)
  expect(info).not.toMatch(/color:\s*#f0ce80/)
  expect(info).not.toMatch(/color:\s*#f0d18b/)
  expect(info).toMatch(/\.info-server-heading strong\s*\{[\s\S]*?var\(--info-gold/)
  expect(info).toMatch(/\.info-story-card h3\s*\{[\s\S]*?var\(--info-gold/)
  expect(info).toMatch(/\.info-hero-glow\s*\{[\s\S]*?var\(--info-gold/)
  expect(info).toMatch(/--info-panel:\s*color-mix\(in srgb, var\(--theme-bg-deep/)
  expect(info).toMatch(/\.info-hero-card\s*\{[\s\S]*?var\(--theme-surface/)
  expect(info).not.toMatch(/rgba\(\s*191\s*,\s*121\s*,\s*39/)
  expect(info).not.toMatch(/rgba\(\s*20\s*,\s*16\s*,\s*11/)
  expect(info).not.toMatch(/rgba\(\s*28\s*,\s*22\s*,\s*14/)
  expect(info).not.toMatch(/#3d3223/)
  expect(rankings).toMatch(/\.rankings-hero-glow\s*\{[\s\S]*?var\(--rank-gold/)
  expect(rankings).not.toMatch(/rgba\(\s*191\s*,\s*121\s*,\s*39/)
  expect(rankings).not.toMatch(/color:\s*#e8c777/)
  expect(rankings).not.toMatch(/color:\s*#f0d28c/)
  expect(rankings).not.toMatch(/color:\s*#f0d18b/)
  expect(rankings).toContain('--rank-gold: var(--theme-accent')
  expect(rankings).toContain('var(--theme-art-bg-3')
  expect(rankings).not.toMatch(/rgba\(\s*212\s*,\s*173\s*,\s*98/)
  expect(extras).toContain('color: var(--theme-accent, #d4af37)')
  expect(publicPages).toMatch(/\.public-accordion button:hover[\s\S]*?var\(--theme-accent/)
  expect(publicPages).not.toMatch(/text-shadow:\s*0 0 \d+px orange/)
  expect(publicPages).not.toMatch(/\.public-accordion\s*\{[\s\S]*?#3d3223/)
  expect(publicPages).toMatch(/\.public-diamond\.sm\s*\{[\s\S]*?var\(--theme-accent/)
  expect(publicPages).not.toMatch(/#725d42/)
  expect(termsCss).not.toMatch(/#3d3223/)
  expect(termsCss).toMatch(/\.cookie-banner\s*\{[\s\S]*?var\(--theme-accent/)
  expect(auth).not.toMatch(/text-shadow:\s*0 0 \d+px orange/)
  expect(wikiCss).toContain('var(--theme-accent-bright, #e6c77d)')
  expect(wikiCss).not.toMatch(/color:\s*#e6c77d/)
  expect(wikiCss).not.toMatch(/color:\s*#d1a44f/)
  expect(homeExtras).toMatch(/\.home-wiki \.w-list \.line\s*\{[\s\S]*?display:\s*none/)
  expect(homeExtras).toMatch(/\.w\.home-wiki\s*\{[\s\S]*?overflow:\s*visible/)
  expect(homeExtras).toMatch(/\.w\.home-wiki \.w-list \.wiki[\s\S]*?clip-path:\s*none/)
  expect(homeExtras).toMatch(/\.w\.home-wiki \.w-list \.wiki[\s\S]*?min-height:\s*320px/)
  expect(homeExtras).toMatch(
    /\.f\.home-features\s*\{[\s\S]*?var\(--theme-art-bg-2/,
  )
  expect(homeExtras).not.toMatch(/\.f\.home-features\s*\{[\s\S]*?url\(\.\.\/images\/bg\/2\.jpg\)/)
  expect(homeExtras).toMatch(
    /\.home-features \.f-list a\s*\{[\s\S]*?background-color:\s*color-mix\(in srgb, var\(--theme-surface/,
  )
  expect(homeExtras).toMatch(
    /\.home-features \.f-list a div::before[\s\S]*?var\(--theme-bg-deep/,
  )
  expect(homeExtras).not.toMatch(/\.home-features \.f-list a div::before\s*\{[^}]*rgba\(\s*8\s*,\s*6\s*,\s*4/)
  expect(homeExtras).not.toMatch(/rgba\(\s*196\s*,\s*151\s*,\s*65/)
  expect(homeExtras).not.toMatch(/rgba\(\s*174\s*,\s*128\s*,\s*48/)
  expect(homeExtras).not.toMatch(/rgba\(\s*255\s*,\s*220\s*,\s*150/)
  expect(homeExtras).toMatch(/\.clan-card\s*\{[\s\S]*?var\(--theme-accent/)
  expect(homeExtras).toMatch(/\.clan-board\s*\{[\s\S]*?var\(--theme-accent/)
  expect(homeExtras).toMatch(/\.ranking-tile\s*\{[\s\S]*?var\(--theme-accent/)
  expect(homeExtras).toMatch(
    /\.trailer-facade-play\s*\{[\s\S]*?var\(--theme-bg-deep/,
  )
  expect(homeExtras).toMatch(
    /\.trailer-facade:hover \.trailer-facade-play[\s\S]*?var\(--theme-accent/,
  )
  expect(homeExtras).not.toMatch(/rgba\(\s*190\s*,\s*129\s*,\s*48/)
  expect(homeExtras).not.toMatch(/rgba\(\s*12\s*,\s*10\s*,\s*8/)
  expect(homeExtras).not.toMatch(/\.clan-card\s*\{[\s\S]*?background:\s*#3d3223/)
  expect(homeExtras).not.toMatch(/\.clan-board\s*\{[\s\S]*?rgba\(\s*61\s*,\s*50\s*,\s*35/)
  expect(homeExtras).not.toMatch(/\.ranking-tile\s*\{[\s\S]*?background:\s*#3d3223/)
  expect(homeExtras).not.toMatch(/text-shadow:\s*0 0 \d+px orange/)
  expect(carousel).toMatch(/\.apoiadores-banner\s*\{[\s\S]*?var\(--theme-bg-deep/)
  expect(carousel).toMatch(/\.apoiadores-banner\s*\{[\s\S]*?var\(--theme-accent/)
  expect(carousel).not.toMatch(/#1b160e/)
  expect(carousel).not.toMatch(/rgba\(\s*28\s*,\s*22\s*,\s*12/)
  expect(carousel).not.toMatch(/rgba\(\s*10\s*,\s*8\s*,\s*5/)
  expect(rankings).toMatch(/\.rankings-card\s*\{[\s\S]*?var\(--theme-accent/)
  expect(rankings).toMatch(/\.rankings-board\s*\{[\s\S]*?var\(--rank-gold/)
  expect(rankings).not.toMatch(/\.rankings-card\s*\{[\s\S]*?background:\s*#3d3223/)
  expect(rankings).not.toMatch(/\.rankings-board\s*\{[\s\S]*?rgba\(\s*61\s*,\s*50\s*,\s*35/)
  expect(globalCss).toContain('--theme-button-tab:')
  expect(globalCss).toContain('--theme-art-bg-1:')
  expect(globalCss).toContain('--theme-art-bg-5:')
  expect(loaderCss).toContain("var(--theme-art-bg-5, url('/theme/default/images/bg/5.jpg'))")
  expect(uiCss).toContain('outline: 2px solid var(--theme-accent, var(--gold))')
  expect(uiCss).toContain('.ui-select-trigger::after')
  expect(uiCss).toMatch(
    /\.ui-select-trigger\s*\{[\s\S]*?background-color:\s*color-mix\(in srgb, var\(--theme-bg-deep/,
  )
  expect(uiCss).toMatch(
    /\.ui-select-list\s*\{[\s\S]*?background:\s*color-mix\(in srgb, var\(--theme-surface/,
  )
  expect(uiCss).not.toMatch(/background:\s*#12100c/)
  expect(uiCss).not.toMatch(/background-color:\s*rgba\(\s*6\s*,\s*6\s*,\s*5/)
  expect(layout).toMatch(
    /html\.pdl-public \.site-footer\s*\{[\s\S]*?var\(--theme-bg-deep/,
  )
  expect(layout).not.toMatch(/html\.pdl-public \.site-footer\s*\{[\s\S]*?rgba\(\s*10\s*,\s*8\s*,\s*6/)
  expect(uiCss).not.toMatch(/stroke='%23C5A161'/)
  expect(uiCss).not.toMatch(/rgba\(\s*210\s*,\s*170\s*,\s*86/)
})

it('todas as barras de progresso e thumbs de scroll leem o acento do tema', () => {
  expect(helpCss).toContain('::-webkit-progress-value')
  expect(helpCss).toContain('::-moz-progress-bar')
  expect(helpCss).toMatch(/progress::-webkit-progress-value[\s\S]*?var\(--help-accent/)
  expect(helpCss).toMatch(/\.denk-pet-panel header strong\s*\{[\s\S]*?var\(--help-accent-bright/)
  expect(helpCss).toMatch(/\.help-follow-up\s*\{[\s\S]*?var\(--help-accent-bright/)
  expect(helpCss).not.toMatch(/rgba\(\s*210\s*,\s*170\s*,\s*86/)
  expect(helpCss).not.toMatch(/rgba\(\s*117\s*,\s*85\s*,\s*34/)
  expect(helpCss).not.toMatch(/rgba\(\s*156\s*,\s*121\s*,\s*55/)
  expect(speechCss).toMatch(/--speech-fill:\s*linear-gradient\([\s\S]*?var\(--theme-surface/)
  expect(speechCss).toMatch(/\.help-speech-bubble--assistant[\s\S]*?var\(--theme-accent/)
  expect(speechCss).toMatch(/\.help-speech-bubble--user[\s\S]*?var\(--theme-accent/)
  expect(speechCss).toMatch(/\.help-speech-bubble--status[\s\S]*?var\(--theme-surface/)
  expect(speechCss).toMatch(/\.help-speech-bubble--assistant \.help-speech-bubble__name[\s\S]*?var\(--theme-accent/)
  expect(speechCss).not.toMatch(/rgba\(\s*62\s*,\s*48\s*,\s*28/)
  expect(speechCss).not.toMatch(/rgba\(\s*84\s*,\s*58\s*,\s*28/)
  expect(speechCss).not.toMatch(/rgba\(\s*72\s*,\s*52\s*,\s*28/)
  expect(speechCss).not.toMatch(/rgba\(\s*28\s*,\s*22\s*,\s*16/)
  expect(speechCss).not.toMatch(/rgba\(\s*34\s*,\s*26\s*,\s*16/)
  expect(speechCss).not.toMatch(/rgba\(\s*30\s*,\s*24\s*,\s*16/)
  expect(speechCss).not.toMatch(/rgba\(\s*210\s*,\s*160\s*,\s*70/)
  expect(speechCss).not.toMatch(/rgba\(\s*240\s*,\s*215\s*,\s*138/)
  expect(speechCss).not.toMatch(/rgba\(\s*255\s*,\s*236\s*,\s*190/)
  expect(speechCss).not.toMatch(/#f0d78a/i)
  expect(speechCss).not.toMatch(/#9ec4e8/i)
  expect(petProgressCss).toContain('::-webkit-progress-value')
  expect(petProgressCss).toMatch(/denk-progress progress::-webkit-progress-value[\s\S]*?var\(--theme-accent/)
  expect(petProgressCss).toMatch(/\.denk-care-gains\s*\{[\s\S]*?var\(--theme-accent-bright/)
  expect(contextualHelpCss).toContain('--contextual-accent: var(--theme-accent')
  expect(contextualHelpCss).toMatch(/\.contextual-help-need-fill\s*\{[\s\S]*?var\(--theme-accent/)
  expect(contextualHelpCss).not.toMatch(/background:\s*linear-gradient\(90deg, #2f8f7d/)
  expect(programsCss).toMatch(/--program-warn:\s*var\(--theme-warn,\s*var\(--theme-accent/)
  expect(programsCss).not.toMatch(/--program-warn:\s*var\(--theme-warn,\s*#d9bb70/)
  expect(programsCss).toMatch(/\.program-meter span\s*\{[\s\S]*?var\(--theme-accent/)
  expect(programsCss).toMatch(/\.program-record\s*\{[\s\S]*?var\(--theme-surface/)
  expect(programsCss).toMatch(/\.program-record\.is-active\s*\{[\s\S]*?var\(--theme-accent/)
  expect(programsCss).toMatch(/\.program-record-head h3\s*\{[\s\S]*?var\(--theme-accent-bright/)
  expect(programsCss).not.toMatch(/rgba\(\s*8\s*,\s*7\s*,\s*5/)
  expect(panel).toMatch(/html\.pdl-panel \.card\s*\{[\s\S]*?var\(--theme-surface\)/)
  expect(panel).not.toMatch(/html\.pdl-panel \.card\s*\{[\s\S]*?rgba\(\s*31\s*,\s*26\s*,\s*19/)
  expect(panel).toMatch(/html\.pdl-panel body::before\s*\{[\s\S]*?var\(--theme-accent/)
  expect(panel).not.toMatch(/rgba\(\s*137\s*,\s*72\s*,\s*24/)
  expect(panel).toMatch(/html\.pdl-panel \.panel-welcome\s*\{[\s\S]*?var\(--theme-bg-deep/)
  expect(panel).toMatch(/html\.pdl-panel \.account-hero\s*\{[\s\S]*?var\(--theme-bg-deep/)
  expect(panel).toMatch(/\.theme-package\.is-active\s*\{[\s\S]*?var\(--theme-accent/)
  expect(panel).toMatch(/\.theme-active-badge\s*\{[\s\S]*?var\(--theme-accent-bright/)
  expect(panel).not.toMatch(/\.theme-package\.is-active\s*\{[\s\S]*?rgba\(\s*126\s*,\s*170\s*,\s*131/)
  expect(panel).not.toMatch(/\.theme-active-badge\s*\{[\s\S]*?#9ac49f/)
  expect(panel).not.toMatch(/\.security-secret strong\s*\{[^}]*#f0d28c/)
  expect(panel).not.toMatch(/\.user-profile-stat-list strong\s*\{[\s\S]*?#f0d28c/)
  expect(panel).toMatch(/\.user-profile-avatar\s*\{[\s\S]*?border:\s*1px solid color-mix\(in srgb, var\(--panel-gold-bright\)/)
  expect(panel).not.toMatch(/\.user-profile-avatar\s*\{[\s\S]*?#d6ad55/)
  expect(panel).not.toMatch(/\.user-profile-avatar\s*\{[\s\S]*?#dcb765/)
  expect(panel).toMatch(/\.user-profile-stat-list > div > svg\s*\{[\s\S]*?color:\s*var\(--panel-gold\)/)
  expect(panel).not.toMatch(/\.user-profile-stat-list > div > svg\s*\{[\s\S]*?#d9ae59/)
  expect(panel).toMatch(/\.user-profile-hero-facts svg\s*\{[\s\S]*?color:\s*var\(--panel-gold-bright\)/)
  expect(panel).toMatch(/\.security-session-list article > svg\s*\{[^}]*color:\s*var\(--panel-gold\)/)
  expect(panel).toMatch(/\.security-passkey-list article > svg\s*\{[^}]*color:\s*var\(--panel-gold\)/)
  expect(panel).toMatch(/\.security-provider > i\s*\{[^}]*color:\s*var\(--panel-gold\)/)
  expect(panel).not.toMatch(/#d9ae59/)
  expect(panel).toMatch(
    /html\.pdl-panel \.character-paperdoll\s*\{[^}]*border:\s*1px solid color-mix\(in srgb, var\(--panel-gold-bright\)/,
  )
  expect(panel).toMatch(
    /html\.pdl-panel \.character-paperdoll-corner\s*\{[^}]*border-color:\s*color-mix\(in srgb, var\(--panel-gold-bright\)/,
  )
  expect(panel).toMatch(
    /html\.pdl-panel \.marketplace-hero\s*\{[^}]*var\(--theme-bg-deep\)/,
  )
  expect(panel).not.toMatch(/html\.pdl-panel \.character-paperdoll\s*\{[^}]*rgba\(\s*198\s*,\s*176\s*,\s*130/)
  expect(panel).not.toMatch(/html\.pdl-panel \.character-paperdoll-corner\s*\{[^}]*rgba\(\s*214\s*,\s*188\s*,\s*128/)
  expect(panel).toMatch(/html\.pdl-panel \.character-skills-tabs button\s*\{[^}]*var\(--panel-muted\)/)
  expect(panel).toMatch(/html\.pdl-panel \.character-skills-tabs button\.active\s*\{[^}]*var\(--panel-gold-bright\)/)
  expect(panel).toMatch(/html\.pdl-panel \.character-skills-fold::before[\s\S]*?background:\s*var\(--panel-gold-bright\)/)
  expect(panel).not.toMatch(/#b7aa8f|#f3e6c4|#d7c28a|#8a7a58/)
  expect(panel).toMatch(/\.dashboard-hero-status \.is-off[\s\S]*?var\(--theme-warn,\s*var\(--theme-accent/)
  expect(panel).not.toMatch(/\.dashboard-hero-status \.is-off[\s\S]*?color:\s*#d6a767/)
  expect(panel).toMatch(/\.security-card \.is-off\s*\{[^}]*var\(--theme-warn,\s*var\(--theme-accent/)
  expect(panel).toMatch(/\.admin-game-card code\s*\{[^}]*var\(--theme-accent/)
  expect(globalCss).toMatch(/\.staff-support-section-label[^{]*\{[^}]*var\(--theme-accent/)
  expect(globalCss).not.toMatch(/\.staff-support-section-label[^{]*\{[^}]*color:\s*#bea769/)
  expect(globalCss).toContain("@import url('/bootstrap-loader.css')")
  expect(loaderCss).toMatch(/\.global-loader::after,\s*#app-bootstrap-loader::after\s*\{[\s\S]*?width:\s*440px/)
  expect(loaderCss).toMatch(/\.global-loader__crest\s*\{[\s\S]*?width:\s*138px/)
  expect(loaderCss).toMatch(/\.global-loader__wordmark\s*\{[\s\S]*?min\(250px/)
  expect(loaderCss).toMatch(/html\[data-pdl-loader-wordmark="off"\] \.global-loader__wordmark[\s\S]*?display:\s*none/)
  expect(loaderCss).toMatch(/html\[data-pdl-loader-wordmark="off"\] \.global-loader__crest img[\s\S]*?width:\s*260px/)
  expect(loaderCss).toMatch(/\.global-loader__progress i\s*\{[\s\S]*?var\(--loader-mark-bright/)
  expect(loaderCss).toMatch(/\.global-loader__crest::before/)
  expect(loaderCss).not.toContain('global-loader__marks')
  expect(loaderCss).not.toContain('globalLoaderOrbit')
  expect(uiCss).toMatch(/\.ui-select-list::-webkit-scrollbar-thumb\s*\{[\s\S]*?var\(--theme-accent/)
})

it('heróis do admin e do suporte leem --theme-art-bg e não apagam a arte', () => {
  expect(panel).toMatch(/\.security-hero[\s\S]*?var\(--theme-art-bg-2\)/)
  expect(globalCss).toMatch(/\.support-hero::after[\s\S]*?var\(--theme-accent/)
  expect(globalCss).not.toMatch(/rgba\(\s*204\s*,\s*155\s*,\s*63/)
  expect(observationCss).toMatch(/\.observation-hero \.account-hero[\s\S]*?var\(--theme-art-bg-3/)
})

it('o Sair do menu do painel usa o botão padrão, sem círculo nem texto recortado', () => {
  expect(panel).toMatch(
    /html\.pdl-panel \.panel-user-account\s*\{[\s\S]*?grid-template-columns:\s*40px minmax\(0,\s*1fr\) auto/,
  )
  expect(panel).toMatch(/html\.pdl-panel \.panel-user-account > \.btn\s*\{[\s\S]*?justify-self:\s*end/)
  expect(panel).not.toMatch(/html\.pdl-panel \.panel-user \.btn\s*\{[\s\S]*?border-radius:\s*50%/)
  expect(panel).not.toMatch(/html\.pdl-panel \.panel-user \.btn span\s*\{[\s\S]*?clip:\s*rect/)
})

it('os baús do Classic têm frames fechado, entreaberto e aberto distintos', () => {
  const gamesDir = resolve(themeRoot, 'default/images/games')
  for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
    const hashes = ['', '-ajar', '-open'].map((pose) => {
      const file = resolve(gamesDir, `box-${rarity}${pose}.webp`)
      expect(existsSync(file), file).toBe(true)
      return createHash('md5').update(readFileSync(file)).digest('hex')
    })
    expect(new Set(hashes).size, rarity).toBe(3)
  }
})

it('o rodapé público do Classic alinha os títulos das colunas à esquerda', () => {
  expect(layout).toMatch(/html\.pdl-public \.site-footer-col\s*\{[\s\S]*?text-align:\s*left/)
  expect(layout).toMatch(/html\.pdl-public \.site-footer-col h2\s*\{[\s\S]*?text-align:\s*left/)
})
