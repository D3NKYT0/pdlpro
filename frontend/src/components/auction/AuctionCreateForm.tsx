import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import type { FormEvent } from 'react'
import {
  BadgeDollarSign,
  Gavel,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { ItemIcon } from '../ItemIcon'

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

interface AuctionCreateFormProps {
  inventory: InventoryRow[]
  inventoryId: string
  itemKey: string
  quantity: string
  minBid: string
  hours: string
  creating: boolean
  onInventoryChange: (value: string) => void
  onItemChange: (value: string) => void
  onQuantityChange: (value: string) => void
  onMinBidChange: (value: string) => void
  onHoursChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function AuctionCreateForm({
  inventory,
  inventoryId,
  itemKey,
  quantity,
  minBid,
  hours,
  creating,
  onInventoryChange,
  onItemChange,
  onQuantityChange,
  onMinBidChange,
  onHoursChange,
  onSubmit,
}: AuctionCreateFormProps) {
  const selectedInventory = inventory.find((row) => row.inventory_id === inventoryId)
  const selectedItem = (selectedInventory?.items ?? []).find(
    (item) => `${item.item_id}:${item.enchant}` === itemKey,
  )

  return (
    <Card className="auction-create-card">
      <div className="marketplace-section-heading compact">
        <div>
          <span className="panel-eyebrow">Novo anúncio</span>
          <h2>Criar leilão</h2>
        </div>
        <BadgeDollarSign aria-hidden="true" />
      </div>
      <form onSubmit={onSubmit}>
        <Field>
          Inventário do personagem
          <select
            value={inventoryId}
            onChange={(event) => onInventoryChange(event.target.value)}
            required
          >
            <option value="">Selecione o inventário</option>
            {inventory.map((row) => (
              <option key={row.inventory_id} value={row.inventory_id}>
                {row.character_name} — {row.items.length} itens
              </option>
            ))}
          </select>
        </Field>

        {selectedInventory ? (
          <div className="auction-inventory-summary">
            <UserRound aria-hidden="true" />
            <div>
              <span className="panel-eyebrow">Inventário selecionado</span>
              <strong>{selectedInventory.character_name}</strong>
              <small>{selectedInventory.items.length} tipos de item disponíveis</small>
            </div>
          </div>
        ) : null}

        <Field>
          Item
          <select
            value={itemKey}
            onChange={(event) => onItemChange(event.target.value)}
            required
            disabled={!selectedInventory}
          >
            <option value="">Selecione o item</option>
            {(selectedInventory?.items ?? []).map((item) => (
              <option key={`${item.id}-${item.item_id}-${item.enchant}`} value={`${item.item_id}:${item.enchant}`}>
                {item.item_name || `Item ${item.item_id}`} {item.enchant > 0 ? `+${item.enchant}` : ''} — x{item.quantity}
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
              <span className="panel-eyebrow">Item que será anunciado</span>
              <strong>{selectedItem.item_name || `Item ${selectedItem.item_id}`}</strong>
              <small>ID {selectedItem.item_id} · disponível x{selectedItem.quantity.toLocaleString('pt-BR')}</small>
              <span>{selectedItem.enchant > 0 ? `Encantamento +${selectedItem.enchant}` : 'Sem encantamento'}</span>
            </div>
          </div>
        ) : null}

        <div className="auction-form-grid">
          <Field>
            Quantidade
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
            Duração
            <select value={hours} onChange={(event) => onHoursChange(event.target.value)} required>
              <option value="1">1 hora</option>
              <option value="6">6 horas</option>
              <option value="12">12 horas</option>
              <option value="24">24 horas</option>
              <option value="48">2 dias</option>
              <option value="72">3 dias</option>
              <option value="168">7 dias</option>
            </select>
          </Field>
        </div>
        <Field>
          Lance inicial
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={minBid}
            onChange={(event) => onMinBidChange(event.target.value)}
            placeholder="0,00"
            required
          />
        </Field>
        <div className="auction-security-note">
          <ShieldCheck aria-hidden="true" />
          <span>O item sai do inventário do painel e fica reservado até o encerramento.</span>
        </div>
        <Button type="submit" disabled={!selectedItem || creating}>
          <Gavel aria-hidden="true" /> {creating ? 'Publicando...' : 'Publicar leilão'}
        </Button>
      </form>
    </Card>
  )
}
