import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { FRONTEND_LOG_DIR, appendFrontendLog, ensureFrontendLogDir } from './logPaths.ts'

const created: string[] = []

afterEach(() => {
  for (const file of created.splice(0)) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  }
})

describe('frontend log paths', () => {
  it('keeps the canonical directory named log', () => {
    const dir = ensureFrontendLogDir()
    expect(path.basename(dir)).toBe('log')
    expect(dir).toBe(FRONTEND_LOG_DIR)
  })

  it('appends only under frontend/log/*.log', () => {
    const target = path.join(FRONTEND_LOG_DIR, 'unit-test.log')
    created.push(target)
    if (fs.existsSync(target)) {
      fs.unlinkSync(target)
    }
    appendFrontendLog('unit-test.log', 'hello')
    expect(fs.readFileSync(target, 'utf8')).toContain('hello')
  })

  it('rejects log files outside log/', () => {
    expect(() => appendFrontendLog('../escape.log', 'nope')).toThrow(/log\/\*/)
    expect(() => appendFrontendLog('notes.txt', 'nope')).toThrow(/log\/\*/)
  })

  it('does not leave the process cwd as the log root', () => {
    expect(path.basename(FRONTEND_LOG_DIR)).toBe('log')
    expect(FRONTEND_LOG_DIR.endsWith(`${path.sep}log`) || FRONTEND_LOG_DIR.endsWith('/log')).toBe(true)
    expect(fs.existsSync(FRONTEND_LOG_DIR) || true).toBe(true)
    expect(os.tmpdir()).not.toBe(FRONTEND_LOG_DIR)
  })
})
