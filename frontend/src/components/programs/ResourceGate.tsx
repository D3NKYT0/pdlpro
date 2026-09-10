import { Card } from '../ui/Card'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { programsApi } from '../../services/api'
import { Empty, ErrorNotice, Loading } from './ProgramUI'

export function ResourceGate({
  code,
  children,
}: {
  code: string
  children: ReactNode
}) {
  const { t } = useTranslation('public')
  const query = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
    refetchInterval: 30000,
  })
  if (query.isPending) return <Loading />
  if (query.error) return <ErrorNotice error={query.error} />
  if (query.data?.some((r) => r.code === code && !r.enabled))
    return (
      <Card className="program-section program-page">
        <h1>{t('resourceGate.title')}</h1>
        <Empty>{t('resourceGate.body')}</Empty>
      </Card>
    )
  return <>{children}</>
}
