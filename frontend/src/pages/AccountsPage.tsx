import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, lineageApi } from '../services/api'

export function AccountsPage() {
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['lineage-accounts'], queryFn: lineageApi.accounts })
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const selectedLogin = accounts.data?.accounts[0]?.login

  const characters = useQuery({
    queryKey: ['characters', selectedLogin],
    queryFn: () => lineageApi.characters(selectedLogin),
    enabled: Boolean(selectedLogin),
  })

  async function onRegister(event: FormEvent) {
    event.preventDefault()
    try {
      await lineageApi.register(registerPassword)
      toast.success('Conta Lineage criada e vinculada')
      await queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao registrar')
    }
  }

  async function onLink(event: FormEvent) {
    event.preventDefault()
    try {
      await lineageApi.link(login, password)
      toast.success('Conta vinculada')
      await queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao vincular')
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Conta Lineage</h1>
        <p className="muted">
          Slots: {accounts.data?.slots.used ?? 0}/{accounts.data?.slots.total ?? 0}
        </p>
        {(accounts.data?.accounts ?? []).map((item) => (
          <p key={item.login}>
            {item.login} {item.is_primary ? '(principal)' : ''}
          </p>
        ))}
        <form onSubmit={onRegister}>
          <h3>Criar conta com seu nick</h3>
          <label className="field">
            Senha do jogo
            <input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required minLength={6} />
          </label>
          <button className="btn" type="submit">
            Registrar
          </button>
        </form>
        <form onSubmit={onLink}>
          <h3>Vincular conta existente</h3>
          <label className="field">
            Login
            <input value={login} onChange={(e) => setLogin(e.target.value)} required />
          </label>
          <label className="field">
            Senha
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn" type="submit">
            Vincular
          </button>
        </form>
      </section>
      <section className="card">
        <h2>Personagens</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Lv</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(characters.data ?? []).map((char) => (
              <tr key={char.char_id}>
                <td>{char.name}</td>
                <td>{char.level}</td>
                <td>{char.online ? 'Online' : 'Offline'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!characters.data?.length && <p className="muted">Nenhum personagem. Com o banco Lineage ligado, eles aparecem aqui.</p>}
      </section>
    </div>
  )
}
