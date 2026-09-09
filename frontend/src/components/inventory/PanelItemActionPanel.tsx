import type { FormEvent } from 'react'
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
  if (action.mode === 'trade') {
    return (
      <form className="inventory-item-action-panel" onSubmit={onTrade}>
        <div className="inventory-item-action-heading">
          <ArrowRightLeft aria-hidden="true" />
          <div>
            <span className="panel-eyebrow">Transferência entre personagens</span>
            <strong>{action.itemName}</strong>
            <small>Origem: conta {action.originAccount} · {action.originCharacter}</small>
          </div>
        </div>

        <div className="inventory-item-action-fields">
          <Field>
            Conta de destino
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
                {destinationsLoading ? 'Carregando contas...' : 'Selecione a conta'}
              </option>
              {destinationAccounts.map((account) => (
                <option value={account.login} key={account.login}>
                  {account.login}{account.is_primary ? ' — principal' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            Personagem de destino
            <select
              value={destinationInventoryId}
              onChange={(event) => onDestinationInventoryIdChange(event.target.value)}
              disabled={!destinationLogin}
              required
            >
              <option value="">Selecione o personagem</option>
              {destinationCharacters.map((inventory) => (
                <option value={inventory.inventory_id} key={inventory.inventory_id}>
                  {inventory.character_name} — nível {inventory.character.level}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            Quantidade
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
            Não foi possível carregar os personagens de destino. Use Atualizar e tente novamente.
          </p>
        ) : null}

        {!destinationsLoading && !destinationsError && !destinationAccounts.length ? (
          <p className="inventory-item-action-notice">
            Não existe outro personagem disponível para receber este item.
          </p>
        ) : null}

        <div className="inventory-item-action-buttons">
          <Button className="ghost" type="button" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={pending || destinationsError || !destinationInventoryId}
          >
            <ArrowRightLeft aria-hidden="true" />
            {pending ? 'Transferindo...' : 'Confirmar transferência'}
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
          <span className="panel-eyebrow">Confirmar envio ao jogo</span>
          <strong>{action.itemName}</strong>
          <small>Destino: conta {accountName} · personagem {characterName}</small>
        </div>
      </div>
      <Field className="inventory-deposit-quantity">
        Quantidade
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
        O item sairá do painel e entrará na fila de entrega deste personagem.
      </p>
      <div className="inventory-item-action-buttons">
        <Button className="ghost" type="button" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          <Send aria-hidden="true" />
          {pending ? 'Enviando...' : `Enviar para ${characterName}`}
        </Button>
      </div>
    </form>
  )
}
