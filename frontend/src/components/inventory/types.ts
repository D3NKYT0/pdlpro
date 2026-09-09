export interface PanelItemAction {
  mode: 'trade' | 'deposit'
  recordId: string
  inventoryId: string
  originAccount: string
  originCharacter: string
  itemId: number
  itemName: string
  availableQuantity: number
  enchant: number
}

export type InventoryTab = 'characters' | 'bag'
