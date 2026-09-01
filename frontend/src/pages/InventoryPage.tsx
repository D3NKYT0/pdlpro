import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowDownToLine, Backpack, PackageOpen, RefreshCcw, UserRoundSearch } from 'lucide-react'
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

  const gameItems = useQuery({
    queryKey: ['game-items', login, charId],
    queryFn: () => inventoryApi.gameItems(Number(charId), login),
    enabled: Boolean(charId),
  })

  useEffect(() => {
    setCharId('')
  }, [login])

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

        {gameItems.data?.length ? (
          <div className="inventory-game-items">
            <strong>Itens no personagem</strong>
            <span>{gameItems.data.map((item) => `${item.name} x${item.quantity}`).join(', ')}</span>
          </div>
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
