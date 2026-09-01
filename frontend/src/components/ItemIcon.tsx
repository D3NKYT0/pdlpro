import { DEFAULT_ITEM_ICON, getItemIconPath, getL2CatalogItem, getL2CatalogItemById } from '../lib/item-icons'

interface ItemIconProps {
  itemId?: string | number | null
  name?: string | null
  size?: number
  className?: string
}

function resolveSrc(itemId?: string | number | null, name?: string | null) {
  const byId = getL2CatalogItemById(itemId)
  if (byId) return getItemIconPath(byId.id)
  const byName = getL2CatalogItem(name)
  if (byName) return getItemIconPath(byName.id)
  if (itemId !== null && itemId !== undefined && String(itemId).trim() !== '') {
    return getItemIconPath(itemId)
  }
  return DEFAULT_ITEM_ICON
}

export function ItemIcon({ itemId, name, size = 32, className = '' }: ItemIconProps) {
  const src = resolveSrc(itemId, name)
  return (
    <img
      key={src}
      className={`l2-item-icon ${className}`.trim()}
      src={src}
      alt={name || ''}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={(event) => {
        const image = event.currentTarget
        if (!image.src.includes('default.jpg')) image.src = DEFAULT_ITEM_ICON
      }}
    />
  )
}
