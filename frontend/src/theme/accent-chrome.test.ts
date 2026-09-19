/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

function readCrumaThemeFile(name: 'theme.css' | 'theme.json') {
  const candidates = [
    resolve(__dirname, `../../theme-packages/cruma/${name}`),
    resolve(__dirname, `../../../backend/media/themes/cruma/1.0.0-3cb72e9dcda7/${name}`),
  ]
  const file = candidates.find((path) => existsSync(path))
  if (!file) {
    throw new Error(`Cruma ${name} não encontrado no pacote nem no media.`)
  }
  return readFileSync(file, 'utf8')
}

const themeRoot = resolve(__dirname, '../../public/theme')
const comingSoon = readFileSync(resolve(themeRoot, 'pages/coming-soon.css'), 'utf8')
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
const petProgressCss = readFileSync(resolve(__dirname, '../components/help/pet-progress.css'), 'utf8')
const contextualHelpCss = readFileSync(resolve(__dirname, '../components/help/contextual-help.css'), 'utf8')
const programsCss = readFileSync(resolve(__dirname, '../components/programs/programs.css'), 'utf8')
const observationCss = readFileSync(resolve(__dirname, '../pages/admin/item-observation.css'), 'utf8')
const crumaCss = readCrumaThemeFile('theme.css')
const crumaJson = JSON.parse(readCrumaThemeFile('theme.json'))

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
  expect(helpCss).not.toMatch(/rgba\(\s*210\s*,\s*170\s*,\s*86/)
  expect(helpCss).not.toMatch(/rgba\(\s*117\s*,\s*85\s*,\s*34/)
  expect(helpCss).not.toMatch(/rgba\(\s*156\s*,\s*121\s*,\s*55/)
  expect(petProgressCss).toContain('::-webkit-progress-value')
  expect(petProgressCss).toMatch(/denk-progress progress::-webkit-progress-value[\s\S]*?var\(--theme-accent/)
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
  expect(globalCss).toContain("@import url('/bootstrap-loader.css')")
  expect(loaderCss).toMatch(/\.global-loader::after,\s*#app-bootstrap-loader::after\s*\{[\s\S]*?width:\s*440px/)
  expect(loaderCss).toMatch(/\.global-loader__crest\s*\{[\s\S]*?width:\s*138px/)
  expect(loaderCss).toMatch(/\.global-loader__wordmark\s*\{[\s\S]*?min\(250px/)
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
  expect(crumaCss).toContain('[data-theme-part="page-header"]')
  expect(crumaCss).toContain('.panel-welcome')
  expect(crumaCss).toContain('[data-theme-part="admin-category"]')
  expect(crumaCss).toContain('--theme-art-bg-3: url("images/bg/3.jpg")')
  expect(crumaCss).toContain('--theme-button-tab: url("images/button/3.png")')
  expect(crumaCss).toContain('var(--theme-art-bg-3)')
  expect(crumaJson.assets['images/pdl-symbol.svg']).toBe('images/pdl-symbol.png')
  expect(crumaCss).toMatch(
    /html\[data-pdl-theme="cruma"\] \.launch-gate\s*\{[\s\S]*?--launch-panel:\s*color-mix\(in srgb, var\(--theme-surface\)/,
  )
  expect(crumaCss).toMatch(
    /html\[data-pdl-theme="cruma"\] \.launch-gate \.btn\.ui-button:hover[\s\S]*?var\(--launch-ember-bright\)/,
  )
  expect(crumaCss).not.toMatch(/text-shadow:\s*0 0 \d+px orange/)
  expect(crumaCss).toMatch(
    /html\[data-pdl-theme="cruma"\] \.f\.home-features[\s\S]*?var\(--theme-art-bg-2\)/,
  )
  expect(crumaCss).toMatch(
    /html\[data-pdl-theme="cruma"\] \.home-features \.f-list a\s*\{[\s\S]*?var\(--theme-surface\)/,
  )
  expect(crumaCss).toMatch(
    /html\[data-pdl-theme="cruma"\] \.home-features \.f-list a div::before[\s\S]*?var\(--theme-bg-deep\)/,
  )
})

it('o rodapé portal do Cruma não desloca os títulos das colunas do shell clássico', () => {
  expect(crumaCss).toMatch(/html\[data-pdl-theme="cruma"\] \.portal-shell \.site-footer\s*\{/)
  expect(crumaCss).not.toMatch(/html\[data-pdl-theme="cruma"\] \.site-footer\s*\{/)
  expect(crumaCss).toMatch(
    /html\[data-pdl-theme="cruma"\]\.pdl-public \.site-footer\s*\{[\s\S]*?var\(--theme-bg-deep\)/,
  )
  expect(crumaCss).toMatch(
    /html\[data-pdl-theme="cruma"\] \.ui-select-list\s*\{[\s\S]*?var\(--theme-surface\)/,
  )
  expect(layout).toMatch(/html\.pdl-public \.site-footer-col\s*\{[\s\S]*?text-align:\s*left/)
  expect(layout).toMatch(/html\.pdl-public \.site-footer-col h2\s*\{[\s\S]*?text-align:\s*left/)
})
