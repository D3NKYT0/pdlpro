import { useItemCatalog } from '../lib/item-icons'

interface ItemIconProps {
  itemId?: string | number | null
  name?: string | null
  size?: number
  className?: string
}

export function ItemIcon({ itemId, name, size = 32, className = '' }: ItemIconProps) {
  const catalog = useItemCatalog()
  const item = catalog.getById(itemId)
  const fallback = catalog.data?.default_icon_url
  const src = item?.icon_url || fallback
  if (!src) return <span className={`l2-item-icon ${className}`} aria-label={catalog.isError ? 'Ícone indisponível' : 'Carregando ícone'} style={{ display: 'inline-block', width: size, height: size }} />
  return (
    <img
      key={src}
      className={`l2-item-icon ${className}`.trim()}
      src={src}
      alt={item?.name || name || ''}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={(event) => {
        const image = event.currentTarget
        if (fallback && image.getAttribute('src') !== fallback) image.src = fallback
      }}
    />
  )
}
