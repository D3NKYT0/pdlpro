import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { RichTextEditor } from '../../ui/RichText'
import { isRichTextEmpty } from '../../../lib/rich-text'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  programsApi,
  type RoadmapEntry,
} from '../../../services/api'
import {
  Empty,
  ErrorNotice,
  Loading,
  Status,
} from '../../programs/ProgramUI'
import { useProgramAction } from '../../programs/useProgramAction'
import { AdminHeader } from '../../../pages/admin/AdminChrome'
import toast from 'react-hot-toast'

export function AdminRoadmapSection() {
  const query = useQuery({
    queryKey: ['staff-roadmap'],
    queryFn: () => programsApi.roadmap(true),
  })
  const action = useProgramAction()
  const [edit, setEdit] = useState<Partial<RoadmapEntry> | null>(null)
  const [remove, setRemove] = useState<string | null>(null)
  return (
    <div className="program-page">
      <AdminHeader
        kicker="Conteúdo"
        title="Gerenciar roadmap"
        description="Organize os próximos passos e mantenha a comunidade informada."
      />
      <ErrorNotice error={query.error || action.error} />
      <div className="program-actions">
        <Button type="submit"

          onClick={() =>
            setEdit({ status: 'planned', progress: 0, published: true })
          }
        >
          <Plus size={18} />
          Nova atualização
        </Button>
      </div>
      {edit && (
        <Card className="program-section">
          <h2>{edit.id ? 'Editar atualização' : 'Nova atualização'}</h2>
          <form
            key={edit.id || 'new'}
            className="program-form"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const description = edit.description || ''
              if (isRichTextEmpty(description)) {
                toast.error('Informe a descrição da atualização')
                return
              }
              void action
                .run(
                  () =>
                    programsApi.saveRoadmap(
                      {
                        title: String(f.get('title')),
                        description,
                        category: String(f.get('category')),
                        status: String(f.get('status')),
                        progress: Number(f.get('progress')),
                        target_date: String(f.get('target_date')) || null,
                        published: f.has('published'),
                        order: Number(f.get('order')),
                      },
                      edit.id,
                    ),
                  'Atualização salva.',
                  [['staff-roadmap'], ['roadmap']],
                )
                .then((ok) => {
                  if (ok) setEdit(null)
                })
            }}
          >
            <label>
              Título
              <input
                name="title"
                required
                maxLength={160}
                defaultValue={edit.title}
              />
            </label>
            <label>
              Descrição
              <RichTextEditor
                value={edit.description || ''}
                onChange={(html) =>
                  setEdit((current) =>
                    current ? { ...current, description: html } : current,
                  )
                }
                required
                aria-label="Descrição"
              />
            </label>
            <div className="program-fields">
              <label>
                Categoria
                <input
                  name="category"
                  required
                  maxLength={60}
                  defaultValue={edit.category || 'Servidor'}
                />
              </label>
              <label>
                Etapa
                <select name="status" defaultValue={edit.status}>
                  <option value="planned">Planejado</option>
                  <option value="progress">Em andamento</option>
                  <option value="completed">Concluído</option>
                </select>
              </label>
              <label>
                Progresso (%)
                <input
                  name="progress"
                  type="number"
                  min={0}
                  max={100}
                  required
                  defaultValue={edit.progress}
                />
              </label>
              <label>
                Previsão
                <input
                  name="target_date"
                  type="date"
                  defaultValue={edit.target_date || ''}
                />
              </label>
              <label>
                Ordem
                <input
                  name="order"
                  type="number"
                  min={0}
                  defaultValue={edit.order || 0}
                />
              </label>
            </div>
            <label className="program-check">
              <input
                name="published"
                type="checkbox"
                defaultChecked={edit.published}
              />
              Publicar no site
            </label>
            <div className="program-actions">
              <Button type="submit" disabled={action.busy}>
                Salvar atualização
              </Button>
              <Button
                className="ghost"
                type="button"
                onClick={() => setEdit(null)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
      {query.isPending && <Loading />}
      <div className="program-grid">
        {query.data?.map((r) => (
          <Card as="article" className="program-section" key={r.id}>
            <Status value={r.status} />
            <h2>{r.title}</h2>
            <p className="muted">
              {r.category} · {r.progress}% ·{' '}
              {r.published ? 'Publicado' : 'Rascunho'}
            </p>
            <div className="program-actions">
              <Button type="submit" className="ghost" onClick={() => setEdit(r)}>
                <Pencil size={16} />
                Editar
              </Button>
              {remove === r.id ? (
                <>
                  <Button type="submit"

                    disabled={action.busy}
                    onClick={() =>
                      void action
                        .run(
                          () => programsApi.deleteRoadmap(r.id),
                          'Atualização removida.',
                          [['staff-roadmap'], ['roadmap']],
                        )
                        .then(() => setRemove(null))
                    }
                  >
                    Confirmar exclusão
                  </Button>
                  <Button type="submit" className="ghost" onClick={() => setRemove(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button type="submit"
                  className="ghost"
                  onClick={() => setRemove(r.id)}
                  aria-label={`Excluir ${r.title}`}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {query.data?.length === 0 && (
        <Empty>Crie a primeira atualização do roadmap.</Empty>
      )}
    </div>
  )
}
