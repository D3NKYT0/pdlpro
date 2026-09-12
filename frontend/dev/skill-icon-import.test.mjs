import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { importSkillIcons, skillIconDestinationName } from '../scripts/import-l2-skill-icons.mjs'

const created = []

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'pdl-skill-icons-'))
  created.push(dir)
  return dir
}

describe('skill icon destination names', () => {
  it('maps skillNNNN.png to the numeric skill id', () => {
    expect(skillIconDestinationName('skill0001.png')).toBe('1.png')
    expect(skillIconDestinationName('skill1177.png')).toBe('1177.png')
    expect(skillIconDestinationName('SKILL0058.PNG')).toBe('58.png')
  })

  it('ignores variants, chrome and non-png files', () => {
    expect(skillIconDestinationName('skill0761_2.png')).toBeNull()
    expect(skillIconDestinationName('skill_exp_sp_up.png')).toBeNull()
    expect(skillIconDestinationName('SkillWnd_TabLight_00.png')).toBeNull()
    expect(skillIconDestinationName('skill0001.jpg')).toBeNull()
    expect(skillIconDestinationName('readme.md')).toBeNull()
  })
})

describe('import skill icons', () => {
  it('copies only numeric skillNNNN.png as id.png', () => {
    const source = tempDir()
    const dest = tempDir()
    writeFileSync(join(source, 'skill0000.png'), 'placeholder')
    writeFileSync(join(source, 'skill0001.png'), 'wind-strike')
    writeFileSync(join(source, 'skill0761_2.png'), 'variant')
    writeFileSync(join(source, 'SkillWnd_TabLight_00.png'), 'chrome')
    writeFileSync(join(source, 'notes.txt'), 'ignored')

    expect(importSkillIcons(source, dest)).toBe(2)
    expect(readFileSync(join(dest, '1.png'), 'utf8')).toBe('wind-strike')
    expect(readFileSync(join(dest, 'default.png'), 'utf8')).toBe('placeholder')
    expect(existsSync(join(dest, 'skill0001.png'))).toBe(false)
    expect(existsSync(join(dest, 'skill0761_2.png'))).toBe(false)
    expect(existsSync(join(dest, 'SkillWnd_TabLight_00.png'))).toBe(false)
  })

  it('rejects an empty source folder', () => {
    const source = tempDir()
    mkdirSync(source, { recursive: true })
    expect(() => importSkillIcons(source, tempDir())).toThrow(/Nenhum arquivo PNG/)
  })
})
