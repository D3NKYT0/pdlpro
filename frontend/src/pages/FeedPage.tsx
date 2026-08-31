import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, socialApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function PostThread({ postId }: { postId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const comments = useQuery({ queryKey: ['comments', postId], queryFn: () => socialApi.comments(postId) })
  const [body, setBody] = useState('')

  async function send(event: FormEvent) {
    event.preventDefault()
    try {
      await socialApi.comment(postId, body)
      setBody('')
      await queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível comentar')
    }
  }

  return (
    <div>
      {(comments.data ?? []).map((row) => (
        <p key={row.id} className="muted">
          <strong>{row.author_username}</strong>: {row.body}
        </p>
      ))}
      {user ? (
        <form onSubmit={send}>
          <label className="field">
            Comentário
            <input value={body} onChange={(event) => setBody(event.target.value)} maxLength={500} required />
          </label>
          <button className="btn" type="submit">
            Comentar
          </button>
        </form>
      ) : null}
    </div>
  )
}

export function FeedPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const feed = useQuery({ queryKey: ['feed'], queryFn: socialApi.feed })
  const [body, setBody] = useState('')
  const [openComments, setOpenComments] = useState<string | null>(null)

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

  async function like(postId: string) {
    try {
      await socialApi.like(postId)
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível curtir')
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
          <p>
            {user ? (
              <button className="btn ghost" type="button" onClick={() => void like(post.id)}>
                {post.liked ? 'Descurtir' : 'Curtir'} ({post.likes_count ?? 0})
              </button>
            ) : (
              <span className="muted">{post.likes_count ?? 0} curtidas</span>
            )}{' '}
            <button
              className="btn ghost"
              type="button"
              onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
            >
              Comentários ({post.comments_count ?? 0})
            </button>
          </p>
          {openComments === post.id ? <PostThread postId={post.id} /> : null}
        </article>
      ))}
      {!feed.data?.length && <p className="muted">Nenhuma publicação ainda.</p>}
    </section>
  )
}
