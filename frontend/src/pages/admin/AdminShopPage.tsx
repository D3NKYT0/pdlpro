import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { staffApi } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'
import { ItemIcon } from '../../components/ItemIcon'
import { ItemIdField } from '../../components/ItemIdField'
import { useItemCatalog } from '../../hooks/useItemCatalog'

export function AdminShopPage() {
  const { t } = useTranslation('admin')
  const catalog = useItemCatalog()
  const queryClient = useQueryClient()
  const shop = useQuery({ queryKey: ['staff-shop'], queryFn: staffApi.shop })
  const [name, setName] = useState('')
  const [itemId, setItemId] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [editing, setEditing] = useState<string | null>(null)
  const action = useFeedbackAction()
  const saving = action.pending

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['staff-shop'] })
    await queryClient.invalidateQueries({ queryKey: ['shop'] })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await staffApi.saveShopItem({
        id: editing || undefined,
        name,
        item_id: Number(itemId),
        price,
        quantity: Number(quantity),
        active: true,
      })
      toast.success(editing ? t('shop.toast.updated') : t('shop.toast.created'))
      setName('')
      setItemId('')
      setPrice('')
      setQuantity('1')
      setEditing(null)
      await refresh()
    }, t('shop.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('shop.kicker')} title={t('shop.title')} description={t('shop.description')} />
      <form className="card admin-form admin-shop-form" onSubmit={onSubmit}>
        <div className="account-form-fields">
          <Field>{t('shop.catalogName')}<input value={catalog.getById(itemId)?.name ?? (itemId ? t('shop.itemFallback', { id: itemId }) : '')} readOnly /><small>{t('shop.catalogHint')}</small></Field>
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
          <Field>{t('shop.price')}<input value={price} onChange={(e) => setPrice(e.target.value)} required /></Field>
          <Field>{t('shop.quantity')}<input value={quantity} onChange={(e) => setQuantity(e.target.value)} required /></Field>
        </div>
        <AdminSaveBar saving={saving} label={editing ? t('shop.update') : t('shop.create')} />
      </form>
      <Card>
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">{t('shop.eyebrow')}</span>
            <h2>{t('shop.listTitle')}</h2>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{t('shop.columns.name')}</th>
              <th>{t('shop.columns.id')}</th>
              <th>{t('shop.columns.price')}</th>
              <th>{t('shop.columns.quantity')}</th>
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
                  <Button
                    className="ghost"
                    type="button"
                    onClick={() => {
                      setEditing(item.id)
                      setName(item.name)
                      setItemId(String(item.item_id))
                      setPrice(item.price)
                      setQuantity(String(item.quantity))
                    }}
                  >
                    {t('shop.edit')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
