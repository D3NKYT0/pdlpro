import { useAuth } from '../contexts/AuthContext'
import { canSeeItemIds } from '../lib/staff'

/** Verdadeiro para a equipe; jogadores (ou telas sem sessão) veem nomes de itens sem o ID. */
export function useCanSeeItemIds() {
  // useAuth sempre lê o contexto antes de falhar: a ordem dos hooks não muda sem provider.
  try {
    return canSeeItemIds(useAuth().user ?? null)
  } catch {
    return false
  }
}
