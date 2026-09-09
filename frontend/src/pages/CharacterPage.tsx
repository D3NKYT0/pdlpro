import { useAsyncAction } from '../hooks/useAsyncAction'
import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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
import type { ApiCharacterEquipmentItem } from '../services/api'
import { ItemIcon } from '../components/ItemIcon'

interface EquipmentSlotDefinition {
  key: string
  labelKey: string
  slotIds: number[]
  icon: LucideIcon
}

const BODY_EQUIPMENT_SLOTS: EquipmentSlotDefinition[] = [
  { key: 'head', labelKey: 'head', slotIds: [6], icon: Crown },
  { key: 'gloves', labelKey: 'gloves', slotIds: [9], icon: Hand },
  { key: 'chest', labelKey: 'chest', slotIds: [10], icon: Shirt },
  { key: 'feet', labelKey: 'feet', slotIds: [12], icon: Footprints },
  { key: 'legs', labelKey: 'legs', slotIds: [11], icon: Shirt },
]

const WEAPON_EQUIPMENT_SLOTS: EquipmentSlotDefinition[] = [
  { key: 'weapon', labelKey: 'weapon', slotIds: [14, 7], icon: Sword },
  { key: 'offhand', labelKey: 'offhand', slotIds: [8], icon: Shield },
]

const ACCESSORY_EQUIPMENT_SLOTS: EquipmentSlotDefinition[] = [
  { key: 'left-ear', labelKey: 'earring', slotIds: [2], icon: Gem },
  { key: 'neck', labelKey: 'necklace', slotIds: [3], icon: Gem },
  { key: 'right-ear', labelKey: 'earring', slotIds: [1], icon: Gem },
  { key: 'left-ring', labelKey: 'ring', slotIds: [5], icon: CircleDot },
  { key: 'right-ring', labelKey: 'ring', slotIds: [4], icon: CircleDot },
]

const EQUIPMENT_SLOT_GROUPS = [
  { key: 'body', labelKey: 'body', slots: BODY_EQUIPMENT_SLOTS },
  { key: 'weapons', labelKey: 'weapons', slots: WEAPON_EQUIPMENT_SLOTS },
  { key: 'accessories', labelKey: 'accessories', slots: ACCESSORY_EQUIPMENT_SLOTS },
]

const EQUIPMENT_SLOTS = EQUIPMENT_SLOT_GROUPS.flatMap((group) => group.slots)

const DISPLAYED_EQUIPMENT_SLOTS = new Set(EQUIPMENT_SLOTS.flatMap((slot) => slot.slotIds))

function EquipmentSlot({
  definition,
  item,
  t,
}: {
  definition: EquipmentSlotDefinition
  item?: ApiCharacterEquipmentItem
  t: TFunction<'panel'>
}) {
  const Icon = definition.icon
  const label = t(`character.slots.${definition.labelKey}`)
  const enchant = item && item.enchant > 0 ? ` · +${item.enchant}` : ''
  return (
    <article
      className={`character-equipment-slot equipment-slot-${definition.key} ${item ? 'is-filled' : ''}`}
      aria-label={t('character.equipment.slotAria', {
        label,
        value: item ? item.name : t('character.equipment.emptySlot'),
      })}
      title={item ? `${item.name} · ${t('character.equipment.itemId', { id: item.item_id })}${enchant}` : label}
    >
      <span className="character-equipment-slot-label">{label}</span>
      <div className="character-equipment-slot-cell">
        {item ? (
          <ItemIcon itemId={item.item_id} name={item.name} size={38} />
        ) : (
          <Icon aria-hidden="true" />
        )}
        {item ? (
          <span className="character-equipment-slot-copy">
            <strong>{item.name}</strong>
            <small>
              {t('character.equipment.itemId', { id: item.item_id })}{enchant}
            </small>
          </span>
        ) : null}
      </div>
    </article>
  )
}

