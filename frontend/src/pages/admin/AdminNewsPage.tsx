import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, staffApi } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

export function AdminNewsPage() {
  const queryClient = useQueryClient()
  const news = useQuery({ queryKey: ['staff-news'], queryFn: staffApi.news })
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [published, setPublished] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await staffApi.saveNews({
        id: editing || undefined,
        title,
        excerpt,
        body,
        is_published: published,
      })
      toast.success(editing ? 'Notícia atualizada' : 'Notícia criada')
      setTitle('')
      setExcerpt('')
      setBody('')
      setPublished(true)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['staff-news'] })
      await queryClient.invalidateQueries({ queryKey: ['news'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker="Conteúdo" title="Notícias" description="Avisos publicados na home e na página de news." />
      <form className="card admin-form" onSubmit={onSubmit}>
        <label className="field">Título<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label className="field">Resumo<input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></label>
        <label className="field">Conteúdo<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} required /></label>
        <label className="admin-check">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Publicar agora
        </label>
        <AdminSaveBar saving={saving} label={editing ? 'Atualizar notícia' : 'Publicar notícia'} />
      </form>
      <section className="card">
        {(news.data ?? []).map((item) => (
          <div className="admin-service-row" key={item.id}>
            <strong>{item.title}</strong>
            <span className="muted">{item.is_published ? 'Publicada' : 'Rascunho'}</span>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setEditing(item.id)
                setTitle(item.title)
                setExcerpt(item.excerpt)
                setBody(item.body)
                setPublished(item.is_published)
              }}
            >
              Editar
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
