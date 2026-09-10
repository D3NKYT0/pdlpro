import { useTranslation } from 'react-i18next'
import { ArrowRightLeft, Backpack, Send } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { ItemIcon } from '../ItemIcon'
import { formatNumber } from '../../lib/formatters'
import type { useInventoryDashboard } from './useInventoryDashboard'

type InventoryDashboard = ReturnType<typeof useInventoryDashboard>

export function InventoryBagTab({ inventory }: { inventory: InventoryDashboard }) {
  const { t } = useTranslation('panel')
  const {
    bag,
    bagItemsQuantity,
    bagTransferInventoryId,
    setBagTransferInventoryId,
    bagTransferPending,
    destinationInventories,
    onTransferBag,
  } = inventory

  return (
    <Card
      className="inventory-bag-card"
      id="inventory-panel-bag"
      role="tabpanel"
      aria-labelledby="inventory-tab-bag"
    >
      <div className="inventory-bag-heading">
        <div className="inventory-bag-title">
          <Backpack aria-hidden="true" />
          <div>
            <span className="panel-eyebrow">{t('inventory.bag.eyebrow')}</span>
            <h2>{t('inventory.bag.title')}</h2>
            <p>{t('inventory.bag.subtitle')}</p>
          </div>
        </div>
        <div className="inventory-bag-summary">
          <span>{t('inventory.bag.types', { total: bag.data?.length ?? 0 })}</span>
          <strong>{t('inventory.bag.items', { total: formatNumber(bagItemsQuantity) })}</strong>
        </div>
      </div>

      <div className="inventory-bag-content">
        <div className="inventory-bag-items">
          {bag.isLoading ? <div className="inventory-bag-empty">{t('inventory.bag.loading')}</div> : null}
          {bag.isError ? <div className="inventory-bag-empty error">{t('inventory.bag.loadError')}</div> : null}
          {!bag.isLoading && !bag.isError ? (bag.data ?? []).map((item) => (
            <article className="inventory-bag-item" key={`${item.item_id}-${item.enchant}`}>
              <ItemIcon itemId={item.item_id} name={item.item_name} size={46} />
              <div>
                <span className="panel-eyebrow">{t('inventory.bag.itemId', { id: item.item_id })}</span>
                <strong>{item.item_name || t('inventory.itemFallback', { id: item.item_id })}</strong>
                <small>{item.enchant > 0 ? t('inventory.bag.enchant', { enchant: item.enchant }) : t('inventory.bag.noEnchant')}</small>
              </div>
              <span className="inventory-bag-quantity">
                <small>{t('inventory.bag.quantity')}</small>
                <b>× {formatNumber(item.quantity)}</b>
              </span>
            </article>
          )) : null}
          {!bag.isLoading && !bag.isError && !bag.data?.length ? (
            <div className="inventory-bag-empty">
              <Backpack aria-hidden="true" />
              <strong>{t('inventory.bag.emptyTitle')}</strong>
              <span>{t('inventory.bag.emptyText')}</span>
            </div>
          ) : null}
        </div>

        <form className="inventory-bag-transfer" onSubmit={onTransferBag}>
          <div className="inventory-bag-transfer-heading">
            <Send aria-hidden="true" />
            <div>
              <span className="panel-eyebrow">{t('inventory.bag.transferEyebrow')}</span>
              <h3>{t('inventory.bag.transferTitle')}</h3>
            </div>
          </div>
          <p>{t('inventory.bag.transferDescription')}</p>
          <Field>
            {t('inventory.bag.destinationCharacter')}
            <select
              value={bagTransferInventoryId}
              onChange={(event) => setBagTransferInventoryId(event.target.value)}
              disabled={destinationInventories.isLoading || !bag.data?.length}
              required
            >
              <option value="">
                {destinationInventories.isLoading ? t('inventory.bag.loadingCharacters') : t('inventory.bag.selectCharacter')}
              </option>
              {(destinationInventories.data ?? []).map((inventoryRow) => (
                <option value={inventoryRow.inventory_id} key={inventoryRow.inventory_id}>
                  {t('inventory.bag.destinationOption', { character: inventoryRow.character_name, account: inventoryRow.account_name })}
                </option>
              ))}
            </select>
          </Field>
          {destinationInventories.isError ? (
            <span className="inventory-bag-transfer-error">{t('inventory.bag.charactersError')}</span>
          ) : null}
          <Button
            type="submit"
            disabled={!bag.data?.length || !bagTransferInventoryId || bagTransferPending || destinationInventories.isError}
          >
            <ArrowRightLeft aria-hidden="true" />
            {bagTransferPending ? t('inventory.bag.moving') : t('inventory.bag.move')}
          </Button>
        </form>
      </div>
    </Card>
  )
}
