import { useTranslation } from 'react-i18next'
import { Eye, Package } from 'lucide-react'
import {
  CharacterPaperdoll,
  toPaperdollItems,
} from '../character/CharacterPaperdoll'
import { CharacterBagPanel } from '../character/CharacterBagPanel'
import { CharacterSkillsPanel } from '../character/CharacterSkillsPanel'
import type { CharacterItemDetail } from '../character/CharacterItemDetailModal'
import type { ApiGameItem, ApiGameSkill } from '../../services/api'
import type { ListingEquipmentItem } from './marketplaceHelpers'

export function ListingEquipment({
  equipment,
  bagItems,
  skills,
  onSelect,
}: {
  equipment: ListingEquipmentItem[]
  bagItems: ApiGameItem[]
  skills: ApiGameSkill[]
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
      <CharacterBagPanel items={bagItems} loading={false} error={false} tabsId="marketplace-listing-bag" />
      <CharacterSkillsPanel skills={skills} loading={false} error={false} />
    </section>
  )
}