export function CharacterPage() {
  const { t } = useTranslation('panel')
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
  const action = useAsyncAction()
  const operation = useRef<{ payload: string; key: string } | null>(null)
  function requestKey(service: string, value: string) {
    const payload = JSON.stringify([login, id, service, value])
    if (operation.current?.payload !== payload) operation.current = { payload, key: crypto.randomUUID() }
    return operation.current.key
  }
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
    const result = await action.run(async () => {
      setSubmitting('nick')
      try {
        await lineageApi.changeNickname(login, id, nickname, requestKey('nickname', nickname))
        toast.success(t('character.toast.nicknameChanged'))
        setNickname('')
        operation.current = null
        await refreshCharacter()
        await queryClient.invalidateQueries({ queryKey: ['wallet'] })
      } finally { setSubmitting(null) }
    })
    if (!result.ok && !result.skipped) toast.error(apiErrorMessage(result.error, t('character.toast.nicknameError')))
  }

  async function onChangeSex(event: FormEvent) {
    event.preventDefault()
    if (sex !== 'M' && sex !== 'F') return
    const result = await action.run(async () => {
      setSubmitting('sex')
      try {
        await lineageApi.changeSex(login, id, sex, requestKey('sex', sex))
        operation.current = null
        toast.success(t('character.toast.sexChanged'))
        await refreshCharacter()
        await queryClient.invalidateQueries({ queryKey: ['wallet'] })
      } finally { setSubmitting(null) }
    })
    if (!result.ok && !result.skipped) toast.error(apiErrorMessage(result.error, t('character.toast.sexError')))
  }

  async function onUnstuck() {
    const result = await action.run(async () => {
      setSubmitting('unstuck')
      try {
        await lineageApi.unstuck(login, id)
        toast.success(t('character.toast.unstuckDone'))
      } finally { setSubmitting(null) }
    })
    if (!result.ok && !result.skipped) toast.error(apiErrorMessage(result.error, t('character.toast.unstuckError')))
  }

  return (
    <div className="account-page character-page">
      <Card as="header" className="account-hero">
        <div>
          <Link className="character-back" to="/painel/accounts">
            <ArrowLeft aria-hidden="true" />
            {t('character.backToAccounts')}
          </Link>
          <span className="panel-eyebrow">{t('character.eyebrow')}</span>
          <h1>{char?.name ?? t('character.fallbackName')}</h1>
          <p className="muted">
            {t('character.summary', {
              login,
              className: getClassName(char?.class_id),
              level: char?.level ?? '—',
            })}
          </p>
        </div>
        {char ? (
          <span className={`account-status-pill ${char.online ? 'is-active' : ''}`}>
            {char.online ? t('character.online') : t('character.offline')}
          </span>
        ) : null}
      </Card>

      {characters.isLoading ? <Card as="div" className="account-empty-state">{t('character.loading')}</Card> : null}
      {characters.isError ? (
        <Card as="div" className="account-empty-state">
          <UsersRound aria-hidden="true" />
          <strong>{t('character.errorTitle')}</strong>
          <span>{isApiError(characters.error) ? characters.error.message : t('character.errorHint')}</span>
        </Card>
      ) : null}
      {missing ? (
        <Card as="div" className="account-empty-state">
          <UsersRound aria-hidden="true" />
          <strong>{t('character.missingTitle')}</strong>
          <span>{t('character.missingHint')}</span>
        </Card>
      ) : null}

      {char ? (
        <div className="character-overview-grid">
          <Card className="character-sheet">
            <div className="account-section-heading">
              <div>
                <span className="panel-eyebrow">{t('character.infoEyebrow')}</span>
                <h2>{char.name}</h2>
              </div>
              {char.is_clan_leader ? (
                <span className="account-login-chip">
                  <Crown aria-hidden="true" />
                  {t('character.clanLeader')}
                </span>
              ) : null}
            </div>
            <dl className="character-stats">
              <div>
                <dt>{t('character.stats.title')}</dt>
                <dd>{char.title || '—'}</dd>
              </div>
              <div>
                <dt>{t('character.stats.level')}</dt>
                <dd>{char.level}</dd>
              </div>
              <div>
                <dt>{t('character.stats.baseClass')}</dt>
                <dd>{getClassName(char.class_id)}</dd>
              </div>
              <div>
                <dt>{t('character.stats.sex')}</dt>
                <dd>{char.sex === 1 ? t('character.female') : t('character.male')}</dd>
              </div>
              <div>
                <dt>{t('character.stats.online')}</dt>
                <dd>{char.online ? t('character.yes') : t('character.no')}</dd>
              </div>
              <div>
                <dt>{t('character.stats.clan')}</dt>
                <dd>{char.clan_name || '—'}</dd>
              </div>
              <div>
                <dt>{t('character.stats.pvp')}</dt>
                <dd>{char.pvp}</dd>
              </div>
              <div>
                <dt>{t('character.stats.pk')}</dt>
                <dd>{char.pk}</dd>
              </div>
            </dl>
            {!offline ? (
              <p className="character-offline-hint">{t('character.offlineHint')}</p>
            ) : null}
          </Card>

          <Card className="character-equipment">
            <div className="account-section-heading">
              <div>
                <span className="panel-eyebrow">{t('character.equipment.eyebrow')}</span>
                <h2>{t('character.equipment.title')}</h2>
              </div>
              <span className="character-readonly-chip">
                <Eye aria-hidden="true" />
                {t('character.equipment.readonly')}
              </span>
            </div>

            <div className="character-equipment-summary">
              <Package aria-hidden="true" />
              <strong>{equippedItems.length}</strong>
              <span>{t('character.equipment.equipped', { count: equippedItems.length })}</span>
            </div>

            {equipment.isLoading ? <div className="character-equipment-message">{t('character.equipment.loading')}</div> : null}
            {equipment.isError ? (
              <div className="character-equipment-message is-error">
                {t('character.equipment.error')}
              </div>
            ) : null}

            {!equipment.isLoading && !equipment.isError ? (
              <div className="character-paperdoll" aria-label={t('character.equipment.paperdollLabel')}>
                {EQUIPMENT_SLOT_GROUPS.map((group) => (
                  <section className={`character-equipment-group character-equipment-group-${group.key}`} key={group.key}>
                    <h3>{t(`character.groups.${group.labelKey}`)}</h3>
                    <div className="character-equipment-slots">
                      {group.slots.map((definition) => (
                        <EquipmentSlot
                          key={definition.key}
                          definition={definition}
                          item={equippedItems.find((item) => definition.slotIds.includes(item.slot))}
                          t={t}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}

            {additionalEquipment.length ? (
              <div className="character-equipment-additional">
                <span>{t('character.equipment.additional')}</span>
                <div>
                  {additionalEquipment.map((item) => (
                    <article key={`${item.slot}-${item.item_id}`}>
                      <ItemIcon itemId={item.item_id} name={item.name} size={28} />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{t('character.equipment.slotInfo', { slot: item.slot, id: item.item_id })}{item.enchant > 0 ? ` · +${item.enchant}` : ''}</small>
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <div className="grid cols-2 character-services">
            <Card>
              <div className="account-form-title">
                <Pencil aria-hidden="true" />
                <div>
                  <h3>{t('character.services.nickname.title')}</h3>
                  <p>{t('character.services.nickname.hint', { price: formatServicePrice(prices.data?.CHANGE_NICKNAME) })}</p>
                </div>
              </div>
              <form className="account-action-form" onSubmit={onChangeNickname}>
                <Field>
                  {t('character.services.nickname.field')}
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    minLength={2}
                    maxLength={16}
                    required
                    disabled={!offline}
                  />
                </Field>
                <Button type="submit" disabled={!offline || submitting !== null}>
                  {submitting === 'nick' ? t('character.services.nickname.submitting') : t('character.services.nickname.submit')}
                </Button>
              </form>
            </Card>

            <Card>
              <div className="account-form-title">
                <VenusAndMars aria-hidden="true" />
                <div>
                  <h3>{t('character.services.sex.title')}</h3>
                  <p>{t('character.services.sex.hint', { price: formatServicePrice(prices.data?.CHANGE_SEX) })}</p>
                </div>
              </div>
              <form className="account-action-form" onSubmit={onChangeSex}>
                <Field>
                  {t('character.services.sex.field')}
                  <select value={sex} onChange={(event) => setSex(event.target.value as 'M' | 'F' | '')} required disabled={!offline}>
                    <option value="">{t('character.services.sex.placeholder')}</option>
                    <option value="M">{t('character.male')}</option>
                    <option value="F">{t('character.female')}</option>
                  </select>
                </Field>
                <Button type="submit" disabled={!offline || submitting !== null}>
                  {submitting === 'sex' ? t('character.services.sex.submitting') : t('character.services.sex.submit')}
                </Button>
              </form>
            </Card>

            <Card>
              <div className="account-form-title">
                <Undo2 aria-hidden="true" />
                <div>
                  <h3>{t('character.services.unstuck.title')}</h3>
                  <p>{t('character.services.unstuck.hint', { price: formatServicePrice(prices.data?.UNSTUCK) })}</p>
                </div>
              </div>
              <p className="muted">{t('character.services.unstuck.description')}</p>
              <Button type="button" onClick={() => void onUnstuck()} disabled={!offline || submitting !== null}>
                {submitting === 'unstuck' ? t('character.services.unstuck.submitting') : t('character.services.unstuck.submit')}
              </Button>
            </Card>

            <Card className="character-shortcuts">
              <div className="account-form-title">
                <MapPin aria-hidden="true" />
                <div>
                  <h3>{t('character.services.shortcuts.title')}</h3>
                  <p>{t('character.services.shortcuts.hint')}</p>
                </div>
              </div>
              <div className="character-shortcut-list">
                <Link className="btn ghost" to="/painel/inventory">
                  <Package aria-hidden="true" />
                  {t('character.services.shortcuts.inventory')}
                </Link>
                <Link className="btn ghost" to="/painel/marketplace">
                  <Store aria-hidden="true" />
                  {t('character.services.shortcuts.marketplace')}
                </Link>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
