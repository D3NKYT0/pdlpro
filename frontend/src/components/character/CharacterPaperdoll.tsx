import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ItemIcon } from '../ItemIcon'
import {
  EQUIPMENT_SLOT_ICONS,
  type EquipmentSlotIconKey,
} from './EquipmentSlotIcons'
import type { CharacterItemDetail } from './CharacterItemDetailModal'

export interface PaperdollItem {
  item_id: number
  name: string
  quantity: number
  enchant: number
  tradeable?: boolean | null
  slot: number
}

interface EquipmentSlotDefinition {
  key: EquipmentSlotIconKey
  labelKey: string
  slotIds: number[]
}

/** Layout próximo ao inventário L2 Classic/HF (paperdoll). */
export const PAPERDOLL_SLOTS: EquipmentSlotDefinition[] = [
  { key: 'face', labelKey: 'face', slotIds: [16] },
  { key: 'head', labelKey: 'head', slotIds: [6] },
  { key: 'hair', labelKey: 'hair', slotIds: [15, 17] },
  { key: 'gloves', labelKey: 'gloves', slotIds: [9] },
  { key: 'chest', labelKey: 'chest', slotIds: [10] },
  { key: 'feet', labelKey: 'feet', slotIds: [12] },
  { key: 'cloak', labelKey: 'cloak', slotIds: [13] },
  { key: 'legs', labelKey: 'legs', slotIds: [11] },
  { key: 'belt', labelKey: 'belt', slotIds: [24, 18] },
  { key: 'weapon', labelKey: 'weapon', slotIds: [14, 7] },
  { key: 'offhand', labelKey: 'offhand', slotIds: [8] },
  { key: 'left-ear', labelKey: 'earring', slotIds: [2] },
  { key: 'neck', labelKey: 'necklace', slotIds: [3] },
  { key: 'right-ear', labelKey: 'earring', slotIds: [1] },
  { key: 'left-ring', labelKey: 'ring', slotIds: [5] },
  { key: 'underwear', labelKey: 'underwear', slotIds: [0] },
  { key: 'right-ring', labelKey: 'ring', slotIds: [4] },
]

const DISPLAYED_EQUIPMENT_SLOTS = new Set(PAPERDOLL_SLOTS.flatMap((slot) => slot.slotIds))

function findEquippedItem(
  items: PaperdollItem[],
  definition: EquipmentSlotDefinition,
  claimed: Set<number>,
) {
  for (const slotId of definition.slotIds) {
    if (claimed.has(slotId)) continue
    const item = items.find((entry) => entry.slot === slotId)
    if (item) {
      claimed.add(slotId)
      return item
    }
  }
  return undefined
}

function EquipmentSlot({
  definition,
  item,
  t,
  onSelect,
}: {
  definition: EquipmentSlotDefinition
  item?: PaperdollItem
  t: TFunction<'panel'>
  onSelect?: (item: CharacterItemDetail) => void
}) {
  const Icon = EQUIPMENT_SLOT_ICONS[definition.key]
  const label = t(`character.slots.${definition.labelKey}`)
  const enchantLabel = item && item.enchant > 0 ? `+${item.enchant}` : ''
  const title = item
    ? `${item.name}${enchantLabel ? ` ${enchantLabel}` : ''} · ${t('character.equipment.itemId', { id: item.item_id })}`
    : label
  const interactive = Boolean(item && onSelect)

  function openDetail() {
    if (!item || !onSelect) return
    onSelect({
      item_id: item.item_id,
      name: item.name,
      quantity: item.quantity,
      enchant: item.enchant,
      tradeable: item.tradeable,
      slot: item.slot,
      slotLabel: label,
      location: 'PAPERDOLL',
    })
  }

  return (
    <article
      className={`character-equipment-slot equipment-slot-${definition.key} ${item ? 'is-filled' : 'is-empty'}${interactive ? ' is-interactive' : ''}`}
      aria-label={t('character.equipment.slotAria', {
        label,
        value: item ? `${item.name}${enchantLabel ? ` ${enchantLabel}` : ''}` : t('character.equipment.emptySlot'),
      })}
      title={title}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? openDetail : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openDetail()
              }
            }
          : undefined
      }
    >
      <span className="character-equipment-slot-label">{label}</span>
      <div className="character-equipment-slot-cell">
        {item ? (
          <ItemIcon itemId={item.item_id} name={item.name} size={42} />
        ) : (
          <Icon />
        )}
        {enchantLabel ? <span className="character-equipment-slot-enchant">{enchantLabel}</span> : null}
      </div>
    </article>
  )
}

