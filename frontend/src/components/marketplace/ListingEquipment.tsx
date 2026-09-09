import { useTranslation } from 'react-i18next'
import { ItemIcon } from '../ItemIcon'
import type { ListingEquipmentItem } from './marketplaceHelpers'

export function ListingEquipment({ equipment }: { equipment: ListingEquipmentItem[] }) {
  const { t } = useTranslation('panel')

  if (!equipment.length) {
    return <div className="marketplace-equipment-empty">{t('marketplace.equipment.empty')}</div>
  }

  return (
    <div className="marketplace-equipment-list">
      {equipment.map((item, index) => (
        <div className="marketplace-equipment-item" title={item.name} key={`${item.item_id}-${item.slot ?? index}`}>
          <ItemIcon itemId={item.item_id} name={item.name} size={38} />
          <span>
            <strong>{item.name}</strong>
            <small>{item.enchant > 0 ? `+${item.enchant}` : t('marketplace.equipment.noEnchant')}</small>
          </span>
        </div>
      ))}
    </div>
  )
}
