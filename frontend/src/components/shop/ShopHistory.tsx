import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { CartIcon, PackageBoxIcon } from '../icons'
import { Loading } from '../programs/ProgramUI'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { formatDateTime } from '../../lib/formatters'
import type { CartLine, Purchase } from '../../services/api'

function paid(value: string | number) {
  return Number(value) > 0
}

function PurchaseSeal({ purchase }: { purchase: Purchase }) {
  const grant = purchase.items.find((item) => item.grants[0]?.item_id)?.grants[0]
  if (grant?.item_id) {
    return <ItemIcon itemId={grant.item_id} name={grant.item_name} size={48} />
  }
  if (purchase.items.some((item) => item.kind === 'package')) {
    return <PackageBoxIcon />
  }
  return <CartIcon />
}

function LineIcon({ item, size }: { item: CartLine; size: number }) {
  if (item.grants[0]?.item_id) {
    return <ItemIcon itemId={item.grants[0].item_id} name={item.name} size={size} />
  }
  return item.kind === 'package' ? <PackageBoxIcon width={size} height={size} /> : <CartIcon width={size} height={size} />
}

export function ShopHistory({
  purchases,
  pending,
  money,
}: {
  purchases?: Purchase[]
  pending: boolean
  money: (value: string | number) => string
}) {
  const { t } = useTranslation('panel')
  const [selected, setSelected] = useState<Purchase | null>(null)
  const empty = !pending && purchases?.length === 0

  return (
    <Card className="shop-history">
      <div className="shop-section-heading">
        <div>
          <span className="panel-eyebrow">{t('shop.history.eyebrow')}</span>
          <h2>
            <CartIcon width={32} height={32} />
            {t('shop.history.title')}
          </h2>
        </div>
        <b>{purchases?.length ?? 0}</b>
      </div>
      {pending ? <Loading /> : null}
      <div className="shop-history-list">
        {purchases?.map((purchase) => {
          const when = formatDateTime(purchase.created_at)
          const facts = [
            paid(purchase.discount) ? t('shop.history.discount', { value: money(purchase.discount) }) : null,
            paid(purchase.bonus_used) ? t('shop.history.bonus', { value: money(purchase.bonus_used) }) : null,
            purchase.promo_code ? t('shop.history.coupon', { code: purchase.promo_code }) : null,
          ].filter((fact): fact is string => Boolean(fact))

          return (
            <button
              type="button"
              className="shop-history-item"
              key={purchase.id}
              aria-haspopup="dialog"
              aria-expanded={selected?.id === purchase.id}
              aria-label={t('shop.history.openDetails', { when })}
              onClick={() => setSelected(purchase)}
            >
              <span className="shop-history-seal" aria-hidden="true">
                <PurchaseSeal purchase={purchase} />
              </span>
              <span className="shop-history-copy">
                <time dateTime={purchase.created_at}>{when}</time>
                {purchase.items.length ? (
                  <span className="shop-history-lines">
                    {purchase.items.map((item, index) => (
                      <span key={item.id || index}>
                        <LineIcon item={item} size={22} />
                        {t('shop.history.itemLine', { quantity: item.quantity, name: item.name })}
                      </span>
                    ))}
                  </span>
                ) : null}
                {facts.length ? (
                  <span className="shop-history-facts">
                    {facts.map((fact) => (
                      <span key={fact}>{fact}</span>
                    ))}
                  </span>
                ) : null}
              </span>
              <span className="shop-history-total">
                <strong>{t('shop.coins', { value: money(purchase.total) })}</strong>
                <small>{t('shop.history.viewDetails')}</small>
              </span>
              <ChevronRight className="shop-history-chevron" size={18} aria-hidden="true" />
            </button>
          )
        })}
      </div>
      {empty ? (
        <div className="shop-history-empty">
          <span className="shop-history-empty-art" aria-hidden="true" />
          <CartIcon width={40} height={40} />
          <strong>{t('shop.history.emptyTitle')}</strong>
          <p>{t('shop.history.empty')}</p>
        </div>
      ) : null}
      <Modal
        className="shop-history-modal"
        open={Boolean(selected)}
        title={t('shop.history.detailTitle')}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="shop-history-detail">
            {selected.items.length ? (
              <ul className="shop-history-detail-lines">
                {selected.items.map((item, index) => (
                  <li className="shop-history-detail-line" key={item.id || index}>
                    <span className="shop-history-seal" aria-hidden="true">
                      <LineIcon item={item} size={40} />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {t(`shop.history.kind.${item.kind === 'package' ? 'package' : 'item'}`)}
                        {' · '}
                        {t('shop.history.itemLine', { quantity: item.quantity, name: item.name })}
                      </small>
                      {item.grants.length ? (
                        <span className="shop-history-grants">
                          {item.grants.map((grant) => (
                            <span key={`${grant.item_id}-${grant.item_name}`}>
                              <ItemIcon itemId={grant.item_id} name={grant.item_name} size={18} />
                              {t('shop.history.itemLine', { quantity: grant.quantity, name: grant.item_name })}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </div>
                    <b>{t('shop.coins', { value: money(item.line_total) })}</b>
                  </li>
                ))}
              </ul>
            ) : null}
            <dl className="ui-detail-list">
              <div>
                <dt>{t('shop.history.when')}</dt>
                <dd>
                  <time dateTime={selected.created_at}>{formatDateTime(selected.created_at)}</time>
                </dd>
              </div>
              <div>
                <dt>{t('shop.cart.subtotal')}</dt>
                <dd>{t('shop.coins', { value: money(selected.subtotal) })}</dd>
              </div>
              <div>
                <dt>{t('shop.cart.discount')}</dt>
                <dd>{t('shop.coins', { value: money(selected.discount) })}</dd>
              </div>
              <div>
                <dt>{t('shop.cart.bonusUsed')}</dt>
                <dd>{t('shop.coins', { value: money(selected.bonus_used) })}</dd>
              </div>
              <div>
                <dt>{t('shop.history.couponLabel')}</dt>
                <dd>{selected.promo_code || t('shop.history.none')}</dd>
              </div>
              <div>
                <dt>{t('shop.history.total')}</dt>
                <dd>{t('shop.coins', { value: money(selected.total) })}</dd>
              </div>
              <div>
                <dt>{t('shop.history.status')}</dt>
                <dd>{t('shop.history.delivered')}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </Card>
  )
}
