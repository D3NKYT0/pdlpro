import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowDownToLine,
  Backpack,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  RefreshCcw,
  Search,
  UserRoundSearch,
} from 'lucide-react'
import { inventoryApi, isApiError, lineageApi } from '../services/api'
import { ItemIcon } from '../components/ItemIcon'
import { ItemIdField } from '../components/ItemIdField'

export function InventoryPage() {
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['lineage-accounts'], queryFn: lineageApi.accounts })
  const [selectedLogin, setSelectedLogin] = useState('')
  const primaryLogin = accounts.data?.accounts.find((account) => account.is_primary)?.login
  const fallbackLogin = primaryLogin ?? accounts.data?.accounts[0]?.login ?? ''
  const login = selectedLogin || fallbackLogin
  const dashboard = useQuery({
    queryKey: ['inventory', login],
    queryFn: () => inventoryApi.dashboard(login),
    enabled: Boolean(login),
  })
  const characters = useQuery({
    queryKey: ['characters', login],
    queryFn: () => lineageApi.characters(login),
    enabled: Boolean(login),
  })
  const [charId, setCharId] = useState<number | ''>('')
  const [itemId, setItemId] = useState('57')
  const [quantity, setQuantity] = useState('1')
  const [gameItemSearch, setGameItemSearch] = useState('')
  const [gameItemsPage, setGameItemsPage] = useState(1)
  const [gameItemsPageSize, setGameItemsPageSize] = useState(8)

  const gameItems = useQuery({
    queryKey: ['game-items', login, charId],
    queryFn: () => inventoryApi.gameItems(Number(charId), login),
    enabled: Boolean(charId),
  })

  useEffect(() => {
    setCharId('')
  }, [login])

  useEffect(() => {
    setGameItemsPage(1)
  }, [login, charId, gameItemSearch, gameItemsPageSize])

  const normalizedGameItemSearch = gameItemSearch.trim().toLocaleLowerCase('pt-BR')
  const filteredGameItems = (gameItems.data ?? []).filter((item) => {
    if (!normalizedGameItemSearch) return true
    return item.name.toLocaleLowerCase('pt-BR').includes(normalizedGameItemSearch)
      || String(item.item_id).includes(normalizedGameItemSearch)
  })
  const gameItemsPageCount = Math.max(1, Math.ceil(filteredGameItems.length / gameItemsPageSize))
  const currentGameItemsPage = Math.min(gameItemsPage, gameItemsPageCount)
  const gameItemsPageStart = (currentGameItemsPage - 1) * gameItemsPageSize
  const visibleGameItems = filteredGameItems.slice(gameItemsPageStart, gameItemsPageStart + gameItemsPageSize)
  const gameItemPageWindowStart = Math.max(1, Math.min(currentGameItemsPage - 2, gameItemsPageCount - 4))
  const visibleGameItemPages = Array.from(
    { length: Math.min(5, gameItemsPageCount) },
    (_, index) => gameItemPageWindowStart + index,
  )
  const gameItemsQuantity = filteredGameItems.reduce((total, item) => total + item.quantity, 0)

  useEffect(() => {
    setGameItemsPage((page) => Math.min(page, gameItemsPageCount))
  }, [gameItemsPageCount])

  async function refreshInventory() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['characters', login] }),
      queryClient.invalidateQueries({ queryKey: ['inventory', login] }),
    ])
  }

  async function onWithdraw(event: FormEvent) {
    event.preventDefault()
    try {
      await inventoryApi.withdraw({
        login,
        char_id: Number(charId),
        item_id: Number(itemId),
        quantity: Number(quantity),
      })
      toast.success('Item retirado para o painel')
      await queryClient.invalidateQueries({ queryKey: ['inventory', login] })
      await queryClient.invalidateQueries({ queryKey: ['game-items'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha na retirada')
    }
  }

  async function onDeposit(inventoryId: string, depositItemId: number, enchant: number) {
    try {
      await inventoryApi.deposit({
        login,
        inventory_id: inventoryId,
        item_id: depositItemId,
        quantity: 1,
        enchant,
      })
      toast.success('Item enviado ao personagem')
      await queryClient.invalidateQueries({ queryKey: ['inventory', login] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no depósito')
    }
  }

  return (
    <div className="grid inventory-page">
      <section className="card inventory-hero">
        <div>
          <span className="panel-eyebrow">Armazém do aventureiro</span>
          <h1>Inventário</h1>
          <p className="muted">Transfira itens entre seus personagens e o painel com segurança.</p>
        </div>
        <button className="btn ghost inventory-refresh" type="button" onClick={() => void refreshInventory()} disabled={!login}>
          <RefreshCcw aria-hidden="true" />
          Atualizar
        </button>
      </section>

      <section className="card inventory-control-card">
        <div className="inventory-control-heading">
          <Backpack aria-hidden="true" />
          <div>
            <span className="panel-eyebrow">Conta ativa</span>
            <h2>Consultar personagem</h2>
          </div>
        </div>

        {accounts.data?.accounts.length ? (
          <label className="field inventory-account-field">
            Conta Lineage
            <select value={login} onChange={(event) => setSelectedLogin(event.target.value)}>
              {accounts.data.accounts.map((account) => (
                <option key={account.login} value={account.login}>
                  {account.login}{account.is_primary ? ' — principal' : ''}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {accounts.isLoading || characters.isLoading ? (
          <div className="account-empty-state">Carregando dados do servidor...</div>
        ) : null}

        {!accounts.isLoading && !login ? (
          <div className="account-empty-state">
            <UserRoundSearch aria-hidden="true" />
            <strong>Nenhuma conta Lineage vinculada</strong>
            <span>Crie ou vincule uma conta na seção Conta L2 antes de acessar o inventário.</span>
          </div>
        ) : null}

        {!characters.isLoading && login && !characters.data?.length ? (
          <div className="account-empty-state">
            <UserRoundSearch aria-hidden="true" />
            <strong>A conta {login} ainda não possui personagens</strong>
            <span>Crie um personagem dentro do jogo e use Atualizar para carregá-lo aqui.</span>
          </div>
        ) : null}

        {!characters.isLoading && Boolean(characters.data?.length) ? (
          <form className="inventory-withdraw-form" onSubmit={onWithdraw}>
            <label className="field">
              Personagem
              <select value={charId} onChange={(e) => setCharId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Selecione</option>
                {(characters.data ?? []).map((char) => (
                  <option key={char.char_id} value={char.char_id}>
                    {char.name} — nível {char.level}
                  </option>
                ))}
              </select>
            </label>
            <ItemIdField value={itemId} required onChange={(id) => setItemId(id)} />
            <label className="field">
              Quantidade
              <input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </label>
            <button className="btn" type="submit">
              <ArrowDownToLine aria-hidden="true" />
              Retirar do jogo
            </button>
          </form>
        ) : null}

        {charId ? (
          <section className="inventory-game-items" aria-labelledby="inventory-game-items-title">
            <div className="inventory-game-items-heading">
              <div>
                <span className="panel-eyebrow">Mochila no jogo</span>
                <h3 id="inventory-game-items-title">Itens no personagem</h3>
              </div>
              {!gameItems.isLoading && !gameItems.isError ? (
                <span className="inventory-game-items-summary">
                  {filteredGameItems.length} {filteredGameItems.length === 1 ? 'item' : 'itens'}
                  <b aria-hidden="true">·</b>
                  {gameItemsQuantity.toLocaleString('pt-BR')} unidades
                </span>
              ) : null}
            </div>

            <div className="inventory-game-toolbar">
              <label className="inventory-game-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Buscar item no personagem</span>
                <input
                  type="search"
                  value={gameItemSearch}
                  onChange={(event) => setGameItemSearch(event.target.value)}
                  placeholder="Buscar por nome ou ID"
                />
              </label>
              <label className="inventory-game-page-size">
                <span>Por página</span>
                <select
                  value={gameItemsPageSize}
                  onChange={(event) => setGameItemsPageSize(Number(event.target.value))}
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </select>
              </label>
            </div>

            {gameItems.isLoading ? (
              <div className="inventory-game-state">Carregando itens do personagem...</div>
            ) : null}

            {gameItems.isError ? (
              <div className="inventory-game-state inventory-game-state-error">
                Não foi possível carregar os itens. Use Atualizar e tente novamente.
              </div>
            ) : null}

            {!gameItems.isLoading && !gameItems.isError && visibleGameItems.length ? (
              <div className="inventory-game-table" role="table" aria-label="Itens no personagem">
                <div className="inventory-game-table-head" role="row">
                  <span role="columnheader">Item</span>
                  <span role="columnheader">ID</span>
                  <span role="columnheader">Encanto</span>
                  <span role="columnheader">Quantidade</span>
                  <span className="sr-only" role="columnheader">Ação</span>
                </div>
                <div className="inventory-game-table-body" role="rowgroup">
                  {visibleGameItems.map((item, index) => (
                    <div className="inventory-game-item" role="row" key={`${item.item_id}-${item.enchant}-${index}`}>
                      <div className="inventory-game-item-main" role="cell">
                        <ItemIcon itemId={item.item_id} name={item.name} size={42} />
                        <span>
                          <strong>{item.name || `Item ${item.item_id}`}</strong>
                          <small>{item.enchant > 0 ? `Equipamento +${item.enchant}` : 'Item do personagem'}</small>
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
                      <button
                        className="btn ghost inventory-game-select"
                        type="button"
                        onClick={() => {
                          setItemId(String(item.item_id))
                          setQuantity('1')
                        }}
                      >
                        Selecionar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!gameItems.isLoading && !gameItems.isError && !visibleGameItems.length ? (
              <div className="inventory-game-state">
                {gameItemSearch ? 'Nenhum item corresponde à busca.' : 'Este personagem não possui itens no inventário.'}
              </div>
            ) : null}

            {!gameItems.isLoading && !gameItems.isError && filteredGameItems.length ? (
              <nav className="inventory-game-pagination" aria-label="Paginação dos itens">
                <span>
                  Exibindo {gameItemsPageStart + 1}–{Math.min(gameItemsPageStart + gameItemsPageSize, filteredGameItems.length)} de {filteredGameItems.length}
                </span>
                <div>
                  <button
                    type="button"
                    aria-label="Página anterior"
                    onClick={() => setGameItemsPage((page) => Math.max(1, page - 1))}
                    disabled={currentGameItemsPage === 1}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  {visibleGameItemPages.map((page) => (
                    <button
                      className={page === currentGameItemsPage ? 'active' : ''}
                      type="button"
                      aria-label={`Página ${page}`}
                      aria-current={page === currentGameItemsPage ? 'page' : undefined}
                      onClick={() => setGameItemsPage(page)}
                      key={page}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Próxima página"
                    onClick={() => setGameItemsPage((page) => Math.min(gameItemsPageCount, page + 1))}
                    disabled={currentGameItemsPage === gameItemsPageCount}
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </nav>
            ) : null}
          </section>
        ) : null}
      </section>

      {(dashboard.data ?? []).map((row) => (
        <section className="card inventory-character-card" key={row.inventory_id}>
          <div className="inventory-character-heading">
            <PackageOpen aria-hidden="true" />
            <div>
              <span className="panel-eyebrow">Baú do painel</span>
              <h2>{row.character_name}</h2>
            </div>
          </div>
          <div className="inventory-panel-items">
            {row.items.map((item) => (
              <div className="inventory-panel-item" key={item.id}>
                <ItemIcon itemId={item.item_id} name={item.item_name} size={32} />
                <span>
                  <strong>{item.item_name || `Item ${item.item_id}`}</strong>
                  <small>+{item.enchant} · quantidade {item.quantity}</small>
                </span>
                <button className="btn ghost" type="button" onClick={() => void onDeposit(row.inventory_id, item.item_id, item.enchant)}>
                  Enviar ao jogo
                </button>
              </div>
            ))}
            {!row.items.length ? <div className="inventory-panel-empty">Nenhum item guardado no painel.</div> : null}
          </div>
        </section>
      ))}
    </div>
  )
}
