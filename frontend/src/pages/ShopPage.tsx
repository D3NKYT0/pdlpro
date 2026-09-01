import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ItemIcon } from '../components/ItemIcon'
import { useAuth } from '../contexts/AuthContext'
import { isApiError, shopApi, walletApi } from '../services/api'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function ShopPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const catalog = useQuery({ queryKey: ['shop'], queryFn: shopApi.catalog })
  const cart = useQuery({ queryKey: ['shop-cart'], queryFn: shopApi.cart, enabled: Boolean(user) })
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: walletApi.me, enabled: Boolean(user) })
  const [busy, setBusy] = useState('')

  async function buy(id: string) {
    setBusy(id)
    try {
      queryClient.setQueryData(['shop-cart'], await shopApi.addToCart(id))
      toast.success('Item adicionado ao carrinho')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível adicionar')
    } finally {
      setBusy('')
    }
  }

  async function changeQuantity(id: string, quantity: number) {
    setBusy(id)
    try {
      const result = quantity > 0 ? await shopApi.updateCartItem(id, quantity) : await shopApi.removeCartItem(id)
      queryClient.setQueryData(['shop-cart'], result)
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível atualizar o carrinho')
    } finally {
      setBusy('')
    }
  }

  async function checkout() {
    if (!cart.data?.items.length) return
    setBusy('checkout')
    try {
      const result = await shopApi.checkout()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shop-cart'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      ])
      toast.success(`Compra concluída: ${money.format(Number(result.total))}`)
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível finalizar a compra')
    } finally {
      setBusy('')
    }
  }

  const balance = Number(wallet.data?.balance ?? 0)
  const total = Number(cart.data?.total ?? 0)
  const insufficient = total > balance

  return (
    <div className="shop-page">
      <section className="card shop-hero">
        <span><ShoppingBag aria-hidden="true" /></span>
        <div><span className="panel-eyebrow">Mercado do jogador</span><h1>Loja</h1><p className="muted">Escolha seus itens e finalize tudo pelo carrinho.</p></div>
        <div className="shop-cart-badge"><ShoppingCart /><strong>{cart.data?.count ?? 0}</strong><small>no carrinho</small></div>
      </section>

      <div className="shop-layout">
        <section className="card shop-catalog">
          <header className="shop-section-heading"><div><span className="panel-eyebrow">Catálogo</span><h2>Itens disponíveis</h2></div></header>
          <div className="shop-product-grid">
            {(catalog.data ?? []).map((item) => (
              <article className="shop-product" key={item.id}>
                <ItemIcon itemId={item.item_id} name={item.name} size={48} />
                <div className="shop-product-info"><h3>{item.name}</h3><p>{item.quantity}x do item</p><strong>{money.format(Number(item.price))}</strong></div>
                <button className="btn" type="button" disabled={busy === item.id} onClick={() => void buy(item.id)}>
                  <Plus /> {busy === item.id ? 'Adicionando...' : 'Adicionar'}
                </button>
              </article>
            ))}
          </div>
          {!catalog.data?.length ? <p className="muted">Nenhum item cadastrado no admin.</p> : null}
        </section>

        <aside className="card shop-cart-panel">
          <header className="shop-section-heading"><div><span className="panel-eyebrow">Seu pedido</span><h2><ShoppingCart /> Carrinho</h2></div><b>{cart.data?.count ?? 0}</b></header>
          <div className="shop-cart-items">
            {(cart.data?.items ?? []).map((row) => (
              <article className="shop-cart-item" key={row.id}>
                <ItemIcon itemId={row.item_id} name={row.name} size={38} />
                <span><strong>{row.name}</strong><small>{row.grant_quantity * row.quantity}x no total</small><b>{money.format(Number(row.line_total))}</b></span>
                <div className="shop-quantity">
                  <button type="button" aria-label={`Diminuir ${row.name}`} disabled={busy === row.id} onClick={() => void changeQuantity(row.id, row.quantity - 1)}><Minus /></button>
                  <strong>{row.quantity}</strong>
                  <button type="button" aria-label={`Aumentar ${row.name}`} disabled={busy === row.id || row.quantity >= 99} onClick={() => void changeQuantity(row.id, row.quantity + 1)}><Plus /></button>
                </div>
                <button className="shop-remove" type="button" aria-label={`Remover ${row.name}`} onClick={() => void changeQuantity(row.id, 0)}><Trash2 /></button>
              </article>
            ))}
            {!cart.data?.items.length ? <div className="shop-cart-empty"><ShoppingCart /><strong>Seu carrinho está vazio</strong><small>Adicione um item do catálogo para começar.</small></div> : null}
          </div>

          <footer className="shop-cart-summary">
            <p><span>Saldo disponível</span><strong>{money.format(balance)}</strong></p>
            <p className="shop-cart-total"><span>Total</span><strong>{money.format(total)}</strong></p>
            {insufficient ? <small className="shop-insufficient">Saldo insuficiente. Adicione saldo pela Carteira.</small> : null}
            <button className="btn" type="button" disabled={!cart.data?.items.length || insufficient || busy === 'checkout'} onClick={() => void checkout()}>
              <CheckCircle2 /> {busy === 'checkout' ? 'Finalizando...' : 'Finalizar compra'}
            </button>
          </footer>
        </aside>
      </div>
    </div>
  )
}
