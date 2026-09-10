import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '../ui/Button'
import { ItemIcon } from '../ItemIcon'
import { formatNumber } from '../../lib/formatters'
import type { ApiGameItem } from '../../services/api'

interface InventoryGameItemsProps {
  search: string
  onSearchChange: (value: string) => void
  pageSize: number
  onPageSizeChange: (value: number) => void
  loading: boolean
  error: boolean
  filteredCount: number
  filteredQuantity: number
  visibleItems: ApiGameItem[]
  pageStart: number
  currentPage: number
  pageCount: number
  visiblePages: number[]
  onPageChange: (page: number | ((page: number) => number)) => void
  onSelectItem: (itemId: number) => void
}

export function InventoryGameItems({
  search,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  loading,
  error,
  filteredCount,
  filteredQuantity,
  visibleItems,
  pageStart,
  currentPage,
  pageCount,
  visiblePages,
  onPageChange,
  onSelectItem,
}: InventoryGameItemsProps) {
  const { t } = useTranslation('panel')

  return (
    <section className="inventory-game-items" aria-labelledby="inventory-game-items-title">
      <div className="inventory-game-items-heading">
        <div>
          <span className="panel-eyebrow">{t('inventory.gameItems.eyebrow')}</span>
          <h3 id="inventory-game-items-title">{t('inventory.gameItems.title')}</h3>
        </div>
        {!loading && !error ? (
          <span className="inventory-game-items-summary">
            {t('inventory.gameItems.count', { count: filteredCount })}
            <b aria-hidden="true">·</b>
            {t('inventory.gameItems.units', { total: formatNumber(filteredQuantity) })}
          </span>
        ) : null}
      </div>

      <div className="inventory-game-toolbar">
        <label className="inventory-game-search">
          <Search aria-hidden="true" />
          <span className="sr-only">{t('inventory.gameItems.searchLabel')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('inventory.gameItems.searchPlaceholder')}
          />
        </label>
        <label className="inventory-game-page-size">
          <span>{t('inventory.gameItems.pageSize')}</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            <option value={8}>8</option>
            <option value={16}>16</option>
            <option value={32}>32</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="inventory-game-state">{t('inventory.gameItems.loading')}</div>
      ) : null}

      {error ? (
        <div className="inventory-game-state inventory-game-state-error">
          {t('inventory.gameItems.error')}
        </div>
      ) : null}

      {!loading && !error && visibleItems.length ? (
        <div className="inventory-game-table" role="table" aria-label={t('inventory.gameItems.title')}>
          <div className="inventory-game-table-head" role="row">
            <span role="columnheader">{t('inventory.gameItems.columnItem')}</span>
            <span role="columnheader">{t('inventory.gameItems.columnId')}</span>
            <span role="columnheader">{t('inventory.gameItems.columnEnchant')}</span>
            <span role="columnheader">{t('inventory.gameItems.columnQuantity')}</span>
            <span className="sr-only" role="columnheader">{t('inventory.gameItems.columnAction')}</span>
          </div>
          <div className="inventory-game-table-body" role="rowgroup">
            {visibleItems.map((item, index) => (
              <div
                className={`inventory-game-item${item.tradeable ? '' : ' not-tradeable'}`}
                role="row"
                key={`${item.item_id}-${item.enchant}-${index}`}
              >
                <div className="inventory-game-item-main" role="cell">
                  <ItemIcon itemId={item.item_id} name={item.name} size={42} />
                  <span>
                    <strong>{item.name || t('inventory.itemFallback', { id: item.item_id })}</strong>
                    <small>
                      {item.enchant > 0 ? t('inventory.gameItems.equipmentEnchant', { enchant: item.enchant }) : t('inventory.gameItems.characterItem')}
                      {' · '}
                      <b className={item.tradeable ? 'tradeable' : 'not-tradeable'}>
                        {item.tradeable ? t('inventory.gameItems.tradeable') : t('inventory.gameItems.notTradeable')}
                      </b>
                    </small>
                  </span>
                </div>
                <span className="inventory-game-item-data" role="cell" data-label={t('inventory.gameItems.columnId')}>
                  <small>{t('inventory.gameItems.columnId')}</small>
                  <b>#{item.item_id}</b>
                </span>
                <span className="inventory-game-item-data" role="cell" data-label={t('inventory.gameItems.columnEnchant')}>
                  <small>{t('inventory.gameItems.columnEnchant')}</small>
                  <b>{item.enchant > 0 ? `+${item.enchant}` : '—'}</b>
                </span>
                <span className="inventory-game-item-data inventory-game-item-quantity" role="cell" data-label={t('inventory.gameItems.columnQuantity')}>
                  <small>{t('inventory.gameItems.columnQuantity')}</small>
                  <b>{formatNumber(item.quantity)}</b>
                </span>
                <Button
                  className="ghost inventory-game-select"
                  type="button"
                  disabled={!item.tradeable}
                  title={item.tradeable ? t('inventory.gameItems.selectTitle') : t('inventory.gameItems.blockedTitle')}
                  onClick={() => onSelectItem(item.item_id)}
                >
                  {item.tradeable ? t('inventory.gameItems.select') : t('inventory.gameItems.blocked')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !error && !visibleItems.length ? (
        <div className="inventory-game-state">
          {search ? t('inventory.gameItems.emptySearch') : t('inventory.gameItems.emptyCharacter')}
        </div>
      ) : null}

      {!loading && !error && filteredCount ? (
        <nav className="inventory-game-pagination" aria-label={t('inventory.gameItems.paginationLabel')}>
          <span>
            {t('inventory.gameItems.showing', {
              from: pageStart + 1,
              to: Math.min(pageStart + pageSize, filteredCount),
              total: filteredCount,
            })}
          </span>
          <div>
            <button
              type="button"
              aria-label={t('inventory.gameItems.previousPage')}
              onClick={() => onPageChange((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            {visiblePages.map((page) => (
              <button
                className={page === currentPage ? 'active' : ''}
                type="button"
                aria-label={t('inventory.gameItems.page', { page })}
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(page)}
                key={page}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              aria-label={t('inventory.gameItems.nextPage')}
              onClick={() => onPageChange((page) => Math.min(pageCount, page + 1))}
              disabled={currentPage === pageCount}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  )
}
