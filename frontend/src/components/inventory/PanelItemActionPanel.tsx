import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeft, Send } from 'lucide-react'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import type { ApiAccessibleAccount, ApiInventoryRow } from '../../services/api'
import type { PanelItemAction } from './types'

interface PanelItemActionPanelProps {
  action: PanelItemAction
  accountName: string
  characterName: string
  inventoryId: string
  itemId: number
  enchant: number
  panelActionQuantity: string
  onQuantityChange: (value: string) => void
  destinationLogin: string
  onDestinationLoginChange: (value: string) => void
  destinationInventoryId: string
  onDestinationInventoryIdChange: (value: string) => void
  destinationAccounts: ApiAccessibleAccount[]
  destinationCharacters: ApiInventoryRow[]
  destinationsLoading: boolean
  destinationsError: boolean
  pending: boolean
  onCancel: () => void
  onTrade: (event: FormEvent) => void
  onDeposit: (inventoryId: string, itemId: number, enchant: number) => void
}

export function PanelItemActionPanel({
  action,
  accountName,
  characterName,
  inventoryId,
  itemId,
  enchant,
  panelActionQuantity,
  onQuantityChange,
  destinationLogin,
  onDestinationLoginChange,
  destinationInventoryId,
  onDestinationInventoryIdChange,
  destinationAccounts,
  destinationCharacters,
  destinationsLoading,
  destinationsError,
  pending,
  onCancel,
  onTrade,
  onDeposit,
}: PanelItemActionPanelProps) {
  const { t } = useTranslation('panel')
  const { t: tCommon } = useTranslation('common')

  if (action.mode === 'trade') {
    return (
      <form className="inventory-item-action-panel" onSubmit={onTrade}>
        <div className="inventory-item-action-heading">
          <ArrowRightLeft aria-hidden="true" />
          <div>
            <span className="panel-eyebrow">{t('inventory.action.tradeEyebrow')}</span>
            <strong>{action.itemName}</strong>
            <small>{t('inventory.action.origin', { account: action.originAccount, character: action.originCharacter })}</small>
          </div>
        </div>

        <div className="inventory-item-action-fields">
          <Field>
            {t('inventory.action.destinationAccount')}
            <select
              value={destinationLogin}
              onChange={(event) => {
                onDestinationLoginChange(event.target.value)
                onDestinationInventoryIdChange('')
              }}
              disabled={destinationsLoading}
              required
            >
              <option value="">
                {destinationsLoading ? t('inventory.action.loadingAccounts') : t('inventory.action.selectAccount')}
              </option>
              {destinationAccounts.map((account) => (
                <option value={account.login} key={account.login}>
                  {t(account.is_primary ? 'inventory.action.accountPrimaryOption' : 'inventory.action.accountOption', { login: account.login })}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            {t('inventory.action.destinationCharacter')}
            <select
              value={destinationInventoryId}
              onChange={(event) => onDestinationInventoryIdChange(event.target.value)}
              disabled={!destinationLogin}
              required
            >
              <option value="">{t('inventory.action.selectCharacter')}</option>
              {destinationCharacters.map((inventory) => (
                <option value={inventory.inventory_id} key={inventory.inventory_id}>
                  {t('inventory.action.characterOption', { name: inventory.character_name, level: inventory.character.level })}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            {t('inventory.action.quantity')}
            <input
              type="number"
              min={1}
              max={action.availableQuantity}
              inputMode="numeric"
              value={panelActionQuantity}
              onChange={(event) => onQuantityChange(event.target.value)}
              required
            />
          </Field>
        </div>

        {destinationsError ? (
          <p className="inventory-item-action-notice inventory-item-action-error">
            {t('inventory.action.destinationsError')}
          </p>
        ) : null}

        {!destinationsLoading && !destinationsError && !destinationAccounts.length ? (
          <p className="inventory-item-action-notice">
            {t('inventory.action.noDestinations')}
          </p>
        ) : null}

        <div className="inventory-item-action-buttons">
          <Button className="ghost" type="button" onClick={onCancel} disabled={pending}>
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={pending || destinationsError || !destinationInventoryId}
          >
            <ArrowRightLeft aria-hidden="true" />
            {pending ? t('inventory.action.transferring') : t('inventory.action.confirmTransfer')}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form
      className="inventory-item-action-panel inventory-deposit-confirmation"
      onSubmit={(event) => {
        event.preventDefault()
        void onDeposit(inventoryId, itemId, enchant)
      }}
    >
      <div className="inventory-item-action-heading">
        <Send aria-hidden="true" />
        <div>
          <span className="panel-eyebrow">{t('inventory.action.depositEyebrow')}</span>
          <strong>{action.itemName}</strong>
          <small>{t('inventory.action.destination', { account: accountName, character: characterName })}</small>
        </div>
      </div>
      <Field className="inventory-deposit-quantity">
        {t('inventory.action.quantity')}
        <input
          type="number"
          min={1}
          max={action.availableQuantity}
          inputMode="numeric"
          value={panelActionQuantity}
          onChange={(event) => onQuantityChange(event.target.value)}
          required
        />
      </Field>
      <p className="inventory-item-action-notice">
        {t('inventory.action.depositNotice')}
      </p>
      <div className="inventory-item-action-buttons">
        <Button className="ghost" type="button" onClick={onCancel} disabled={pending}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          <Send aria-hidden="true" />
          {pending ? t('inventory.action.sending') : t('inventory.action.sendTo', { character: characterName })}
        </Button>
      </div>
    </form>
  )
}
