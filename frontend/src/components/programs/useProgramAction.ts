import type { QueryKey } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { useAsyncAction } from '../../hooks/useAsyncAction'

export type ProgramActionInvalidate = readonly QueryKey[]

/**
 * Action helper for program/admin flows: toast on success + scoped query invalidation.
 * Always pass explicit `invalidate` keys — never a global cache wipe.
 */
export function useProgramAction() {
  const client = useQueryClient()
  const action = useAsyncAction()

  async function run(
    operation: () => Promise<unknown>,
    message: string,
    invalidate: ProgramActionInvalidate,
  ) {
    const result = await action.run(async () => {
      try {
        await operation()
        toast.success(message)
      } finally {
        await Promise.all(
          invalidate.map((queryKey) => client.invalidateQueries({ queryKey })),
        )
      }
    })
    return result.ok
  }

  return { busy: action.pending, error: action.error, run }
}
