import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useResourceControls } from '../../contexts/ResourceControlsContext'
import { programsApi } from '../../services/api'
import { ButtonLink, ExternalButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'
import { ErrorNotice, LoadingState } from '../ui/Feedback'
import './publicSupporters.css'

/** Vitrine compartilhada entre os templates da landing; só publica cadastros aprovados. */
export function PublicSupporters() {
  const { t } = useTranslation('public')
  const enabled = useResourceControls()
  const visible = enabled('supporters') && enabled('supporters-public')
  const query = useQuery({ queryKey: ['public-supporters'], queryFn: programsApi.publicSupporters,
    enabled: visible, refetchInterval: 30000 })
  if (!visible) return null
  return <section className="public-supporters container" aria-labelledby="public-supporters-title" data-theme-part="supporters">
    <Card>
      <h2 id="public-supporters-title">{t('supporters.title')}</h2>
      <p>{t('supporters.description')}</p>
      {enabled('supporters-apply') && <>
        <ButtonLink to="/panel/supporters">{t('supporters.apply')}</ButtonLink>
        <p>{t('supporters.process')}</p>
      </>}
      {query.isPending && <LoadingState>{t('supporters.loading')}</LoadingState>}
      {query.isError && <ErrorNotice error={true} fallback={t('supporters.error')} />}
      {query.isSuccess && !query.data?.length && <p>{t('supporters.empty')}</p>}
      <div className="public-supporters-grid">
        {query.data?.map(row => <Card key={row.id}>
          {row.image && <img src={row.image} alt="" loading="lazy" width="80" height="80" />}
          <h3>{row.name}</h3>
          {/^https?:\/\//i.test(row.channel_url) && <ExternalButtonLink href={row.channel_url} target="_blank" rel="noreferrer">{t('supporters.channel', { name: row.name })}</ExternalButtonLink>}
        </Card>)}
      </div>
    </Card>
  </section>
}
