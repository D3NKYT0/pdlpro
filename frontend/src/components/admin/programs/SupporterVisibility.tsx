import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { programsApi } from '../../../services/api'
import { Card } from '../../ui/Card'
import { Toggle } from '../../ui/Toggle'
import { ErrorNotice, LoadingState } from '../../ui/Feedback'
import { useProgramAction } from '../../programs/useProgramAction'
import { ResourceChildren } from './ResourceChildren'

/** Permite controlar o programa e seus filhos sem alterar candidaturas ou comissões. */
export function SupporterVisibility() {
  const { t } = useTranslation('admin')
  const query = useQuery({ queryKey: ['resources'], queryFn: programsApi.resources })
  const action = useProgramAction()
  const parent = query.data?.find(row => row.code === 'supporters')
  const toggle = (row: NonNullable<typeof parent>, enabled: boolean) => {
    void action.run(() => programsApi.toggleResource(row.id, enabled), t('supporters.visibilitySaved'),
      [['resources'], ['public-supporters']])
  }
  return <Card className="program-section">
    <h2>{t('supporters.visibilityTitle')}</h2>
    <p>{t('supporters.visibilityDescription')}</p>
    <ErrorNotice error={query.error || action.error} />
    {query.isPending && <LoadingState>{t('supporters.visibilityLoading')}</LoadingState>}
    {parent && <>
      <Toggle label={t('supporters.programEnabled')} checked={parent.enabled} busy={action.busy}
        onChange={event => toggle(parent, event.target.checked)} />
      <ResourceChildren rows={query.data ?? []} parent={parent} updating={action.busy ? parent.id : null} onToggle={toggle} />
    </>}
  </Card>
}
