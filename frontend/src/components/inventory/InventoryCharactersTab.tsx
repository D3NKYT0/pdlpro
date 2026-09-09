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
            <span className="panel-eyebrow">Conta ativa</span>
            <h2>Consultar personagem</h2>
          </div>
        </div>

        {accounts.data?.accounts.length ? (
          <Field className="inventory-account-field">
            Conta Lineage
            <select value={login} onChange={(event) => {
              // Limpa a seleção no mesmo render para não consultar o personagem
              // anterior usando o login da nova conta.
              setCharId('')
              setSelectedLogin(event.target.value)
            }}>
              {accounts.data.accounts.map((account) => (
                <option key={account.login} value={account.login}>
                  {account.login}{account.is_primary ? ' — principal' : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {accounts.isLoading || characters.isLoading ? (
          <div className="account-empty-state">Carregando dados do servidor...</div>
        ) : null}

        {!accounts.isLoading && !login ? (
          <div className="account-empty-state">
            <UserRoundSearch aria-hidden="true" />
            <strong>Nenhuma conta Lineage vinculada</strong>
            <span>Crie ou vincule uma conta na seção Conta L2 antes de acessar o inventário.</span>
          </div>
        ) : null}

        {!characters.isLoading && login && !characters.data?.length ? (
          <div className="account-empty-state">
            <UserRoundSearch aria-hidden="true" />
            <strong>A conta {login} ainda não possui personagens</strong>
            <span>Crie um personagem dentro do jogo e use Atualizar para carregá-lo aqui.</span>
          </div>
        ) : null}

        {!characters.isLoading && Boolean(characters.data?.length) ? (
          <form className="inventory-withdraw-form" onSubmit={onWithdraw}>
            <Field>
              Personagem
              <select value={charId} onChange={(e) => setCharId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Selecione</option>
                {(characters.data ?? []).map((char) => (
                  <option key={char.char_id} value={char.char_id}>
                    {char.name} — nível {char.level}
                  </option>
                ))}
              </select>
            </Field>
            <ItemIdField value={itemId} required onChange={(id) => setItemId(id)} />
            <Field>
              Quantidade
              <input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </Field>
            <Button type="submit">
              <ArrowDownToLine aria-hidden="true" />
              Retirar do jogo
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
              <span className="panel-eyebrow">Baú do painel · conta {row.account_name}</span>
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
                  <strong>{item.item_name || `Item ${item.item_id}`}</strong>
                  <small>+{item.enchant} · quantidade {item.quantity}</small>
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
                      itemName: item.item_name || `Item ${item.item_id}`,
                      availableQuantity: item.quantity,
                      enchant: item.enchant,
                    })}
                  >
                    <ArrowRightLeft aria-hidden="true" />
                    Transferir
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
                      itemName: item.item_name || `Item ${item.item_id}`,
                      availableQuantity: item.quantity,
                      enchant: item.enchant,
                    })}
                  >
                    <Send aria-hidden="true" />
                    Enviar ao jogo
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
            {!row.items.length ? <div className="inventory-panel-empty">Nenhum item guardado no painel.</div> : null}
          </div>
        </Card>
      ))}
    </div>
  )
}
