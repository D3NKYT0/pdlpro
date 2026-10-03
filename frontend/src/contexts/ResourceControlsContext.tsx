import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { programsApi } from '../services/api'
import { resourceEnabled } from '../lib/resources'

// Componentes isolados podem compor a UI sem o shell; no app o provider é obrigatório.
const ResourceControlsContext = createContext<(code: string) => boolean>(() => true)

/** Compartilha um catálogo entre as superfícies e fecha os controles até carregar a configuração. */
export function ResourceControlsProvider({ children }: { children: ReactNode }) {
  const query = useQuery({ queryKey: ['resources'], queryFn: programsApi.resources, staleTime: 15000, refetchInterval: 30000 })
  const enabled = useMemo(() => (code: string) => query.isSuccess && resourceEnabled(query.data ?? [], code), [query.isSuccess, query.data])
  return <ResourceControlsContext.Provider value={enabled}>{children}</ResourceControlsContext.Provider>
}

export function useResourceControls() {
  return useContext(ResourceControlsContext)
}
