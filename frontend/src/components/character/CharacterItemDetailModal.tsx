import { useTranslation } from 'react-i18next'
import { Modal } from '../ui/Modal'
import { ItemIcon } from '../ItemIcon'
import { useItemCatalog } from '../../hooks/useItemCatalog'
import { formatQuantityLabel } from '../../lib/formatters'

export interface CharacterItemDetail {
  item_id: number
  name: string
  quantity: number
  enchant: number
  tradeable?: boolean | null
  location?: string | null
  slot?: number | null
  slotLabel?: string | null
}

export function CharacterItemDetailModal({
  item,
  onClose,
}: {
  item: CharacterItemDetail | null
  onClose: () => void
}) {
  const { t } = useTranslation('panel')
  const catalog = useItemCatalog()
  const catalogItem = item ? catalog.getById(item.item_id) : null
  const tradeable = catalogItem?.tradeable ?? item?.tradeable
  const enchant = item && item.enchant > 0 ? `+${item.enchant}` : ''
  const locationUpper = item?.location?.toUpperCase()
  const locationLabel =
    locationUpper === 'WAREHOUSE'
      ? t('character.bag.tabs.warehouse')
      : locationUpper === 'INVENTORY'
        ? t('character.bag.tabs.inventory')
        : locationUpper === 'PAPERDOLL'
          ? t('character.itemModal.equipped')
          : null

  const rows: Array<[string, string]> = []
  if (item) {
    rows.push([t('character.itemModal.fields.id'), String(item.item_id)])
    rows.push([t('character.itemModal.fields.quantity'), formatQuantityLabel(item.quantity)])
    rows.push([
      t('character.itemModal.fields.enchant'),
      enchant || t('character.itemModal.noEnchant'),
    ])
    if (item.slotLabel) {
      rows.push([t('character.itemModal.fields.slot'), item.slotLabel])
    } else if (item.slot != null) {
      rows.push([t('character.itemModal.fields.slot'), String(item.slot)])
    }
    if (locationLabel) {
      rows.push([t('character.itemModal.fields.location'), locationLabel])
    }
    if (tradeable != null) {
      rows.push([
        t('character.itemModal.fields.tradeable'),
        tradeable ? t('character.itemModal.tradeableYes') : t('character.itemModal.tradeableNo'),
      ])
    }
    if (catalogItem?.grade) {
      rows.push([t('character.itemModal.fields.grade'), catalogItem.grade])
    }
    if (catalogItem?.category) {
      rows.push([t('character.itemModal.fields.category'), catalogItem.category])
    }
  }

  return (
    <Modal
      open={Boolean(item)}
      title={item ? `${item.name}${enchant ? ` ${enchant}` : ''}` : t('character.itemModal.title')}
      onClose={onClose}
      className="character-item-modal"
    >
      {item ? (
        <div className="character-item-modal-body">
          <div className="character-item-modal-hero">
            <ItemIcon itemId={item.item_id} name={item.name} size={64} />
            <div>
              <strong>{item.name}</strong>
              <span>{enchant || t('character.itemModal.noEnchant')}</span>
            </div>
          </div>
          <dl className="ui-detail-list">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </Modal>
  )
}
