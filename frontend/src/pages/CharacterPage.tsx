import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Crown,
  MapPin,
  Package,
  Pencil,
  Shield,
  Store,
  Undo2,
  UsersRound,
  VenusAndMars,
} from 'lucide-react'
import { formatServicePrice, getClassName } from '../lib/lineage'
import { isApiError, lineageApi } from '../services/api'

export function CharacterPage() {
  const { login = '', charId = '' } = useParams()
  const queryClient = useQueryClient()
  const id = Number(charId)
  const character = useQuery({
    queryKey: ['character', login, id],
    queryFn: () => lineageApi.character(login, id),
    enabled: Boolean(login) && Number.isFinite(id),
  })
  const prices = useQuery({ queryKey: ['service-prices'], queryFn: lineageApi.servicePrices })
  const [nickname, setNickname] = useState('')
  const [sex, setSex] = useState<'M' | 'F' | ''>('')
  const [submitting, setSubmitting] = useState<'nick' | 'sex' | 'unstuck' | null>(null)
  const char = character.data
  const offline = Boolean(char && !char.online)

  async function refreshCharacter() {
    await queryClient.invalidateQueries({ queryKey: ['character', login, id] })
    await queryClient.invalidateQueries({ queryKey: ['characters', login] })
  }

  async function onChangeNickname(event: FormEvent) {
    event.preventDefault()
    setSubmitting('nick')
    try {
      await lineageApi.changeNickname(login, id, nickname)
      toast.success('Nickname alterado')
      setNickname('')
      await refreshCharacter()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível alterar o nickname')
    } finally {
      setSubmitting(null)
    }
  }

  async function onChangeSex(event: FormEvent) {
    event.preventDefault()
    if (sex !== 'M' && sex !== 'F') return
    setSubmitting('sex')
    try {
      await lineageApi.changeSex(login, id, sex)
      toast.success('Sexo alterado')
      await refreshCharacter()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível alterar o sexo')
    } finally {
      setSubmitting(null)
    }
  }

  async function onUnstuck() {
    setSubmitting('unstuck')
    try {
      await lineageApi.unstuck(login, id)
      toast.success('Personagem destravado')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível destravar')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="account-page character-page">
      <header className="card account-hero">
        <div>
          <Link className="character-back" to="/painel/accounts">
            <ArrowLeft aria-hidden="true" />
            Contas
          </Link>
          <span className="panel-eyebrow">Ficha do personagem</span>
          <h1>{char?.name ?? 'Personagem'}</h1>
          <p className="muted">
            {login} · {getClassName(char?.class_id)} · Nv. {char?.level ?? '—'}
          </p>
        </div>
        {char ? (
          <span className={`account-status-pill ${char.online ? 'is-active' : ''}`}>
            {char.online ? 'Online' : 'Offline'}
          </span>
        ) : null}
      </header>

      {character.isLoading ? <div className="card account-empty-state">Carregando personagem...</div> : null}
      {character.isError ? (
        <div className="card account-empty-state">
          <UsersRound aria-hidden="true" />
          <strong>Personagem não encontrado</strong>
          <span>Volte para a conta e escolha outro personagem.</span>
        </div>
      ) : null}

      {char ? (
        <>
          <section className="card character-sheet">
            <div className="account-section-heading">
              <div>
                <span className="panel-eyebrow">Informações</span>
                <h2>{char.name}</h2>
              </div>
              {char.is_clan_leader ? (
                <span className="account-login-chip">
                  <Crown aria-hidden="true" />
                  Líder de clã
                </span>
              ) : null}
            </div>
            <dl className="character-stats">
              <div>
                <dt>Título</dt>
                <dd>{char.title || '—'}</dd>
              </div>
              <div>
                <dt>Nível</dt>
                <dd>{char.level}</dd>
              </div>
              <div>
                <dt>Classe base</dt>
                <dd>{getClassName(char.class_id)}</dd>
              </div>
              <div>
                <dt>Sexo</dt>
                <dd>{char.sex === 1 ? 'Feminino' : 'Masculino'}</dd>
              </div>
              <div>
                <dt>Online</dt>
                <dd>{char.online ? 'Sim' : 'Não'}</dd>
              </div>
              <div>
                <dt>Clã</dt>
                <dd>{char.clan_name || '—'}</dd>
              </div>
              <div>
                <dt>PvP</dt>
                <dd>{char.pvp}</dd>
              </div>
              <div>
                <dt>PK</dt>
                <dd>{char.pk}</dd>
              </div>
            </dl>
            {!offline ? (
              <p className="character-offline-hint">O personagem precisa estar offline para usar os serviços.</p>
            ) : null}
          </section>

          <div className="grid cols-2 character-services">
            <section className="card">
              <div className="account-form-title">
                <Pencil aria-hidden="true" />
                <div>
                  <h3>Alterar nickname</h3>
                  <p>2 a 16 letras ou números. Custa {formatServicePrice(prices.data?.CHANGE_NICKNAME)}.</p>
                </div>
              </div>
              <form className="account-action-form" onSubmit={onChangeNickname}>
                <label className="field">
                  Novo nickname
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    minLength={2}
                    maxLength={16}
                    required
                    disabled={!offline}
                  />
                </label>
                <button className="btn" type="submit" disabled={!offline || submitting !== null}>
                  {submitting === 'nick' ? 'Alterando...' : 'Alterar nickname'}
                </button>
              </form>
            </section>

            <section className="card">
              <div className="account-form-title">
                <VenusAndMars aria-hidden="true" />
                <div>
                  <h3>Alterar sexo</h3>
                  <p>Troca permanente. Custa {formatServicePrice(prices.data?.CHANGE_SEX)}.</p>
                </div>
              </div>
              <form className="account-action-form" onSubmit={onChangeSex}>
                <label className="field">
                  Novo sexo
                  <select value={sex} onChange={(event) => setSex(event.target.value as 'M' | 'F' | '')} required disabled={!offline}>
                    <option value="">Selecione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </label>
                <button className="btn" type="submit" disabled={!offline || submitting !== null}>
                  {submitting === 'sex' ? 'Alterando...' : 'Alterar sexo'}
                </button>
              </form>
            </section>

            <section className="card">
              <div className="account-form-title">
                <Undo2 aria-hidden="true" />
                <div>
                  <h3>Destravar</h3>
                  <p>Teleporta para um local seguro. {formatServicePrice(prices.data?.UNSTUCK)}.</p>
                </div>
              </div>
              <p className="muted">Use se o personagem travou ou caiu em um lugar inacessível.</p>
              <button className="btn" type="button" onClick={() => void onUnstuck()} disabled={!offline || submitting !== null}>
                {submitting === 'unstuck' ? 'Destravando...' : 'Destravar personagem'}
              </button>
            </section>

            <section className="card character-shortcuts">
              <div className="account-form-title">
                <MapPin aria-hidden="true" />
                <div>
                  <h3>Atalhos</h3>
                  <p>Mesmos destinos do painel antigo.</p>
                </div>
              </div>
              <div className="character-shortcut-list">
                <Link className="btn ghost" to="/painel/inventory">
                  <Package aria-hidden="true" />
                  Inventário
                </Link>
                <Link className="btn ghost" to="/painel/marketplace">
                  <Store aria-hidden="true" />
                  Marketplace
                </Link>
                {char.is_clan_leader ? (
                  <Link className="btn ghost" to="/painel/clans">
                    <Shield aria-hidden="true" />
                    Painel do clã
                  </Link>
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  )
}
