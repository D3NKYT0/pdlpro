import type { Logger, LogErrorOptions } from 'vite'
import { createLogger } from 'vite'

import { appendFrontendLog } from './logPaths.ts'

function stamp(level: string, message: string): string {
  return `[${new Date().toISOString()}] ${level} ${message}`
}

/** Logger do Vite que espelha warn/error em `frontend/log/vite.log`. */
export function createViteFileLogger(): Logger {
  const base = createLogger()
  return {
    ...base,
    warn(msg, options) {
      appendFrontendLog('vite.log', stamp('WARN', String(msg)))
      base.warn(msg, options)
    },
    error(msg, options?: LogErrorOptions) {
      appendFrontendLog('vite.log', stamp('ERROR', String(msg)))
      base.error(msg, options)
    },
  }
}
