import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ItemIcon } from '../ItemIcon'
import { PackageBoxIcon } from '../icons'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Empty, Loading } from '../programs/ProgramUI'
import type { ApiShopItem, ShopPackage } from '../../services/api'
import type { ShopTab } from './useShopPage'

export function ShopCatalog({
  tab,
  items,
  packages,
  pending,
  busy,
  money,
  onAddItem,
  onAddPackage,
}: {
  tab: Exclude<ShopTab, 'history'>
  items?: ApiShopItem[]
  packages?: ShopPackage[]
  pending: boolean
  busy: boolean
  money: (value: string | number) => string
  onAddItem: (id: string) => void
  onAddPackage: (id: string) => void
}) {
  const { t } = useTranslation('panel')
  const rows = tab === 'items' ? items : packages
  const empty = !pending && !(rows?.length)

  return (
    <Card className="shop-catalog">
      <div className="shop-section-heading">
        <div>
          <span className="panel-eyebrow">{t('shop.catalog.eyebrow')}</span>
          <h2>{tab === 'items' ? t('shop.catalog.itemsTitle') : t('shop.catalog.packagesTitle')}</h2>
        </div>
        <b>{rows?.length ?? 0}</b>
      </div>
      {pending ? <Loading /> : null}
      <div className="shop-product-grid">
        {tab === 'items'
          ? items?.map((item) => (
              <article className="shop-product" data-art="item" key={item.id}>
                <span className="shop-product-art" aria-hidden="true" />
                <div className="shop-product-body">
                  <span className="shop-product-icon">
                    <ItemIcon itemId={item.item_id} name={item.name} size={56} />
                  </span>
                  <div className="shop-product-info">
                    <h3>{item.name}</h3>
                    <p>{t('shop.catalog.units', { quantity: item.quantity })}</p>
                    <strong>{t('shop.coins', { value: money(item.price) })}</strong>
                  </div>
                  <Button type="button" disabled={busy} onClick={() => onAddItem(item.id)}>
                    <Plus size={17} aria-hidden="true" />
                    {t('shop.catalog.add')}
                  </Button>
                </div>
              </article>
            ))
          : packages?.map((pack) => (
              <article className="shop-product shop-package" data-art="package" key={pack.id}>
                <span className="shop-product-art" aria-hidden="true" />
                <div className="shop-product-body">
                  <span className="shop-product-icon">
                    <PackageBoxIcon />
                  </span>
                  <div className="shop-product-info">
                    <h3>{pack.name}</h3>
                    <div className="shop-package-contents">
                      {pack.contents.map((line, index) => (
                        <span key={index}>
                          <ItemIcon itemId={line.item_id} size={22} />
                          {t('shop.catalog.packLine', { quantity: line.grant_quantity, name: line.name })}
                        </span>
                      ))}
                    </div>
                    <strong>{t('shop.coins', { value: money(pack.total_price) })}</strong>
                  </div>
                  <Button type="button" disabled={busy || !pack.contents.length} onClick={() => onAddPackage(pack.id)}>
                    <Plus size={17} aria-hidden="true" />
                    {t('shop.catalog.addPackage')}
                  </Button>
                </div>
              </article>
            ))}
      </div>
      {empty ? <Empty>{t('shop.catalog.empty')}</Empty> : null}
    </Card>
  )
}
