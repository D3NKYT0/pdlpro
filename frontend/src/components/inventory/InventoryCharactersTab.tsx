import { useTranslation } from 'react-i18next'
import {
  ArrowDownToLine,
  ArrowRightLeft,
  Backpack,
  PackageOpen,
  Send,
  UserRoundSearch,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { ItemIcon } from '../ItemIcon'
import { ItemIdField } from '../ItemIdField'
import { InventoryGameItems } from './InventoryGameItems'
import { PanelItemActionPanel } from './PanelItemActionPanel'
import type { useInventoryDashboard } from './useInventoryDashboard'

type InventoryDashboard = ReturnType<typeof useInventoryDashboard>

export function InventoryCharactersTab({ inventory }: { inventory: InventoryDashboard }) {
  const { t } = useTranslation('panel')
  const {
    login,
    accounts,
    characters,
    dashboard,
    charId,
    setCharId,
    setSelectedLogin,
    itemId,
    setItemId,
    quantity,
    setQuantity,
    onWithdraw,
    gameItemSearch,
    setGameItemSearch,
    gameItemsPageSize,
    setGameItemsPageSize,
    gameItems,
    filteredGameItems,
    visibleGameItems,
    gameItemsQuantity,
    setGameItemsPage,
    gameItemsPageCount,
    currentGameItemsPage,
    gameItemsPageStart,
    visibleGameItemPages,
    panelItemAction,
    setPanelItemAction,
    panelActionQuantity,
    setPanelActionQuantity,
    destinationLogin,
    setDestinationLogin,
    destinationInventoryId,
    setDestinationInventoryId,
    panelActionPending,
    destinationInventories,
    destinationAccounts,
    destinationCharacters,
    openPanelItemAction,
    onTrade,
    onDeposit,
  } = inventory

  return (
    <div
      className="inventory-tab-content"
      id="inventory-panel-characters"
      role="tabpanel"
      aria-labelledby="inventory-tab-characters"
    >
      <Card className="inventory-control-card">
        <div className="inventory-control-heading">
          <Backpack aria-hidden="true" />
          <div>
            <span className="panel-eyebrow">{t('inventory.characters.eyebrow')}</span>
            <h2>{t('inventory.characters.title')}</h2>
          </div>
        </div>

        {accounts.data?.accounts.length ? (
          <Field className="inventory-account-field">
            {t('inventory.characters.account')}
            <select value={login} onChange={(event) => {
              // Limpa a seleção no mesmo render para não consultar o personagem
              // anterior usando o login da nova conta.
              setCharId('')
              setSelectedLogin(event.target.value)
            }}>
              {accounts.data.accounts.map((account) => (
                <option key={account.login} value={account.login}>
                  {t(account.is_primary ? 'inventory.characters.accountPrimaryOption' : 'inventory.characters.accountOption', { login: account.login })}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {accounts.isLoading || characters.isLoading ? (
          <div className="account-empty-state">{t('inventory.characters.loadingServer')}</div>
        ) : null}

        {!accounts.isLoading && !login ? (
          <div className="account-empty-state">
            <UserRoundSearch aria-hidden="true" />
            <strong>{t('inventory.characters.noAccountTitle')}</strong>
            <span>{t('inventory.characters.noAccountText')}</span>
          </div>
        ) : null}

        {!characters.isLoading && login && !characters.data?.length ? (
          <div className="account-empty-state">
            <UserRoundSearch aria-hidden="true" />
            <strong>{t('inventory.characters.noCharactersTitle', { login })}</strong>
            <span>{t('inventory.characters.noCharactersText')}</span>
          </div>
        ) : null}

        {!characters.isLoading && Boolean(characters.data?.length) ? (
          <form className="inventory-withdraw-form" onSubmit={onWithdraw}>
            <Field>
              {t('inventory.characters.character')}
              <select value={charId} onChange={(e) => setCharId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">{t('inventory.characters.select')}</option>
                {(characters.data ?? []).map((char) => (
                  <option key={char.char_id} value={char.char_id}>
                    {t('inventory.characters.characterOption', { name: char.name, level: char.level })}
                  </option>
                ))}
              </select>
            </Field>
            <ItemIdField value={itemId} required onChange={(id) => setItemId(id)} />
            <Field>
              {t('inventory.characters.quantity')}
              <input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </Field>
            <Button type="submit">
              <ArrowDownToLine aria-hidden="true" />
              {t('inventory.characters.withdraw')}
            </Button>
          </form>
        ) : null}

        {charId ? (
          <InventoryGameItems
            search={gameItemSearch}
            onSearchChange={setGameItemSearch}
            pageSize={gameItemsPageSize}
            onPageSizeChange={setGameItemsPageSize}
            loading={gameItems.isLoading}
            error={gameItems.isError}
            filteredCount={filteredGameItems.length}
            filteredQuantity={gameItemsQuantity}
            visibleItems={visibleGameItems}
            pageStart={gameItemsPageStart}
            currentPage={currentGameItemsPage}
            pageCount={gameItemsPageCount}
            visiblePages={visibleGameItemPages}
            onPageChange={setGameItemsPage}
            onSelectItem={(selectedItemId) => {
              setItemId(String(selectedItemId))
              setQuantity('1')
            }}
          />
        ) : null}
      </Card>

      {(dashboard.data ?? []).map((row) => (
        <Card className="inventory-character-card" key={row.inventory_id}>
          <div className="inventory-character-heading">
            <PackageOpen aria-hidden="true" />
            <div>
              <span className="panel-eyebrow">{t('inventory.characters.chestEyebrow', { account: row.account_name })}</span>
              <h2>{row.character_name}</h2>
            </div>
          </div>
          <div className="inventory-panel-items">
            {row.items.map((item) => (
              <div
                className={`inventory-panel-item${panelItemAction?.recordId === item.id ? ' action-open' : ''}`}
                key={item.id}
              >
                <ItemIcon itemId={item.item_id} name={item.item_name} size={32} />
                <span>
                  <strong>{item.item_name || t('inventory.itemFallback', { id: item.item_id })}</strong>
                  <small>{t('inventory.characters.itemMeta', { enchant: item.enchant, quantity: item.quantity })}</small>
                </span>
                <div className="inventory-panel-item-actions">
                  <Button
                    className="ghost"
                    type="button"
                    disabled={panelActionPending}
                    onClick={() => openPanelItemAction({
                      mode: 'trade',
                      recordId: item.id,
                      inventoryId: row.inventory_id,
                      originAccount: row.account_name,
                      originCharacter: row.character_name,
                      itemId: item.item_id,
                      itemName: item.item_name || t('inventory.itemFallback', { id: item.item_id }),
                      availableQuantity: item.quantity,
                      enchant: item.enchant,
                    })}
                  >
                    <ArrowRightLeft aria-hidden="true" />
                    {t('inventory.characters.transfer')}
                  </Button>
                  <Button
                    className="ghost"
                    type="button"
                    disabled={panelActionPending}
                    onClick={() => openPanelItemAction({
                      mode: 'deposit',
                      recordId: item.id,
                      inventoryId: row.inventory_id,
                      originAccount: row.account_name,
                      originCharacter: row.character_name,
                      itemId: item.item_id,
                      itemName: item.item_name || t('inventory.itemFallback', { id: item.item_id }),
                      availableQuantity: item.quantity,
                      enchant: item.enchant,
                    })}
                  >
                    <Send aria-hidden="true" />
                    {t('inventory.characters.sendToGame')}
                  </Button>
                </div>

                {panelItemAction?.recordId === item.id ? (
                  <PanelItemActionPanel
                    action={panelItemAction}
                    accountName={row.account_name}
                    characterName={row.character_name}
                    inventoryId={row.inventory_id}
                    itemId={item.item_id}
                    enchant={item.enchant}
                    panelActionQuantity={panelActionQuantity}
                    onQuantityChange={setPanelActionQuantity}
                    destinationLogin={destinationLogin}
                    onDestinationLoginChange={setDestinationLogin}
                    destinationInventoryId={destinationInventoryId}
                    onDestinationInventoryIdChange={setDestinationInventoryId}
                    destinationAccounts={destinationAccounts}
                    destinationCharacters={destinationCharacters}
                    destinationsLoading={destinationInventories.isLoading}
                    destinationsError={destinationInventories.isError}
                    pending={panelActionPending}
                    onCancel={() => setPanelItemAction(null)}
                    onTrade={onTrade}
                    onDeposit={onDeposit}
                  />
                ) : null}
              </div>
            ))}
            {!row.items.length ? <div className="inventory-panel-empty">{t('inventory.characters.panelEmpty')}</div> : null}
          </div>
        </Card>
      ))}
    </div>
  )
}
