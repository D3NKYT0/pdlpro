/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

function readCrumaThemeCss() {
  const candidates = [
    resolve(__dirname, '../../theme-packages/cruma/theme.css'),
    resolve(__dirname, '../../../backend/media/themes/cruma/1.0.0-3cb72e9dcda7/theme.css'),
  ]
  const file = candidates.find((path) => existsSync(path))
  if (!file) {
    throw new Error('Cruma theme.css não encontrado no pacote nem no media.')
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
const emblem = readFileSync(resolve(themeRoot, 'default/css/main.css'), 'utf8')
const globalCss = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8')
const uiCss = readFileSync(resolve(__dirname, '../components/ui/ui.css'), 'utf8')
const helpCss = readFileSync(resolve(__dirname, '../components/help/help.css'), 'utf8')
const petProgressCss = readFileSync(resolve(__dirname, '../components/help/pet-progress.css'), 'utf8')
const contextualHelpCss = readFileSync(resolve(__dirname, '../components/help/contextual-help.css'), 'utf8')
const programsCss = readFileSync(resolve(__dirname, '../components/programs/programs.css'), 'utf8')
const observationCss = readFileSync(resolve(__dirname, '../pages/admin/item-observation.css'), 'utf8')
const crumaCss = readCrumaThemeCss()

it('o quadro da coming soon usa o acento do tema, não o ouro clássico', () => {
  expect(comingSoon).toContain('--launch-ember: var(--theme-accent')
  expect(comingSoon).toMatch(
    /\.launch-gate__panel\s*\{[\s\S]*?border:\s*1px solid color-mix\(in srgb, var\(--launch-ember\)/,
  )
  expect(comingSoon).not.toMatch(/rgba\(\s*212\s*,\s*162\s*,\s*74/)
  expect(comingSoon).not.toMatch(/#c5a161/i)
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
  expect(rankings).not.toMatch(/color:\s*#e8c777/)
  expect(rankings).toContain('--rank-gold: var(--theme-accent')
  expect(rankings).toContain('var(--theme-art-bg-3')
  expect(rankings).not.toMatch(/rgba\(\s*212\s*,\s*173\s*,\s*98/)
  expect(extras).toContain('color: var(--theme-accent, #d4af37)')
  expect(globalCss).toContain('--theme-button-tab:')
  expect(globalCss).toContain('--theme-art-bg-1:')
  expect(globalCss).toContain('--theme-art-bg-5:')
  expect(globalCss).toContain('var(--theme-art-bg-5, url(\'/theme/default/images/bg/5.jpg\'))')
  expect(uiCss).toContain('outline: 2px solid var(--theme-accent, var(--gold))')
  expect(uiCss).toContain('.ui-select-trigger::after')
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
  expect(globalCss).toMatch(/\.global-loader__progress i\s*\{[\s\S]*?var\(--theme-accent-bright/)
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
})
