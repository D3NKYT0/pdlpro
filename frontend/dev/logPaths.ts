import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Pasta canônica de arquivos `.log` do frontend (`frontend/log/`). */
export const FRONTEND_LOG_DIR = path.join(frontendRoot, 'log')

export function ensureFrontendLogDir(): string {
  fs.mkdirSync(FRONTEND_LOG_DIR, { recursive: true })
  return FRONTEND_LOG_DIR
}

/**
 * Acrescenta uma linha a um arquivo `.log` sob `frontend/log/`.
 * Recusa caminhos fora dessa pasta ou nomes sem sufixo `.log`.
 */
export function appendFrontendLog(filename: string, line: string): void {
  const base = path.basename(filename)
  if (base !== filename || !base.endsWith('.log') || base.includes('..')) {
    throw new Error(`Arquivos .log do frontend devem ficar em log/* (recebido: ${filename})`)
  }
  const dir = ensureFrontendLogDir()
  const target = path.resolve(dir, base)
  const relative = path.relative(dir, target)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Arquivos .log do frontend devem ficar em log/* (recebido: ${filename})`)
  }
  const payload = line.endsWith('\n') ? line : `${line}\n`
  fs.appendFileSync(target, payload, { encoding: 'utf8' })
}
