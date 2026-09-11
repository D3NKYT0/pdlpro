import { useTranslation } from 'react-i18next'
import { Package, Warehouse } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Tabs } from '../ui/Tabs'
import { ItemIcon } from '../ItemIcon'
import type { ApiGameItem } from '../../services/api'
import { formatCompactQuantity, formatNumber } from '../../lib/formatters'
import { CharacterItemDetailModal } from './CharacterItemDetailModal'

export type CharacterBagTab = 'inventory' | 'warehouse'

const GRID_COLUMNS = 10
const GRID_MIN_SLOTS = 80

function normalizeLocation(location: string | null | undefined): CharacterBagTab {
  return location?.toUpperCase() === 'WAREHOUSE' ? 'warehouse' : 'inventory'
}

function BagSlot({
  item,
  onSelect,
}: {
  item?: ApiGameItem
  onSelect: (item: ApiGameItem) => void
}) {
  const { t } = useTranslation('panel')
  if (!item) {
    return <div className="character-bag-slot is-empty" aria-hidden="true" />
  }
  const enchant = item.enchant > 0 ? `+${item.enchant}` : ''
  const compactQty = formatCompactQuantity(item.quantity)
  const fullQty = formatNumber(item.quantity)
  const title = `${item.name}${enchant ? ` ${enchant}` : ''} · ${t('character.bag.itemId', { id: item.item_id })} · ${fullQty}`
  return (
    <button
      type="button"
      className="character-bag-slot is-filled"
      title={title}
      aria-label={t('character.bag.slotAria', {
        name: item.name,
        enchant: enchant || t('character.bag.noEnchant'),
        quantity: compactQty,
      })}
      onClick={() => onSelect(item)}
    >
      <ItemIcon itemId={item.item_id} name={item.name} size={34} />
      {enchant ? <span className="character-bag-slot-enchant">{enchant}</span> : null}
      {item.quantity > 1 ? <span className="character-bag-slot-qty">{compactQty}</span> : null}
    </button>
  )
}

export function CharacterBagPanel({
  items,
  loading,
  error,
  tabsId = 'character-bag',
}: {
  items: ApiGameItem[]
  loading: boolean
  error: boolean
  tabsId?: string
}) {
  const { t } = useTranslation('panel')
  const [tab, setTab] = useState<CharacterBagTab>('inventory')
  const [selected, setSelected] = useState<ApiGameItem | null>(null)

  const visibleItems = useMemo(
    () => items.filter((item) => normalizeLocation(item.location) === tab),
    [items, tab],
  )

  const slots = useMemo(() => {
    const size = Math.max(GRID_MIN_SLOTS, Math.ceil(visibleItems.length / GRID_COLUMNS) * GRID_COLUMNS)
    return Array.from({ length: size }, (_, index) => visibleItems[index])
  }, [visibleItems])

  return (
    <section className="character-bag" aria-label={t('character.bag.sectionLabel')}>
      <Tabs
        id={tabsId}
        label={t('character.bag.tabsLabel')}
        className="character-bag-tabs"
        value={tab}
        onChange={setTab}
        items={[
          {
            id: 'inventory',
            label: t('character.bag.tabs.inventory'),
            icon: <Package aria-hidden="true" />,
          },
          {
            id: 'warehouse',
            label: t('character.bag.tabs.warehouse'),
            icon: <Warehouse aria-hidden="true" />,
          },
        ]}
      />

      <div
        id={`${tabsId}-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${tab}`}
        className="character-bag-panel"
      >
        {loading ? <div className="character-bag-message">{t('character.bag.loading')}</div> : null}
        {error ? <div className="character-bag-message is-error">{t('character.bag.error')}</div> : null}
        {!loading && !error ? (
          <div
            className="character-bag-grid"
            style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
            aria-label={t(`character.bag.gridLabel.${tab}`)}
          >
            {slots.map((item, index) => (
              <BagSlot
                key={item ? `${item.location}-${item.item_id}-${item.enchant}-${index}` : `empty-${index}`}
                item={item}
                onSelect={setSelected}
              />
            ))}
          </div>
        ) : null}
      </div>

      <CharacterItemDetailModal item={selected} onClose={() => setSelected(null)} />
    </section>
  )
}
