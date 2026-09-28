import { useSearchParams } from 'react-router-dom'

/**
 * Mantém a aba ativa em um parâmetro da URL para que recarregar a página ou
 * compartilhar o link preserve a seleção. Valores ausentes ou desconhecidos
 * caem em `fallback`; os demais parâmetros da URL são preservados na troca.
 */
export function useSearchParamTab<T extends string>(
  tabs: readonly T[],
  fallback: T,
  param = 'tab',
): [T, (tab: T) => void] {
  const [params, setParams] = useSearchParams()
  const requested = params.get(param)
  const active = tabs.find((tab) => tab === requested) ?? fallback

  function setActive(tab: T) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set(param, tab)
      return next
    })
  }

  return [active, setActive]
}
