import type { ApiCharacterListing } from '../../services/api'

/** Tradutor do namespace `panel` recebido pelas telas do marketplace. */
export type MarketplaceTranslate = (key: string, options?: Record<string, unknown>) => string

const listingStatusClasses: Record<string, string> = {
  for_sale: 'for-sale',
  sold: 'sold',
  cancelled: 'cancelled',
  disputed: 'disputed',
}

/** Rótulo e modificador visual do status de um anúncio, traduzidos no idioma ativo. */
export function listingStatusFor(status: string, t: MarketplaceTranslate) {
  const className = listingStatusClasses[status]
  if (!className) return { label: status, className: 'unknown' }
  return { label: t(`marketplace.status.${status}`), className }
}

export type ListingEquipmentItem = ApiCharacterListing['equipment'][number]
