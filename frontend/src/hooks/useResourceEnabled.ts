import { useQuery } from '@tanstack/react-query'
import { programsApi } from '../services/api'
import { resourceEnabled } from '../lib/resources'

/** Resolve a configuração efetiva de um recurso e de seu módulo principal. */
export function useResourceEnabled(code: string, parent?: string) {
  const query = useQuery({ queryKey: ['resources'], queryFn: programsApi.resources, staleTime: 15000, refetchInterval: 30000 })
  return query.isSuccess && resourceEnabled(query.data, code, parent)
}
