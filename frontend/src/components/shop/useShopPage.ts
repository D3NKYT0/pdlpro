import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useProgramAction } from '../programs/useProgramAction'
import { formatNumber } from '../../lib/formatters'
import { commerceApi, shopApi, walletApi, type CartLine } from '../../services/api'

export const SHOP_CART_KEYS = [['shop-quote']] as const
export const SHOP_CHECKOUT_KEYS = [['shop-quote'], ['shop-purchases'], ['wallet']] as const

export type ShopTab = 'items' | 'packages' | 'history'

/** Agrega catálogo, carrinho e checkout da loja sem espalhar queries na página. */
export function useShopPage() {
  const { t } = useTranslation('panel')
  const catalog = useQuery({ queryKey: ['shop'], queryFn: shopApi.catalog })
  const packages = useQuery({ queryKey: ['shop-packages'], queryFn: commerceApi.packages })
  const cart = useQuery({ queryKey: ['shop-quote'], queryFn: commerceApi.quote })
  const purchases = useQuery({ queryKey: ['shop-purchases'], queryFn: commerceApi.purchases })
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: walletApi.me })
  const [tab, setTab] = useState<ShopTab>('items')
  const [coupon, setCoupon] = useState('')
  const key = useRef<string | null>(null)
  const action = useProgramAction()

  function money(value: string | number) {
    return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  async function changeLine(row: CartLine, quantity: number) {
    key.current = null
    if (row.kind === 'item') {
      await action.run(
        () => (quantity ? shopApi.updateCartItem(row.id, quantity) : shopApi.removeCartItem(row.id)),
        t('shop.toast.cartUpdated'),
        SHOP_CART_KEYS,
      )
      return
    }
    if (row.package_id) {
      await action.run(
        () => commerceApi.packageQuantity(row.package_id!, quantity),
        t('shop.toast.cartUpdated'),
        SHOP_CART_KEYS,
      )
    }
  }

  async function addItem(id: string) {
    key.current = null
    await action.run(() => shopApi.addToCart(id), t('shop.toast.itemAdded'), SHOP_CART_KEYS)
  }

  async function addPackage(id: string) {
    key.current = null
    const current = cart.data?.items.find((row) => row.package_id === id)?.quantity || 0
    await action.run(
      () => commerceApi.packageQuantity(id, Math.min(99, current + 1)),
      t('shop.toast.packageAdded'),
      SHOP_CART_KEYS,
    )
  }

  async function applyCoupon() {
    key.current = null
    await action.run(() => commerceApi.options({ promo_code: coupon }), t('shop.toast.couponUpdated'), SHOP_CART_KEYS)
  }

  async function clearCoupon() {
    await action.run(() => commerceApi.options({ promo_code: '' }), t('shop.toast.couponRemoved'), SHOP_CART_KEYS)
  }

  async function setBonus(useBonus: boolean) {
    key.current = null
    await action.run(() => commerceApi.options({ use_bonus: useBonus }), t('shop.toast.bonusUpdated'), SHOP_CART_KEYS)
  }

  async function checkout() {
    key.current ||= crypto.randomUUID()
    const ok = await action.run(() => commerceApi.checkout(key.current!), t('shop.toast.checkoutDone'), SHOP_CHECKOUT_KEYS)
    if (ok) key.current = null
  }

  const cartCount = cart.data?.items.reduce((sum, row) => sum + row.quantity, 0) ?? 0
  const due = Number(cart.data?.balance_due || 0)
  const balance = Number(wallet.data?.balance || 0)
  const insufficient = due > balance
  const canCheckout = Boolean(cart.data?.items.length) && !insufficient && !action.busy

  return {
    catalog,
    packages,
    cart,
    purchases,
    wallet,
    tab,
    setTab,
    coupon,
    setCoupon,
    action,
    money,
    changeLine,
    addItem,
    addPackage,
    applyCoupon,
    clearCoupon,
    setBonus,
    checkout,
    cartCount,
    insufficient,
    canCheckout,
  }
}
