import { useTranslation } from 'react-i18next'
import { Eye, Package } from 'lucide-react'
import {
  CharacterPaperdoll,
  toPaperdollItems,
} from '../character/CharacterPaperdoll'
import type { CharacterItemDetail } from '../character/CharacterItemDetailModal'
import type { ListingEquipmentItem } from './marketplaceHelpers'

export function ListingEquipment({
  equipment,
  onSelect,
}: {
  equipment: ListingEquipmentItem[]
  onSelect?: (item: CharacterItemDetail) => void
}) {
  const { t } = useTranslation('panel')
  const items = toPaperdollItems(equipment)

  return (
    <section className="character-equipment marketplace-character-equipment">
      <div className="account-section-heading">
        <div>
          <span className="panel-eyebrow">{t('character.equipment.eyebrow')}</span>
          <h3>{t('character.equipment.title')}</h3>
        </div>
        <span className="character-readonly-chip">
          <Eye aria-hidden="true" />
          {t('character.equipment.readonly')}
        </span>
      </div>
      <div className="character-equipment-summary">
        <Package aria-hidden="true" />
        <strong>{items.length}</strong>
        <span>{t('character.equipment.equipped', { count: items.length })}</span>
      </div>
      <CharacterPaperdoll items={items} onSelect={onSelect} />
    </section>
  )
}
