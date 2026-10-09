import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { serverApi } from '../../services/api'
import i18n from '../../i18n'
import { setCoinName } from '../../i18n/currency'

/** Compartilha a identidade pública da moeda com todas as traduções do painel. */
export function CoinNameSync() {
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  useEffect(() => {
    if (info.data) setCoinName(i18n, info.data.coin_name)
    else if (info.isError) setCoinName(i18n, '')
  }, [info.data, info.isError])
  return null
}
