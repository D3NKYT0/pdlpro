import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, socialApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export function FeedPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const feed = useQuery({ queryKey: ['feed'], queryFn: socialApi.feed })
  const [body, setBody] = useState('')

  async function publish(event: FormEvent) {
    event.preventDefault()
    try {
      await socialApi.create(body)
      toast.success('Publicado')
      setBody('')
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível publicar')
    }
  }

  return (
    <section className="card">
      <h1>Feed</h1>
      {user ? (
        <form onSubmit={publish}>
          <label className="field">
            Nova publicação
            <input value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} required />
          </label>
          <button className="btn" type="submit">
            Publicar
          </button>
        </form>
      ) : (
        <p className="muted">Entre para publicar.</p>
      )}
      {(feed.data ?? []).map((post) => (
        <article className="card" key={post.id}>
          <strong>{post.author_username}</strong>
          <p>{post.body}</p>
          <p className="muted">{post.created_at}</p>
        </article>
      ))}
      {!feed.data?.length && <p className="muted">Nenhuma publicação ainda.</p>}
    </section>
  )
}
