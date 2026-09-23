import { useQuery } from '@tanstack/react-query'
import { serverApi } from '../services/api'

/** Flags públicas de liberação durante Coming Soon (cadastro, login e conta L2). */
export function useLaunchAccess() {
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  const comingSoon = Boolean(info.data?.coming_soon)

  return {
    isPending: info.isPending,
    comingSoon,
    registrationOpen: !comingSoon || info.data?.allow_registration !== false,
    playerLoginOpen: !comingSoon || !info.data?.staff_only_login,
    l2RegistrationOpen: !comingSoon || info.data?.allow_l2_registration !== false,
  }
}
