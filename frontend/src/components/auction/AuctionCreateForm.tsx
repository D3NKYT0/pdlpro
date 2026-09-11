import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BadgeDollarSign,
  Gavel,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { formatNumber } from '../../lib/formatters'
import { getClassName } from '../../lib/lineage'

interface InventoryRow {
  inventory_id: string
  character_name: string
  items: Array<{
    id: string
    item_id: number
    item_name?: string | null
    enchant: number
    quantity: number
  }>
}

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

interface AuctionCreateFormProps {
  kind: 'item' | 'character'
  inventory: InventoryRow[]
  characters: CharacterOption[]
  inventoryId: string
  itemKey: string
  charId: string
  quantity: string
  minBid: string
  hours: string
  creating: boolean
  onKindChange: (value: 'item' | 'character') => void
  onInventoryChange: (value: string) => void
  onItemChange: (value: string) => void
  onCharChange: (value: string) => void
  onQuantityChange: (value: string) => void
  onMinBidChange: (value: string) => void
  onHoursChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function AuctionCreateForm({
  kind,
  inventory,
  characters,
  inventoryId,
  itemKey,
  charId,
  quantity,
  minBid,
  hours,
  creating,
  onKindChange,
  onInventoryChange,
  onItemChange,
  onCharChange,
  onQuantityChange,
  onMinBidChange,
  onHoursChange,
  onSubmit,
}: AuctionCreateFormProps) {
  const { t } = useTranslation('panel')
  const selectedInventory = inventory.find((row) => row.inventory_id === inventoryId)
  const selectedItem = (selectedInventory?.items ?? []).find(
    (item) => `${item.item_id}:${item.enchant}` === itemKey,
  )
  const selectedCharacter = characters.find((character) => String(character.char_id) === charId)
  const canSubmit = kind === 'character' ? Boolean(selectedCharacter && !selectedCharacter.online) : Boolean(selectedItem)

  return (
    <Card className="auction-create-card">
      <div className="marketplace-section-heading compact">
        <div>
          <span className="panel-eyebrow">{t('auctions.create.eyebrow')}</span>
          <h2>{t('auctions.create.title')}</h2>
        </div>
        <BadgeDollarSign aria-hidden="true" />
      </div>
      <form onSubmit={onSubmit}>
        <Field>
          {t('auctions.create.kind')}
          <select
            value={kind}
            onChange={(event) => onKindChange(event.target.value as 'item' | 'character')}
            required
          >
            <option value="item">{t('auctions.create.kindItem')}</option>
            <option value="character">{t('auctions.create.kindCharacter')}</option>
          </select>
        </Field>

        {kind === 'item' ? (
          <>
            <Field>
              {t('auctions.create.inventory')}
              <select
                value={inventoryId}
                onChange={(event) => onInventoryChange(event.target.value)}
                required
              >
                <option value="">{t('auctions.create.selectInventory')}</option>
                {inventory.map((row) => (
                  <option key={row.inventory_id} value={row.inventory_id}>
                    {t('auctions.create.inventoryOption', { character: row.character_name, total: row.items.length })}
                  </option>
                ))}
              </select>
            </Field>

            {selectedInventory ? (
              <div className="auction-inventory-summary">
                <UserRound aria-hidden="true" />
                <div>
                  <span className="panel-eyebrow">{t('auctions.create.selectedInventoryEyebrow')}</span>
                  <strong>{selectedInventory.character_name}</strong>
                  <small>{t('auctions.create.itemTypes', { total: selectedInventory.items.length })}</small>
                </div>
              </div>
            ) : null}

            <Field>
              {t('auctions.create.item')}
              <select
                value={itemKey}
                onChange={(event) => onItemChange(event.target.value)}
                required
                disabled={!selectedInventory}
              >
                <option value="">{t('auctions.create.selectItem')}</option>
                {(selectedInventory?.items ?? []).map((item) => (
                  <option key={`${item.id}-${item.item_id}-${item.enchant}`} value={`${item.item_id}:${item.enchant}`}>
                    {item.item_name || t('auctions.create.itemFallback', { id: item.item_id })} {item.enchant > 0 ? `+${item.enchant}` : ''} — x{item.quantity}
                  </option>
                ))}
              </select>
            </Field>

            {selectedItem ? (
              <div className="auction-selected-item">
                <div className="auction-item-icon large">
                  <ItemIcon itemId={selectedItem.item_id} name={selectedItem.item_name} size={64} />
                </div>
                <div>
                  <span className="panel-eyebrow">{t('auctions.create.selectedItemEyebrow')}</span>
                  <strong>{selectedItem.item_name || t('auctions.create.itemFallback', { id: selectedItem.item_id })}</strong>
                  <small>{t('auctions.create.selectedItemMeta', { id: selectedItem.item_id, quantity: formatNumber(selectedItem.quantity) })}</small>
                  <span>{selectedItem.enchant > 0 ? t('auctions.create.enchantValue', { enchant: selectedItem.enchant }) : t('auctions.create.noEnchant')}</span>
                </div>
              </div>
            ) : null}

            <div className="auction-form-grid">
              <Field>
                {t('auctions.create.quantity')}
                <input
                  type="number"
                  min="1"
                  max={selectedItem?.quantity}
                  value={quantity}
                  onChange={(event) => onQuantityChange(event.target.value)}
                  required
                />
              </Field>
              <Field>
                {t('auctions.create.duration')}
                <select value={hours} onChange={(event) => onHoursChange(event.target.value)} required>
                  <option value="1">{t('auctions.create.duration1h')}</option>
                  <option value="6">{t('auctions.create.duration6h')}</option>
                  <option value="12">{t('auctions.create.duration12h')}</option>
                  <option value="24">{t('auctions.create.duration24h')}</option>
                  <option value="48">{t('auctions.create.duration2d')}</option>
                  <option value="72">{t('auctions.create.duration3d')}</option>
                  <option value="168">{t('auctions.create.duration7d')}</option>
                </select>
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field>
              {t('auctions.create.character')}
              <select value={charId} onChange={(event) => onCharChange(event.target.value)} required>
                <option value="">{t('auctions.create.selectCharacter')}</option>
                {characters.map((char) => (
                  <option key={char.char_id} value={char.char_id}>
                    {t('auctions.create.characterOption', { name: char.name, level: char.level })}
                  </option>
                ))}
              </select>
            </Field>

            {selectedCharacter ? (
              <div className="marketplace-character-preview">
                <div className="marketplace-character-preview-head">
                  <div className="marketplace-character-emblem"><UserRound aria-hidden="true" /></div>
                  <div>
                    <span className="panel-eyebrow">{t('auctions.create.selectedCharacterEyebrow')}</span>
                    <strong>{selectedCharacter.name}</strong>
                    <small>
                      {t('auctions.create.classLevel', {
                        className: getClassName(selectedCharacter.class_id),
                        level: selectedCharacter.level,
                      })}
                    </small>
                  </div>
                  <span className={`marketplace-online-state ${selectedCharacter.online ? 'online' : 'offline'}`}>
                    {selectedCharacter.online ? t('auctions.create.online') : t('auctions.create.offline')}
                  </span>
                </div>
              </div>
            ) : null}

            <Field>
              {t('auctions.create.duration')}
              <select value={hours} onChange={(event) => onHoursChange(event.target.value)} required>
                <option value="1">{t('auctions.create.duration1h')}</option>
                <option value="6">{t('auctions.create.duration6h')}</option>
                <option value="12">{t('auctions.create.duration12h')}</option>
                <option value="24">{t('auctions.create.duration24h')}</option>
                <option value="48">{t('auctions.create.duration2d')}</option>
                <option value="72">{t('auctions.create.duration3d')}</option>
                <option value="168">{t('auctions.create.duration7d')}</option>
              </select>
            </Field>
          </>
        )}

        <Field>
          {t('auctions.create.minBid')}
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={minBid}
            onChange={(event) => onMinBidChange(event.target.value)}
            placeholder={t('auctions.create.minBidPlaceholder')}
            required
          />
        </Field>
        <div className="auction-security-note">
          <ShieldCheck aria-hidden="true" />
          <span>
            {kind === 'character' ? t('auctions.create.securityNoteCharacter') : t('auctions.create.securityNote')}
          </span>
        </div>
        <Button type="submit" disabled={!canSubmit || creating}>
          <Gavel aria-hidden="true" /> {creating ? t('auctions.create.publishing') : t('auctions.create.publish')}
        </Button>
      </form>
    </Card>
  )
}
