import { Card } from '../../ui/Card'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { programsApi } from '../../../services/api'
import {
  ErrorNotice,
  Loading,
} from '../../programs/ProgramUI'
import { useProgramAction } from '../../programs/useProgramAction'
import { AdminHeader } from '../../../pages/admin/AdminChrome'

export function AdminResourcesSection() {
  const { t } = useTranslation('admin')
  const query = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
  })
  const action = useProgramAction()
  const categories = [...new Set(query.data?.map((r) => r.category))]
  return (
    <div className="program-page">
      <AdminHeader
        kicker={t('resources.kicker')}
        title={t('resources.title')}
        description={t('resources.description')}
      />
      <ErrorNotice error={query.error || action.error} />
      {query.isPending && <Loading />}
      {categories.map((category) => (
        <Card className="program-section" key={category}>
          <h2>{category}</h2>
          <div className="program-grid">
            {query.data
              ?.filter((r) => r.category === category)
              .map((r) => (
                <article className="program-item program-resource" key={r.id}>
                  <div>
                    <h3>{r.name}</h3>
                    <p>{r.description}</p>
                    <small>
                      {r.enabled
                        ? t('resources.available')
                        : t('resources.unavailable')}
                    </small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.enabled}
                    aria-label={t(r.enabled ? 'resources.disable' : 'resources.enable', { name: r.name })}
                    disabled={action.busy}
                    className="program-switch"
                    onClick={() =>
                      void action.run(
                        () => programsApi.toggleResource(r.id, !r.enabled),
                        r.enabled ? t('resources.disabled') : t('resources.enabled'),
                        [['resources']],
                      )
                    }
                  >
                    <span />
                  </button>
                </article>
              ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
