import toast from 'react-hot-toast'
import { apiErrorMessage } from '../lib/errors'
import { useAsyncAction } from './useAsyncAction'

/** Ações com aviso de falha padrão. O callback define sucesso e atualiza seu cache. */
export function useFeedbackAction() {
  const action = useAsyncAction()
  async function run<T>(
    operation: () => Promise<T>,
    fallback: string,
    options?: { quiet?: (error: unknown) => boolean },
  ) {
    const result = await action.run(operation)
    if (!result.ok && !result.skipped && !options?.quiet?.(result.error)) {
      toast.error(apiErrorMessage(result.error, fallback))
    }
    return result
  }
  return { ...action, run }
}
