import type { ApiCharacterListing } from '../../services/api'

export const listingStatus: Record<string, { label: string; className: string }> = {
  for_sale: { label: 'À venda', className: 'for-sale' },
  sold: { label: 'Vendido', className: 'sold' },
  cancelled: { label: 'Cancelado', className: 'cancelled' },
  disputed: { label: 'Em disputa', className: 'disputed' },
}

export type ListingEquipmentItem = ApiCharacterListing['equipment'][number]
