import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { friendsApi, isApiError } from '../services/api'

export function FriendsPage() {
  const queryClient = useQueryClient()
  const state = useQuery({ queryKey: ['friends'], queryFn: friendsApi.list })
  const [search, setSearch] = useState('')
  const [peer, setPeer] = useState('')
  const [text, setText] = useState('')
  const found = useQuery({
    queryKey: ['friends-search', search],
    queryFn: () => friendsApi.search(search),
    enabled: search.trim().length >= 2,
  })
  const thread = useQuery({
    queryKey: ['chat', peer],
    queryFn: () => friendsApi.messages(peer),
    enabled: Boolean(peer),
  })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['friends'] })
    await queryClient.invalidateQueries({ queryKey: ['chat'] })
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  async function add(username: string) {
    try {
      await friendsApi.request(username)
      toast.success('Pedido enviado')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível enviar')
    }
  }

  async function act(id: string, action: 'accept' | 'reject' | 'cancel' | 'remove') {
    try {
      await friendsApi.action(id, action)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha na ação')
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    try {
      await friendsApi.send(peer, text)
      setText('')
      await queryClient.invalidateQueries({ queryKey: ['chat', peer] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível enviar')
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Amigos</h1>
        <label className="field">
          Buscar jogador
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        {(found.data ?? []).map((user) => (
          <p key={user.id}>
            {user.username}{' '}
            <button className="btn" type="button" onClick={() => void add(user.username)}>
              Adicionar
            </button>
          </p>
        ))}
        <h2>Pendentes</h2>
        {(state.data?.incoming ?? []).map((row) => (
          <p key={row.id}>
            {row.username}{' '}
            <button className="btn" type="button" onClick={() => void act(row.id, 'accept')}>
              Aceitar
            </button>{' '}
            <button className="btn ghost" type="button" onClick={() => void act(row.id, 'reject')}>
              Recusar
            </button>
          </p>
        ))}
        {(state.data?.outgoing ?? []).map((row) => (
          <p key={row.id}>
            Enviado para {row.username}{' '}
            <button className="btn ghost" type="button" onClick={() => void act(row.id, 'cancel')}>
              Cancelar
            </button>
          </p>
        ))}
        <h2>Lista</h2>
        {(state.data?.friends ?? []).map((row) => (
          <p key={row.id}>
            <button className="btn ghost" type="button" onClick={() => setPeer(row.username)}>
              {row.username}
            </button>{' '}
            <button className="btn ghost" type="button" onClick={() => void act(row.id, 'remove')}>
              Remover
            </button>
          </p>
        ))}
      </section>
      <section className="card">
        <h2>Chat {peer ? `com ${peer}` : ''}</h2>
        {!peer && <p className="muted">Escolha um amigo para conversar.</p>}
        {(thread.data ?? []).map((msg) => (
          <p key={msg.id}>
            <strong>{msg.sender}:</strong> {msg.text}
          </p>
        ))}
        {peer ? (
          <form onSubmit={send}>
            <label className="field">
              Mensagem
              <input value={text} onChange={(event) => setText(event.target.value)} required />
            </label>
            <button className="btn" type="submit">
              Enviar
            </button>
          </form>
        ) : null}
      </section>
    </div>
  )
}
