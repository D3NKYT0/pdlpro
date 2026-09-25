import { useQuery } from '@tanstack/react-query'

import { serverApi } from '../services/api'

export const LANDING_PATHS = ['/', '/home']

/**
 * Destino do atalho "Início" no chrome do site.
 *
 * Com o Coming Soon ligado `/` responde com a contagem regressiva, então os
 * atalhos de home (menu, marca, rodapé, login fechado, “voltar ao site”)
 * apontam para o alias `/home` — visitante ou logado — para não reabrir a
 * contagem a cada clique. Com o site aberto o alias redireciona para `/`, e o
 * link aponta direto para a raiz.
 */
export function useLandingPath() {
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  return info.data?.coming_soon ? '/home' : '/'
}
