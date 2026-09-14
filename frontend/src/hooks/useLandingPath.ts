import { useQuery } from '@tanstack/react-query'

import { useAuth } from '../contexts/AuthContext'
import { serverApi } from '../services/api'

export const LANDING_PATHS = ['/', '/home']

/**
 * Destino do atalho "Início" no chrome do site.
 *
 * Com o Coming Soon ligado `/` responde com a contagem regressiva, então quem já
 * entrou volta para a landing pelo alias `/home`. Com o site aberto o alias
 * redireciona para `/`, e o link aponta direto para a raiz.
 */
export function useLandingPath() {
  const { user } = useAuth()
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  return user && info.data?.coming_soon ? '/home' : '/'
}
