/** Preserva destinos internos entre entrar/cadastrar sem permitir redirects externos. */
export function authReturnPath(value: string | null, fallback = '/panel') {
  return value?.startsWith('/') && !value.startsWith('//') && !/[\\\x00-\x1f]/.test(value) ? value : fallback
}
