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

export const INVENTORY_TABS = ['characters', 'bag'] as const
export type InventoryTab = (typeof INVENTORY_TABS)[number]
