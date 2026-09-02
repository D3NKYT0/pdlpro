import { useCallback, useEffect, useRef, useState } from 'react'

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: unknown; skipped?: boolean }

/** Serializa ações de uma tela e mantém pending/error consistentes.
 * Inclua invalidação de cache no callback para bloquear até a atualização acabar.
 * O hook não mostra toast nem conhece serviços, valores ou regras de negócio.
 */
export function useAsyncAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<ActionResult<T>> => {
    if (inFlight.current) return { ok: false, error: null, skipped: true }
    inFlight.current = true
    if (mounted.current) { setPending(true); setError(null) }
    try {
      return { ok: true, value: await operation() }
    } catch (reason) {
      if (mounted.current) setError(reason)
      return { ok: false, error: reason }
    } finally {
      inFlight.current = false
      if (mounted.current) setPending(false)
    }
  }, [])
  return { pending, error, run }
}
