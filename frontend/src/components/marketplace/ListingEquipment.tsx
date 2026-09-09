import { ItemIcon } from '../ItemIcon'
import type { ListingEquipmentItem } from './marketplaceHelpers'

export function ListingEquipment({ equipment }: { equipment: ListingEquipmentItem[] }) {
  if (!equipment.length) {
    return <div className="marketplace-equipment-empty">Nenhum equipamento registrado no momento do anúncio.</div>
  }

  return (
    <div className="marketplace-equipment-list">
      {equipment.map((item, index) => (
        <div className="marketplace-equipment-item" title={item.name} key={`${item.item_id}-${item.slot ?? index}`}>
          <ItemIcon itemId={item.item_id} name={item.name} size={38} />
          <span>
            <strong>{item.name}</strong>
            <small>{item.enchant > 0 ? `+${item.enchant}` : 'Sem encantamento'}</small>
          </span>
        </div>
      ))}
    </div>
  )
}
