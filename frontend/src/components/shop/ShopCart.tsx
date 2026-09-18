import { CheckCircle2, Minus, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CartIcon } from '../icons'
import { ItemIcon } from '../ItemIcon'
import { Loading } from '../programs/ProgramUI'
import { Button, IconButton } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { Toggle } from '../ui/Toggle'
import type { ApiWallet, CartLine, Quote } from '../../services/api'

export function ShopCart({
  cart,
  wallet,
  pending,
  busy,
  coupon,
  onCouponChange,
  money,
  insufficient,
  canCheckout,
  onChange,
  onApplyCoupon,
  onClearCoupon,
  onBonus,
  onCheckout,
}: {
  cart?: Quote
  wallet?: ApiWallet
  pending: boolean
  busy: boolean
  coupon: string
  onCouponChange: (value: string) => void
  money: (value: string | number) => string
  insufficient: boolean
  canCheckout: boolean
  onChange: (row: CartLine, quantity: number) => void
  onApplyCoupon: () => void
  onClearCoupon: () => void
  onBonus: (value: boolean) => void
  onCheckout: () => void
}) {
  const { t } = useTranslation('panel')
  const lines = cart?.items ?? []

  return (
    <Card as="aside" className="shop-cart-panel">
      <div className="shop-section-heading">
        <h2>
          <CartIcon width={32} height={32} />
          {t('shop.cart.title')}
        </h2>
        <b>{lines.reduce((sum, row) => sum + row.quantity, 0)}</b>
      </div>
      {pending ? <Loading /> : null}
      <div className="shop-cart-items">
        {lines.map((row) => (
          <article className="shop-cart-item" key={row.id}>
            {row.grants[0]?.item_id ? (
              <ItemIcon itemId={row.grants[0].item_id} name={row.name} size={36} />
            ) : (
              <CartIcon width={32} height={32} />
            )}
            <span>
              <strong>{row.name}</strong>
              <small>{t('shop.coins', { value: money(row.unit_price) })}</small>
              <b>{money(row.line_total)}</b>
            </span>
            <div className="shop-quantity">
              <IconButton
                variant="ghost"
                size="sm"
                label={t('shop.cart.decrease', { name: row.name })}
                disabled={busy}
                onClick={() => onChange(row, row.quantity - 1)}
              >
                <Minus size={14} />
              </IconButton>
              <span>{row.quantity}</span>
              <IconButton
                variant="ghost"
                size="sm"
                label={t('shop.cart.increase', { name: row.name })}
                disabled={busy || row.quantity >= 99}
                onClick={() => onChange(row, row.quantity + 1)}
              >
                <Plus size={14} />
              </IconButton>
            </div>
            <IconButton
              className="shop-remove"
              variant="danger"
              size="sm"
              label={t('shop.cart.remove', { name: row.name })}
              disabled={busy}
              onClick={() => onChange(row, 0)}
            >
              <Trash2 size={15} />
            </IconButton>
          </article>
        ))}
      </div>
      {!pending && !lines.length ? (
        <div className="shop-cart-empty">
          <span className="shop-cart-empty-art" aria-hidden="true" />
          <CartIcon width={40} height={40} />
          <strong>{t('shop.cart.emptyTitle')}</strong>
          <p>{t('shop.cart.empty')}</p>
        </div>
      ) : null}
      <form
        className="shop-coupon-form"
        onSubmit={(event) => {
          event.preventDefault()
          onApplyCoupon()
        }}
      >
        <Field>
          {t('shop.cart.coupon')}
          <input
            value={coupon}
            onChange={(event) => onCouponChange(event.target.value)}
            maxLength={40}
            placeholder={cart?.promo_code || t('shop.cart.couponPlaceholder')}
          />
        </Field>
        <div className="shop-coupon-actions">
          <Button type="submit" variant="ghost" disabled={busy}>
            {t('shop.cart.applyCoupon')}
          </Button>
          {cart?.promo_code ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={onClearCoupon}>
              {t('shop.cart.removeCoupon', { code: cart.promo_code })}
            </Button>
          ) : null}
        </div>
        <Toggle
          label={t('shop.cart.useBonus', { balance: wallet?.bonus_balance || '0.00' })}
          checked={cart?.use_bonus || false}
          disabled={busy}
          onChange={(event) => onBonus(event.target.checked)}
        />
      </form>
      <div className="shop-cart-summary">
        <p>
          <span>{t('shop.cart.subtotal')}</span>
          <strong>{money(cart?.subtotal || 0)}</strong>
        </p>
        <p>
          <span>{t('shop.cart.discount')}</span>
          <strong>− {money(cart?.discount || 0)}</strong>
        </p>
        <p>
          <span>{t('shop.cart.bonusUsed')}</span>
          <strong>− {money(cart?.bonus_used || 0)}</strong>
        </p>
        <p className="shop-cart-total">
          <span>{t('shop.cart.due')}</span>
          <strong>{money(cart?.balance_due || 0)}</strong>
        </p>
        <small className={insufficient ? 'shop-insufficient' : 'muted'}>
          {insufficient ? t('shop.cart.insufficient') : t('shop.cart.availableBalance', { balance: wallet?.balance || '0.00' })}
        </small>
      </div>
      <Button type="button" disabled={!canCheckout} onClick={onCheckout}>
        <CheckCircle2 size={18} aria-hidden="true" />
        {busy ? t('shop.cart.processing') : t('shop.cart.checkout')}
      </Button>
    </Card>
  )
}
