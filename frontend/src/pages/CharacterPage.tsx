import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  CircleDot,
  Crown,
  Eye,
  Footprints,
  Gem,
  Hand,
  MapPin,
  Package,
  Pencil,
  Shield,
  Shirt,
  Sparkles,
  Store,
  Sword,
  Undo2,
  UsersRound,
  VenusAndMars,
  type LucideIcon,
} from 'lucide-react'
import { formatServicePrice, getClassName } from '../lib/lineage'
import { inventoryApi, isApiError, lineageApi } from '../services/api'
import type { ApiCharacterEquipmentItem } from '../services/domain/lineage.service'
import { ItemIcon } from '../components/ItemIcon'

interface EquipmentSlotDefinition {
  key: string
  label: string
  slotIds: number[]
  icon: LucideIcon
}

const EQUIPMENT_SLOTS: EquipmentSlotDefinition[] = [
  { key: 'left-ear', label: 'Brinco esquerdo', slotIds: [2], icon: Gem },
  { key: 'head', label: 'Elmo', slotIds: [6], icon: Crown },
  { key: 'right-ear', label: 'Brinco direito', slotIds: [1], icon: Gem },
  { key: 'neck', label: 'Colar', slotIds: [3], icon: Gem },
  { key: 'chest', label: 'Armadura', slotIds: [10], icon: Shirt },
  { key: 'cloak', label: 'Capa', slotIds: [13], icon: Sparkles },
  { key: 'left-ring', label: 'Anel esquerdo', slotIds: [5], icon: CircleDot },
  { key: 'gloves', label: 'Luvas', slotIds: [9], icon: Hand },
  { key: 'right-ring', label: 'Anel direito', slotIds: [4], icon: CircleDot },
  { key: 'weapon', label: 'Arma', slotIds: [14, 7], icon: Sword },
  { key: 'legs', label: 'Calças', slotIds: [11], icon: Shirt },
  { key: 'offhand', label: 'Mão secundária', slotIds: [8], icon: Shield },
  { key: 'feet', label: 'Botas', slotIds: [12], icon: Footprints },
]

const DISPLAYED_EQUIPMENT_SLOTS = new Set(EQUIPMENT_SLOTS.flatMap((slot) => slot.slotIds))

function EquipmentSlot({ definition, item }: { definition: EquipmentSlotDefinition; item?: ApiCharacterEquipmentItem }) {
  const Icon = definition.icon
  return (
    <article
      className={`character-equipment-slot equipment-slot-${definition.key} ${item ? 'is-filled' : ''}`}
      aria-label={`${definition.label}: ${item ? item.name : 'vazio'}`}
    >
      <span className="character-equipment-slot-label">{definition.label}</span>
      {item ? <ItemIcon itemId={item.item_id} name={item.name} size={32} /> : <Icon aria-hidden="true" />}
      <span className="character-equipment-slot-copy">
        <strong>{item?.name || 'Vazio'}</strong>
        {item ? (
          <small>
            ID {item.item_id}{item.enchant > 0 ? ` · +${item.enchant}` : ''}
          </small>
        ) : (
          <small>Sem item equipado</small>
        )}
      </span>
    </article>
  )
}

export function CharacterPage() {
  const { login = '', charId = '' } = useParams()
  const queryClient = useQueryClient()
  const id = Number(charId)
  const characters = useQuery({
    queryKey: ['characters', login],
    queryFn: () => lineageApi.characters(login),
    enabled: Boolean(login),
  })
  const prices = useQuery({ queryKey: ['service-prices'], queryFn: lineageApi.servicePrices })
  const equipment = useQuery({
    queryKey: ['character-equipment', login, id],
    queryFn: () => inventoryApi.equipment(id, login),
    enabled: Boolean(login) && Number.isFinite(id) && id > 0,
  })
  const [nickname, setNickname] = useState('')
  const [sex, setSex] = useState<'M' | 'F' | ''>('')
  const [submitting, setSubmitting] = useState<'nick' | 'sex' | 'unstuck' | null>(null)
  const char = (characters.data ?? []).find((item) => Number(item.char_id) === id)
  const missing = characters.isSuccess && Number.isFinite(id) && !char
  const offline = Boolean(char && !char.online)
  const equippedItems = equipment.data ?? []
  const additionalEquipment = equippedItems.filter((item) => !DISPLAYED_EQUIPMENT_SLOTS.has(item.slot))

  async function refreshCharacter() {
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

      {characters.isLoading ? <div className="card account-empty-state">Carregando personagem...</div> : null}
      {characters.isError ? (
        <div className="card account-empty-state">
          <UsersRound aria-hidden="true" />
          <strong>Não foi possível abrir o personagem</strong>
          <span>{isApiError(characters.error) ? characters.error.message : 'Volte para a conta e tente novamente.'}</span>
        </div>
      ) : null}
      {missing ? (
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

          <section className="card character-equipment">
            <div className="account-section-heading">
              <div>
                <span className="panel-eyebrow">Itens do personagem</span>
                <h2>Equipamentos</h2>
              </div>
              <span className="character-readonly-chip">
                <Eye aria-hidden="true" />
                Somente leitura
              </span>
            </div>

            <div className="character-equipment-summary">
              <Package aria-hidden="true" />
              <strong>{equippedItems.length}</strong>
              <span>{equippedItems.length === 1 ? 'item equipado' : 'itens equipados'}</span>
            </div>

            {equipment.isLoading ? <div className="character-equipment-message">Carregando equipamentos...</div> : null}
            {equipment.isError ? (
              <div className="character-equipment-message is-error">
                Não foi possível consultar os equipamentos deste personagem.
              </div>
            ) : null}

            {!equipment.isLoading && !equipment.isError ? (
              <div className="character-paperdoll" aria-label="Equipamentos atuais do personagem">
                {EQUIPMENT_SLOTS.map((definition) => (
                  <EquipmentSlot
                    key={definition.key}
                    definition={definition}
                    item={equippedItems.find((item) => definition.slotIds.includes(item.slot))}
                  />
                ))}
              </div>
            ) : null}

            {additionalEquipment.length ? (
              <div className="character-equipment-additional">
                <span>Outros slots equipados</span>
                <div>
                  {additionalEquipment.map((item) => (
                    <article key={`${item.slot}-${item.item_id}`}>
                      <ItemIcon itemId={item.item_id} name={item.name} size={28} />
                      <span>
                        <strong>{item.name}</strong>
                        <small>Slot {item.slot} · ID {item.item_id}{item.enchant > 0 ? ` · +${item.enchant}` : ''}</small>
                      </span>
                    </article>
                  ))}
                </div>
              </div>
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
