import type { Resource } from '../services/api'

/** Calcula a ativação efetiva sem alterar as preferências salvas dos descendentes. */
export function resourceEnabled(rows: Resource[], code: string, parent?: string): boolean {
  const byCode = new Map(rows.map(row => [row.code, row]))
  const seen = new Set<string>()
  let current: string | null | undefined = code
  while (current) {
    if (seen.has(current)) return false
    seen.add(current)
    const row = byCode.get(current)
    if (row?.enabled === false) return false
    current = row?.parent_code || (current === code ? parent : null)
  }
  return true
}
