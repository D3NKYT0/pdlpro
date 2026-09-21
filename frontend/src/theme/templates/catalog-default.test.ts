/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

import { THEME_CATALOG_IDS } from './ids'

const themeRoot = resolve(__dirname, '../../../public/theme/default/images')
const composeScript = readFileSync(resolve(__dirname, '../../../scripts/compose-layout-art.py'), 'utf8')

it('o Classic mantém logo e brasão e preenche os slots com artes do próprio tema', () => {
  expect(existsSync(resolve(themeRoot, 'logo.png'))).toBe(true)
  expect(existsSync(resolve(themeRoot, 'pdl-symbol.svg'))).toBe(true)
  expect(existsSync(resolve(themeRoot, 'cta-banner.jpg'))).toBe(true)
  expect(existsSync(resolve(themeRoot, 'templates'))).toBe(false)
  for (const id of THEME_CATALOG_IDS) {
    expect(existsSync(resolve(themeRoot, 'bg', `${id}-hero.webp`)), id).toBe(true)
    expect(existsSync(resolve(themeRoot, 'bg', `${id}-cta.webp`)), id).toBe(true)
    expect(existsSync(resolve(themeRoot, 'home', `${id}-1.webp`)), id).toBe(true)
    expect(existsSync(resolve(themeRoot, 'home', `${id}-2.webp`)), id).toBe(true)
    expect(existsSync(resolve(themeRoot, 'home', `${id}-3.webp`)), id).toBe(true)
  }
})

it('os slots são cenas completas, sem colar PNG de personagem', () => {
  expect(composeScript).toContain('home/cinematic-v2.webp')
  expect(composeScript).toContain('home/castle-siege-v2.webp')
  expect(composeScript).not.toContain('place_character')
  expect(composeScript).not.toContain('home/aden-guardian-v2.webp')
  expect(composeScript).not.toMatch(/coming-soon\/(phoenix|temple|abyss|assault|spell)/)
})
