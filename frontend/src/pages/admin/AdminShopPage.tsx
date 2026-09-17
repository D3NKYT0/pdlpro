import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { Toggle } from '../../components/ui/Toggle'
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Package, Plus, ShoppingBag, WandSparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/errors'
import { commerceApi, staffApi, type ShopPackage } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'
import { ItemIcon } from '../../components/ItemIcon'
import { ItemIdField } from '../../components/ItemIdField'
import { useItemCatalog } from '../../hooks/useItemCatalog'

type ShopTab = 'items' | 'packages'

export function AdminShopPage() {
  const { t } = useTranslation('admin')
  const catalog = useItemCatalog()
  const queryClient = useQueryClient()
  const shop = useQuery({ queryKey: ['staff-shop'], queryFn: staffApi.shop })
  const packs = useQuery({ queryKey: ['staff-packages'], queryFn: commerceApi.staffPackages })
  const [tab, setTab] = useState<ShopTab>('items')
  const [name, setName] = useState('')
  const [itemId, setItemId] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [active, setActive] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [packDraft, setPackDraft] = useState<Partial<ShopPackage> | null>(null)
  const [contents, setContents] = useState<{ item: string; quantity: number }[]>([])
  const action = useFeedbackAction()
  const bootstrap = useAsyncAction()
  const saving = action.pending
  const items = shop.data ?? []
  const packages = packs.data ?? []

  async function refreshShop() {
    await queryClient.invalidateQueries({ queryKey: ['staff-shop'] })
    await queryClient.invalidateQueries({ queryKey: ['shop'] })
    await queryClient.invalidateQueries({ queryKey: ['staff-packages'] })
    await queryClient.invalidateQueries({ queryKey: ['shop-packages'] })
  }

  function resetItem() {
    setName('')
    setItemId('')
    setPrice('')
    setQuantity('1')
    setActive(true)
    setEditing(null)
  }

  function resetPackage() {
    setPackDraft(null)
    setContents([])
  }

  async function onSubmitItem(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await staffApi.saveShopItem({
        id: editing || undefined,
        name,
        item_id: Number(itemId),
        price,
        quantity: Number(quantity),
        active,
      })
      toast.success(editing ? t('shop.toast.updated') : t('shop.toast.created'))
      resetItem()
      await refreshShop()
    }, t('shop.toast.error'))
  }

  async function onSubmitPackage(event: FormEvent) {
    event.preventDefault()
    const lines = contents.filter((row) => row.item)
    if (!packDraft || !lines.length) return
    await action.run(async () => {
      await commerceApi.save(
        'packages',
        {
          name: packDraft.name,
          total_price: packDraft.total_price,
          active: packDraft.active ?? true,
          items: lines,
        },
        packDraft.id,
      )
      toast.success(t('shop.toast.packageSaved'))
      resetPackage()
      await refreshShop()
    }, t('shop.toast.error'))
  }

  async function fillCatalog() {
    const result = await bootstrap.run(async () => {
      const payload = await staffApi.autoconfigShop()
      await refreshShop()
      return payload
    })
    if (result.ok) {
      toast.success(
        t('shop.toast.autoconfig', {
          items: result.value.created.items,
          packages: result.value.created.packages,
        }),
      )
    } else if (!result.skipped) {
      toast.error(apiErrorMessage(result.error, t('shop.toast.error')))
    }
  }

  function openPackage(row?: ShopPackage) {
    setPackDraft(row ?? { name: '', total_price: '', active: true, contents: [] })
    setContents(row ? row.contents.map((entry) => ({ item: entry.item, quantity: entry.quantity })) : [{ item: '', quantity: 1 }])
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('shop.kicker')} title={t('shop.title')} description={t('shop.description')} />
      <ErrorNotice error={shop.error || packs.error} />
      <Card className="admin-games-panel">
        <header className="admin-services-heading">
          <span><ShoppingBag /></span>
          <div>
            <span className="panel-eyebrow">{t('shop.eyebrow')}</span>
            <h2>{t('shop.panelTitle')}</h2>
            <p>{t('shop.panelText')}</p>
          </div>
          <div className="admin-games-toolbar">
            <div className="admin-services-summary">
              <strong>{items.filter((item) => item.active).length}</strong>
              <small>{t('shop.activeCount', { total: items.length })}</small>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void fillCatalog()}
              busy={bootstrap.pending}
              busyLabel={t('shop.autoconfigBusy')}
            >
              <WandSparkles aria-hidden="true" />
              {t('shop.autoconfig')}
            </Button>
          </div>
        </header>
      </Card>
      <Tabs
        id="admin-shop"
        label={t('shop.tabsLabel')}
        value={tab}
        onChange={(next) => {
          setTab(next)
          if (next === 'items') resetPackage()
          else resetItem()
        }}
        items={[
          { id: 'items', label: t('shop.tabs.items'), icon: <ShoppingBag size={16} aria-hidden="true" /> },
          { id: 'packages', label: t('shop.tabs.packages'), icon: <Package size={16} aria-hidden="true" /> },
        ]}
      />
      {tab === 'items' ? (
        <>
          <form className="card admin-form admin-shop-form" onSubmit={onSubmitItem} id="admin-shop-panel-items">
            <div className="account-form-fields">
              <Field>
                {t('shop.catalogName')}
                <input value={catalog.getById(itemId)?.name ?? (itemId ? t('shop.itemFallback', { id: itemId }) : '')} readOnly />
                <small>{t('shop.catalogHint')}</small>
              </Field>
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
              <Toggle label={t('shop.active')} checked={active} onChange={(event) => setActive(event.target.checked)} />
            </div>
            <div className="account-form-fields">
              <AdminSaveBar saving={saving} label={editing ? t('shop.update') : t('shop.create')} />
              {editing ? (
                <Button className="ghost" type="button" onClick={resetItem}>{t('chrome.cancelEdit')}</Button>
              ) : null}
            </div>
          </form>
          <Card>
            <div className="account-section-heading">
              <div>
                <span className="panel-eyebrow">{t('shop.eyebrow')}</span>
                <h2>{t('shop.listTitle')}</h2>
              </div>
            </div>
            {items.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('shop.columns.name')}</th>
                    <th>{t('shop.columns.id')}</th>
                    <th>{t('shop.columns.price')}</th>
                    <th>{t('shop.columns.quantity')}</th>
                    <th>{t('shop.columns.active')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
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
                      <td>{item.active ? t('shop.active') : t('shop.inactive')}</td>
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
                            setActive(item.active)
                          }}
                        >
                          {t('shop.edit')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState>{t('shop.emptyItems')}</EmptyState>
            )}
          </Card>
        </>
      ) : (
        <div id="admin-shop-panel-packages">
          <div className="admin-games-toolbar">
            <Button type="button" onClick={() => openPackage()}>
              <Plus size={18} />
              {t('shop.createPackage')}
            </Button>
          </div>
          {packDraft ? (
            <form className="card admin-form admin-shop-form" onSubmit={onSubmitPackage}>
              <h2>{packDraft.id ? t('shop.editPackage') : t('shop.newPackage')}</h2>
              <div className="account-form-fields">
                <Field>
                  {t('shop.packageName')}
                  <input
                    required
                    value={packDraft.name ?? ''}
                    onChange={(event) => setPackDraft({ ...packDraft, name: event.target.value })}
                  />
                </Field>
                <Field>
                  {t('shop.packagePrice')}
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={packDraft.total_price ?? ''}
                    onChange={(event) => setPackDraft({ ...packDraft, total_price: event.target.value })}
                  />
                </Field>
              </div>
              <h3>{t('shop.packageContents')}</h3>
              {contents.map((row, index) => (
                <div className="account-form-fields" key={index}>
                  <Field>
                    {t('shop.item')}
                    <select
                      required
                      value={row.item}
                      onChange={(event) =>
                        setContents(contents.map((entry, current) => (current === index ? { ...entry, item: event.target.value } : entry)))
                      }
                    >
                      <option value="">{t('shop.selectItem')}</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {t('shop.itemOption', { name: item.name, quantity: item.quantity })}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field>
                    {t('shop.quantity')}
                    <input
                      type="number"
                      min={1}
                      required
                      value={row.quantity}
                      onChange={(event) =>
                        setContents(
                          contents.map((entry, current) =>
                            current === index ? { ...entry, quantity: Number(event.target.value) } : entry,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Button className="ghost" type="button" onClick={() => setContents(contents.filter((_, current) => current !== index))}>
                    {t('shop.removeItem')}
                  </Button>
                </div>
              ))}
              <div className="admin-games-toolbar">
                <Button className="ghost" type="button" onClick={() => setContents([...contents, { item: '', quantity: 1 }])}>
                  <Plus size={16} />
                  {t('shop.addItem')}
                </Button>
              </div>
              <Toggle
                label={t('shop.active')}
                checked={packDraft.active ?? true}
                onChange={(event) => setPackDraft({ ...packDraft, active: event.target.checked })}
              />
              <div className="account-form-fields">
                <AdminSaveBar saving={saving} label={t('shop.savePackage')} />
                <Button className="ghost" type="button" onClick={resetPackage}>{t('chrome.cancelEdit')}</Button>
              </div>
            </form>
          ) : null}
          <Card>
            <div className="account-section-heading">
              <div>
                <span className="panel-eyebrow">{t('shop.eyebrow')}</span>
                <h2>{t('shop.packagesTitle')}</h2>
              </div>
            </div>
            {packages.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('shop.columns.name')}</th>
                    <th>{t('shop.columns.price')}</th>
                    <th>{t('shop.packageContents')}</th>
                    <th>{t('shop.columns.active')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pack) => (
                    <tr key={pack.id}>
                      <td>{pack.name}</td>
                      <td>{t('shop.packagePriceLabel', { price: pack.total_price })}</td>
                      <td>
                        <div className="admin-shop-pack-lines">
                          {pack.contents.map((entry, index) => (
                            <small className="muted" key={`${pack.id}-${index}`}>
                              {t('shop.packageLine', { quantity: entry.grant_quantity, name: entry.name })}
                            </small>
                          ))}
                        </div>
                      </td>
                      <td>{pack.active ? t('shop.active') : t('shop.inactive')}</td>
                      <td>
                        <Button className="ghost" type="button" onClick={() => openPackage(pack)}>
                          {t('shop.editPackage')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState>{t('shop.emptyPackages')}</EmptyState>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