/** Normaliza snapshot de equipment (leilão/marketplace) para o paperdoll. */
export function toPaperdollItems(
  equipment: Array<{
    item_id: number
    name?: string | null
    quantity?: number
    enchant?: number
    tradeable?: boolean | null
    slot?: number | null
  }>,
): PaperdollItem[] {
  return equipment
    .filter((item) => item.slot != null && Number.isFinite(Number(item.slot)))
    .map((item) => ({
      item_id: item.item_id,
      name: item.name || `Item ${item.item_id}`,
      quantity: item.quantity ?? 1,
      enchant: item.enchant ?? 0,
      tradeable: item.tradeable,
      slot: Number(item.slot),
    }))
}

interface CharacterPaperdollProps {
  items: PaperdollItem[]
  loading?: boolean
  error?: boolean
  onSelect?: (item: CharacterItemDetail) => void
}

export function CharacterPaperdoll({ items, loading, error, onSelect }: CharacterPaperdollProps) {
  const { t } = useTranslation('panel')
  const claimedSlots = new Set<number>()
  const paperdollItems = PAPERDOLL_SLOTS.map((definition) => ({
    definition,
    item: findEquippedItem(items, definition, claimedSlots),
  }))
  const additionalEquipment = items.filter((item) => !DISPLAYED_EQUIPMENT_SLOTS.has(item.slot))

  return (
    <>
      {loading ? <div className="character-equipment-message">{t('character.equipment.loading')}</div> : null}
      {error ? (
        <div className="character-equipment-message is-error">{t('character.equipment.error')}</div>
      ) : null}

      {!loading && !error ? (
        <div className="character-paperdoll" aria-label={t('character.equipment.paperdollLabel')}>
          <div className="character-paperdoll-frame" aria-hidden="true">
            <span className="character-paperdoll-corner is-tl" />
            <span className="character-paperdoll-corner is-tr" />
            <span className="character-paperdoll-corner is-bl" />
            <span className="character-paperdoll-corner is-br" />
          </div>
          <div className="character-paperdoll-band is-armor" aria-hidden="true" />
          <div className="character-paperdoll-band is-weapons" aria-hidden="true" />
          <div className="character-paperdoll-band is-jewels" aria-hidden="true" />
          <div className="character-equipment-slots">
            {paperdollItems.map(({ definition, item }) => (
              <EquipmentSlot
                key={definition.key}
                definition={definition}
                item={item}
                t={t}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ) : null}

      {additionalEquipment.length ? (
        <div className="character-equipment-additional">
          <span>{t('character.equipment.additional')}</span>
          <div>
            {additionalEquipment.map((item) => (
              <button
                type="button"
                key={`${item.slot}-${item.item_id}`}
                onClick={() =>
                  onSelect?.({
                    item_id: item.item_id,
                    name: item.name,
                    quantity: item.quantity,
                    enchant: item.enchant,
                    tradeable: item.tradeable,
                    slot: item.slot,
                    location: 'PAPERDOLL',
                  })
                }
              >
                <ItemIcon itemId={item.item_id} name={item.name} size={28} />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {t('character.equipment.slotInfo', { slot: item.slot, id: item.item_id })}
                    {item.enchant > 0 ? ` · +${item.enchant}` : ''}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
