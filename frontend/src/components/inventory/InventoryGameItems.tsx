import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '../ui/Button'
import { ItemIcon } from '../ItemIcon'
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
  return (
    <section className="inventory-game-items" aria-labelledby="inventory-game-items-title">
      <div className="inventory-game-items-heading">
        <div>
          <span className="panel-eyebrow">Mochila no jogo</span>
          <h3 id="inventory-game-items-title">Itens no personagem</h3>
        </div>
        {!loading && !error ? (
          <span className="inventory-game-items-summary">
            {filteredCount} {filteredCount === 1 ? 'item' : 'itens'}
            <b aria-hidden="true">·</b>
            {filteredQuantity.toLocaleString('pt-BR')} unidades
          </span>
        ) : null}
      </div>

      <div className="inventory-game-toolbar">
        <label className="inventory-game-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Buscar item no personagem</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nome ou ID"
          />
        </label>
        <label className="inventory-game-page-size">
          <span>Por página</span>
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
        <div className="inventory-game-state">Carregando itens do personagem...</div>
      ) : null}

      {error ? (
        <div className="inventory-game-state inventory-game-state-error">
          Não foi possível carregar os itens. Use Atualizar e tente novamente.
        </div>
      ) : null}

      {!loading && !error && visibleItems.length ? (
        <div className="inventory-game-table" role="table" aria-label="Itens no personagem">
          <div className="inventory-game-table-head" role="row">
            <span role="columnheader">Item</span>
            <span role="columnheader">ID</span>
            <span role="columnheader">Encanto</span>
            <span role="columnheader">Quantidade</span>
            <span className="sr-only" role="columnheader">Ação</span>
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
                    <strong>{item.name || `Item ${item.item_id}`}</strong>
                    <small>
                      {item.enchant > 0 ? `Equipamento +${item.enchant}` : 'Item do personagem'}
                      {' · '}
                      <b className={item.tradeable ? 'tradeable' : 'not-tradeable'}>
                        {item.tradeable ? 'Negociável' : 'Não negociável'}
                      </b>
                    </small>
                  </span>
                </div>
                <span className="inventory-game-item-data" role="cell" data-label="ID">
                  <small>ID</small>
                  <b>#{item.item_id}</b>
                </span>
                <span className="inventory-game-item-data" role="cell" data-label="Encanto">
                  <small>Encanto</small>
                  <b>{item.enchant > 0 ? `+${item.enchant}` : '—'}</b>
                </span>
                <span className="inventory-game-item-data inventory-game-item-quantity" role="cell" data-label="Quantidade">
                  <small>Quantidade</small>
                  <b>{item.quantity.toLocaleString('pt-BR')}</b>
                </span>
                <Button
                  className="ghost inventory-game-select"
                  type="button"
                  disabled={!item.tradeable}
                  title={item.tradeable ? 'Selecionar para retirada' : 'Este item possui tradeable=false'}
                  onClick={() => onSelectItem(item.item_id)}
                >
                  {item.tradeable ? 'Selecionar' : 'Bloqueado'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !error && !visibleItems.length ? (
        <div className="inventory-game-state">
          {search ? 'Nenhum item corresponde à busca.' : 'Este personagem não possui itens no inventário.'}
        </div>
      ) : null}

      {!loading && !error && filteredCount ? (
        <nav className="inventory-game-pagination" aria-label="Paginação dos itens">
          <span>
            Exibindo {pageStart + 1}–{Math.min(pageStart + pageSize, filteredCount)} de {filteredCount}
          </span>
          <div>
            <button
              type="button"
              aria-label="Página anterior"
              onClick={() => onPageChange((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            {visiblePages.map((page) => (
              <button
                className={page === currentPage ? 'active' : ''}
                type="button"
                aria-label={`Página ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(page)}
                key={page}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              aria-label="Próxima página"
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
