import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { clansApi, isApiError } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export function ClansPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const clans = useQuery({ queryKey: ['clans'], queryFn: clansApi.list })
  const mine = useQuery({
    queryKey: ['clan-apps'],
    queryFn: clansApi.mine,
    enabled: Boolean(user),
  })
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [charName, setCharName] = useState('')
  const owned = (clans.data ?? []).filter((clan) => clan.owner_username === user?.username)
  const inbox = useQuery({
    queryKey: ['clan-inbox', owned[0]?.id],
    queryFn: () => clansApi.inbox(owned[0].id),
    enabled: Boolean(owned[0]?.id),
  })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['clans'] })
    await queryClient.invalidateQueries({ queryKey: ['clan-apps'] })
    await queryClient.invalidateQueries({ queryKey: ['clan-inbox'] })
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    try {
      await clansApi.create({ name, description, focus: 'MIXED' })
      toast.success('Clã criado')
      setName('')
      setDescription('')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível criar')
    }
  }

  async function apply(clanId: string) {
    try {
      await clansApi.apply(clanId, { char_name: charName, message: 'Quero entrar' })
      toast.success('Inscrição enviada')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível se inscrever')
    }
  }

  async function review(id: string, status: 'approved' | 'rejected') {
    try {
      await clansApi.review(id, status)
      toast.success(status === 'approved' ? 'Aprovado' : 'Recusado')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao revisar')
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Clãs</h1>
        {(clans.data ?? []).map((clan) => (
          <article className="card" key={clan.id}>
            <h3>{clan.name}</h3>
            <p className="muted">
              {clan.focus} · líder {clan.owner_username} · {clan.recruiting ? 'recrutando' : 'fechado'}
            </p>
            <p>{clan.description || clan.motd}</p>
            {user && clan.owner_username !== user.username && clan.recruiting ? (
              <button className="btn" type="button" onClick={() => void apply(clan.id)}>
                Inscrever
              </button>
            ) : null}
          </article>
        ))}
        {!clans.data?.length && <p className="muted">Nenhum clã web cadastrado.</p>}
      </section>
      <section className="card">
        {user ? (
          <>
            <h2>Criar clã web</h2>
            <form onSubmit={create}>
              <label className="field">
                Nome
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label className="field">
                Descrição
                <input value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>
              <button className="btn" type="submit">
                Criar
              </button>
            </form>
            <label className="field">
              Personagem para inscrição
              <input value={charName} onChange={(event) => setCharName(event.target.value)} />
            </label>
            <h2>Minhas inscrições</h2>
            {(mine.data ?? []).map((row) => (
              <p key={row.id}>
                {row.clan_name} — {row.char_name} — {row.status}
              </p>
            ))}
            {owned.length ? (
              <>
                <h2>Inscrições recebidas</h2>
                {(inbox.data ?? []).map((row) => (
                  <p key={row.id}>
                    {row.username} ({row.char_name}) — {row.status}{' '}
                    {row.status === 'pending' ? (
                      <>
                        <button className="btn" type="button" onClick={() => void review(row.id, 'approved')}>
                          Aprovar
                        </button>{' '}
                        <button className="btn ghost" type="button" onClick={() => void review(row.id, 'rejected')}>
                          Recusar
                        </button>
                      </>
                    ) : null}
                  </p>
                ))}
              </>
            ) : null}
          </>
        ) : (
          <p className="muted">Entre para criar ou se inscrever em um clã.</p>
        )}
      </section>
    </div>
  )
}
