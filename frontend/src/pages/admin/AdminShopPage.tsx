import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, staffApi } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'
import { ItemIcon } from '../../components/ItemIcon'
import { ItemIdField } from '../../components/ItemIdField'

export function AdminShopPage() {
  const queryClient = useQueryClient()
  const shop = useQuery({ queryKey: ['staff-shop'], queryFn: staffApi.shop })
  const [name, setName] = useState('')
  const [itemId, setItemId] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['staff-shop'] })
    await queryClient.invalidateQueries({ queryKey: ['shop'] })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await staffApi.saveShopItem({
        id: editing || undefined,
        name,
        item_id: Number(itemId),
        price,
        quantity: Number(quantity),
        active: true,
      })
      toast.success(editing ? 'Item atualizado' : 'Item criado')
      setName('')
      setItemId('')
      setPrice('')
      setQuantity('1')
      setEditing(null)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker="Financeiro" title="Loja" description="Itens vendidos no painel do jogador." />
      <form className="card admin-form" onSubmit={onSubmit}>
        <div className="account-form-fields">
          <label className="field">Nome<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <ItemIdField
            value={itemId}
            required
            onChange={(id, item) => {
              setItemId(id)
              if (item) setName(item.name)
            }}
          />
        </div>
        <div className="account-form-fields">
          <label className="field">Preço<input value={price} onChange={(e) => setPrice(e.target.value)} required /></label>
          <label className="field">Quantidade<input value={quantity} onChange={(e) => setQuantity(e.target.value)} required /></label>
        </div>
        <AdminSaveBar saving={saving} label={editing ? 'Atualizar item' : 'Criar item'} />
      </form>
      <section className="card">
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">Catálogo</span>
            <h2>Itens</h2>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>ID</th>
              <th>Preço</th>
              <th>Qtd</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(shop.data ?? []).map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="item-cell">
                    <ItemIcon itemId={item.item_id} name={item.name} size={28} />
                    {item.name}
                  </span>
                </td>
                <td>{item.item_id}</td>
                <td>{item.price}</td>
                <td>{item.quantity}</td>
                <td>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      setEditing(item.id)
                      setName(item.name)
                      setItemId(String(item.item_id))
                      setPrice(item.price)
                      setQuantity(String(item.quantity))
                    }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
