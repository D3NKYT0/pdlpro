import { ArrowRightLeft, Backpack, Send } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { ItemIcon } from '../ItemIcon'
import type { useInventoryDashboard } from './useInventoryDashboard'

type InventoryDashboard = ReturnType<typeof useInventoryDashboard>

export function InventoryBagTab({ inventory }: { inventory: InventoryDashboard }) {
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
            <span className="panel-eyebrow">Armazenamento do site</span>
            <h2>Bag do site</h2>
            <p>Prêmios e recompensas ficam guardados aqui antes de serem enviados ao jogo.</p>
          </div>
        </div>
        <div className="inventory-bag-summary">
          <span>{bag.data?.length ?? 0} tipos</span>
          <strong>{bagItemsQuantity.toLocaleString('pt-BR')} itens</strong>
        </div>
      </div>

      <div className="inventory-bag-content">
        <div className="inventory-bag-items">
          {bag.isLoading ? <div className="inventory-bag-empty">Carregando itens da Bag...</div> : null}
          {bag.isError ? <div className="inventory-bag-empty error">Não foi possível carregar a Bag.</div> : null}
          {!bag.isLoading && !bag.isError ? (bag.data ?? []).map((item) => (
            <article className="inventory-bag-item" key={`${item.item_id}-${item.enchant}`}>
              <ItemIcon itemId={item.item_id} name={item.item_name} size={46} />
              <div>
                <span className="panel-eyebrow">ID #{item.item_id}</span>
                <strong>{item.item_name || `Item ${item.item_id}`}</strong>
                <small>{item.enchant > 0 ? `Encantamento +${item.enchant}` : 'Sem encantamento'}</small>
              </div>
              <span className="inventory-bag-quantity">
                <small>Quantidade</small>
                <b>× {item.quantity.toLocaleString('pt-BR')}</b>
              </span>
            </article>
          )) : null}
          {!bag.isLoading && !bag.isError && !bag.data?.length ? (
            <div className="inventory-bag-empty">
              <Backpack aria-hidden="true" />
              <strong>Sua Bag está vazia</strong>
              <span>Prêmios obtidos no site aparecerão aqui.</span>
            </div>
          ) : null}
        </div>

        <form className="inventory-bag-transfer" onSubmit={onTransferBag}>
          <div className="inventory-bag-transfer-heading">
            <Send aria-hidden="true" />
            <div>
              <span className="panel-eyebrow">Preparar envio</span>
              <h3>Mover para um personagem</h3>
            </div>
          </div>
          <p>
            Escolha o personagem. Os itens entrarão no inventário dele no painel e ficarão prontos para usar “Enviar ao jogo”.
          </p>
          <Field>
            Personagem de destino
            <select
              value={bagTransferInventoryId}
              onChange={(event) => setBagTransferInventoryId(event.target.value)}
              disabled={destinationInventories.isLoading || !bag.data?.length}
              required
            >
              <option value="">
                {destinationInventories.isLoading ? 'Carregando personagens...' : 'Selecione o personagem'}
              </option>
              {(destinationInventories.data ?? []).map((inventoryRow) => (
                <option value={inventoryRow.inventory_id} key={inventoryRow.inventory_id}>
                  {inventoryRow.character_name} — conta {inventoryRow.account_name}
                </option>
              ))}
            </select>
          </Field>
          {destinationInventories.isError ? (
            <span className="inventory-bag-transfer-error">Não foi possível carregar os personagens.</span>
          ) : null}
          <Button
            type="submit"
            disabled={!bag.data?.length || !bagTransferInventoryId || bagTransferPending || destinationInventories.isError}
          >
            <ArrowRightLeft aria-hidden="true" />
            {bagTransferPending ? 'Movendo itens...' : 'Mover para o inventário'}
          </Button>
        </form>
      </div>
    </Card>
  )
}
