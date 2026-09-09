import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BadgeDollarSign,
  Store,
  UserRound,
} from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { getClassName } from '../../lib/lineage'

interface CharacterOption {
  char_id: number
  name: string
  level: number
  class_id: number
  online: boolean
  pvp: number
  pk: number
  clan_name: string
  title: string
}

interface EquipmentPreview {
  item_id: number
  name?: string | null
  slot?: number | null
}

interface MarketplaceSellFormProps {
  characters: CharacterOption[]
  charId: string
  price: string
  notes: string
  publishing: boolean
  equipmentLoading: boolean
  equipment: EquipmentPreview[]
  onCharChange: (value: string) => void
  onPriceChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function MarketplaceSellForm({
  characters,
  charId,
  price,
  notes,
  publishing,
  equipmentLoading,
  equipment,
  onCharChange,
  onPriceChange,
  onNotesChange,
  onSubmit,
}: MarketplaceSellFormProps) {
  const { t } = useTranslation('panel')
  const selectedCharacter = characters.find((character) => String(character.char_id) === charId)

  return (
    <Card className="marketplace-sell-card">
      <div className="marketplace-section-heading compact">
        <div>
          <span className="panel-eyebrow">{t('marketplace.sell.eyebrow')}</span>
          <h2>{t('marketplace.sell.title')}</h2>
        </div>
        <BadgeDollarSign aria-hidden="true" />
      </div>
      <form onSubmit={onSubmit}>
        <Field>
          {t('marketplace.sell.character')}
          <select value={charId} onChange={(event) => onCharChange(event.target.value)} required>
            <option value="">{t('marketplace.sell.selectCharacter')}</option>
            {characters.map((char) => (
              <option key={char.char_id} value={char.char_id}>
                {t('marketplace.sell.characterOption', { name: char.name, level: char.level })}
              </option>
            ))}
          </select>
        </Field>

        {selectedCharacter ? (
          <div className="marketplace-character-preview">
            <div className="marketplace-character-preview-head">
              <div className="marketplace-character-emblem"><UserRound aria-hidden="true" /></div>
              <div>
                <span className="panel-eyebrow">{t('marketplace.sell.previewEyebrow')}</span>
                <strong>{selectedCharacter.name}</strong>
                <small>{t('marketplace.sell.classLevel', { className: getClassName(selectedCharacter.class_id), level: selectedCharacter.level })}</small>
              </div>
              <span className={`marketplace-online-state ${selectedCharacter.online ? 'online' : 'offline'}`}>
                {selectedCharacter.online ? t('marketplace.sell.online') : t('marketplace.sell.offline')}
              </span>
            </div>
            <dl className="marketplace-character-preview-stats">
              <div><dt>{t('marketplace.sell.pvp')}</dt><dd>{selectedCharacter.pvp.toLocaleString('pt-BR')}</dd></div>
              <div><dt>{t('marketplace.sell.pk')}</dt><dd>{selectedCharacter.pk.toLocaleString('pt-BR')}</dd></div>
              <div><dt>{t('marketplace.sell.clan')}</dt><dd>{selectedCharacter.clan_name || t('marketplace.sell.noClan')}</dd></div>
              <div><dt>{t('marketplace.sell.titleLabel')}</dt><dd>{selectedCharacter.title || t('marketplace.sell.noTitle')}</dd></div>
            </dl>
            <div className="marketplace-character-preview-equipment">
              <span>{t('marketplace.sell.equipmentTitle')}</span>
              {equipmentLoading ? <small>{t('marketplace.sell.equipmentLoading')}</small> : null}
              {!equipmentLoading ? (
                <div>
                  {equipment.slice(0, 10).map((item, index) => (
                    <ItemIcon itemId={item.item_id} name={item.name} size={32} key={`${item.item_id}-${item.slot ?? index}`} />
                  ))}
                  {!equipment.length ? <small>{t('marketplace.sell.equipmentEmpty')}</small> : null}
                </div>
              ) : null}
            </div>
            {selectedCharacter.online ? <p>{t('marketplace.sell.onlineWarning')}</p> : null}
          </div>
        ) : null}

        <Field>
          {t('marketplace.sell.price')}
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={price} onChange={(event) => onPriceChange(event.target.value)} placeholder={t('marketplace.sell.pricePlaceholder')} required />
        </Field>
        <Field>
          {t('marketplace.sell.notes')}
          <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} maxLength={500} placeholder={t('marketplace.sell.notesPlaceholder')} />
        </Field>
        <Button type="submit" disabled={publishing || !selectedCharacter || selectedCharacter.online}>
          <Store aria-hidden="true" /> {publishing ? t('marketplace.sell.publishing') : t('marketplace.sell.publish')}
        </Button>
      </form>
    </Card>
  )
}
