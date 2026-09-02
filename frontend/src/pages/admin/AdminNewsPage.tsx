import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FilePenLine, Newspaper, PencilLine, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

export function AdminNewsPage() {
  const queryClient = useQueryClient()
  const news = useQuery({ queryKey: ['staff-news'], queryFn: staffApi.news })
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [published, setPublished] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const action = useFeedbackAction()
  const saving = action.pending

  function resetEditor() {
    setTitle('')
    setExcerpt('')
    setBody('')
    setPublished(true)
    setEditing(null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await staffApi.saveNews({
        id: editing || undefined,
        title,
        excerpt,
        body,
        is_published: published,
      })
      toast.success(editing ? 'Notícia atualizada' : 'Notícia criada')
      resetEditor()
      await queryClient.invalidateQueries({ queryKey: ['staff-news'] })
      await queryClient.invalidateQueries({ queryKey: ['news'] })
    }, 'Não foi possível salvar')
  }

  return (
    <div className="account-page">
      <AdminHeader kicker="Conteúdo" title="Notícias" description="Avisos publicados na home e na página de news." />
      <form className="admin-news-editor" onSubmit={onSubmit}>
        <Card className="admin-config-section">
          <header>
            <span><FilePenLine /></span>
            <div><span className="panel-eyebrow">{editing ? 'Edição' : 'Nova publicação'}</span><h2>{editing ? 'Editar notícia' : 'Escrever notícia'}</h2><p>Prepare o título, a chamada e o conteúdo que aparecerão para os jogadores.</p></div>
          </header>
          <Field>Título <small>{title.length}/120</small><input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field>Resumo <small>{excerpt.length}/240</small><input maxLength={240} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></Field>
          <Field>Conteúdo<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} required /></Field>
        </Card>

        <Card as="aside" className="admin-news-publish">
          <header><span><Send /></span><div><span className="panel-eyebrow">Publicação</span><h2>Status e envio</h2></div></header>
          <label className="admin-toggle">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span className="admin-toggle-control" aria-hidden="true"><i /></span>
            <span><strong>{published ? 'Publicar agora' : 'Salvar como rascunho'}</strong><small>{published ? 'Visível assim que for salva.' : 'Somente a equipe poderá visualizar.'}</small></span>
            <b>{published ? 'Público' : 'Rascunho'}</b>
          </label>
          <div className="admin-news-checklist">
            <span><small>Título</small><b>{title.trim() ? 'Pronto' : 'Pendente'}</b></span>
            <span><small>Conteúdo</small><b>{body.trim() ? 'Pronto' : 'Pendente'}</b></span>
          </div>
          <AdminSaveBar saving={saving} label={editing ? 'Atualizar notícia' : published ? 'Publicar notícia' : 'Salvar rascunho'} />
          {editing ? <Button className="ghost" type="button" onClick={resetEditor}>Cancelar edição</Button> : null}
        </Card>
      </form>
      <Card className="admin-news-library">
        <header className="admin-services-heading">
          <span><Newspaper /></span>
          <div><span className="panel-eyebrow">Biblioteca</span><h2>Notícias cadastradas</h2><p>Revise publicações e continue trabalhando nos rascunhos.</p></div>
          <div className="admin-services-summary"><strong>{(news.data ?? []).length}</strong><small>no total</small></div>
        </header>
        {(news.data ?? []).length ? <div className="admin-news-list">{(news.data ?? []).map((item) => (
          <article className="admin-news-item" key={item.id}>
            <span><Newspaper /></span>
            <div><div><h3>{item.title}</h3><b className={item.is_published ? 'is-published' : ''}>{item.is_published ? 'Publicada' : 'Rascunho'}</b></div><p>{item.excerpt || 'Sem resumo cadastrado.'}</p></div>
            <Button className="ghost" type="button" onClick={() => {
              setEditing(item.id)
              setTitle(item.title)
              setExcerpt(item.excerpt)
              setBody(item.body)
              setPublished(item.is_published)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}><PencilLine /> Editar</Button>
          </article>
        ))}</div> : <div className="account-empty-state"><Newspaper /><strong>Nenhuma notícia cadastrada</strong><span>Use o editor acima para criar a primeira publicação.</span></div>}
      </Card>
    </div>
  )
}
