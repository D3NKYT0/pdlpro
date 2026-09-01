import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { shopApi } from '../services/api'
import { isApiError } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { ItemIcon } from '../components/ItemIcon'

export function ShopPage() {
  const { user } = useAuth()
  const catalog = useQuery({ queryKey: ['shop'], queryFn: shopApi.catalog })

  async function buy(id: string) {
    try {
      await shopApi.addToCart(id)
      toast.success('Item adicionado ao carrinho')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível adicionar')
    }
  }

  return (
    <section className="card">
      <h1>Loja</h1>
      <div className="grid cols-3">
        {(catalog.data ?? []).map((item) => (
          <article className="card" key={item.id}>
            <div className="item-cell">
              <ItemIcon itemId={item.item_id} name={item.name} size={36} />
              <h3>{item.name}</h3>
            </div>
            <p className="muted">
              {item.quantity}x — R$ {item.price}
            </p>
            {user ? (
              <button className="btn" type="button" onClick={() => void buy(item.id)}>
                Adicionar
              </button>
            ) : (
              <p className="muted">Entre para comprar.</p>
            )}
          </article>
        ))}
      </div>
      {!catalog.data?.length && <p className="muted">Nenhum item cadastrado no admin.</p>}
    </section>
  )
}
