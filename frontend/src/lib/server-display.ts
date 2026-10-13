/** Associa os indicadores dos temas aos controles globais de apresentação. */
export function serverStatVisible(kind: string, enabled: (code: string) => boolean): boolean {
  if (kind === 'online') return enabled('players-online')
  if (kind === 'status') return enabled('server-status')
  return true
}
