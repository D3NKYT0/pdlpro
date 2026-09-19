import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

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

it('o quadro da coming soon usa o acento do tema, não o ouro clássico', () => {
  expect(comingSoon).toContain('--launch-ember: var(--theme-accent')
  expect(comingSoon).toMatch(
    /\.launch-gate__panel\s*\{[\s\S]*?border:\s*1px solid color-mix\(in srgb, var\(--launch-ember\)/,
  )
  expect(comingSoon).not.toMatch(/rgba\(\s*212\s*,\s*162\s*,\s*74/)
  expect(comingSoon).not.toMatch(/#c5a161/i)
})

it('o chrome do painel e do auth seguem --panel-gold / --theme-accent', () => {
  const panelBody = panel.replace(/--panel-gold:\s*#c5a161/, '')
  expect(panel).toContain('color-mix(in srgb, var(--panel-gold)')
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
})
