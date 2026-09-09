import { Card } from '../../ui/Card'
import { useQuery } from '@tanstack/react-query'
import { programsApi } from '../../../services/api'
import {
  Empty,
  ErrorNotice,
  Loading,
} from '../../programs/ProgramUI'
import { useProgramAction } from '../../programs/useProgramAction'
import { AdminHeader } from '../../../pages/admin/AdminChrome'

export function AdminResourcesSection() {
  const query = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
  })
  const action = useProgramAction()
  const categories = [...new Set(query.data?.map((r) => r.category))]
  return (
    <div className="program-page">
      <AdminHeader
        kicker="Sistema"
        title="Controle de recursos"
        description="Defina quais módulos ficam disponíveis. A desativação bloqueia as telas e a API; o acesso administrativo é preservado."
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
                        ? 'Disponível aos jogadores'
                        : 'Temporariamente desativado'}
                    </small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.enabled}
                    aria-label={`${r.enabled ? 'Desativar' : 'Ativar'} ${r.name}`}
                    disabled={action.busy}
                    className="program-switch"
                    onClick={() =>
                      void action.run(
                        () => programsApi.toggleResource(r.id, !r.enabled),
                        r.enabled ? 'Recurso desativado.' : 'Recurso ativado.',
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
