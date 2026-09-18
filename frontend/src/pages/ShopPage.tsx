import { Package, ReceiptText, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ShopCart } from '../components/shop/ShopCart'
import { ShopCatalog } from '../components/shop/ShopCatalog'
import { ShopHero } from '../components/shop/ShopHero'
import { ShopHistory } from '../components/shop/ShopHistory'
import { useShopPage, type ShopTab } from '../components/shop/useShopPage'
import { ErrorNotice } from '../components/programs/ProgramUI'
import { Tabs } from '../components/ui/Tabs'

export function ShopPage() {
  const { t } = useTranslation('panel')
  const shop = useShopPage()

  return (
    <div className="shop-page">
      <ShopHero
        balance={shop.wallet.data?.balance}
        bonus={shop.wallet.data?.bonus_balance}
        cartCount={shop.cartCount}
        money={shop.money}
      />
      <ErrorNotice error={shop.catalog.error || shop.packages.error || shop.cart.error || shop.action.error} />
      <Tabs
        id="shop"
        className="inventory-tabs shop-tabs"
        label={t('shop.tabsLabel')}
        value={shop.tab}
        onChange={shop.setTab}
        items={[
          { id: 'items' satisfies ShopTab, label: t('shop.tabs.items'), icon: <Sparkles aria-hidden="true" /> },
          { id: 'packages' satisfies ShopTab, label: t('shop.tabs.packages'), icon: <Package aria-hidden="true" /> },
          { id: 'history' satisfies ShopTab, label: t('shop.tabs.history'), icon: <ReceiptText aria-hidden="true" /> },
        ]}
      />
      {shop.tab === 'history' ? (
        <ShopHistory purchases={shop.purchases.data} pending={shop.purchases.isPending} money={shop.money} />
      ) : (
        <div className="shop-layout">
          <ShopCatalog
            tab={shop.tab}
            items={shop.catalog.data}
            packages={shop.packages.data}
            pending={shop.tab === 'items' ? shop.catalog.isPending : shop.packages.isPending}
            busy={shop.action.busy}
            money={shop.money}
            onAddItem={(id) => void shop.addItem(id)}
            onAddPackage={(id) => void shop.addPackage(id)}
          />
          <ShopCart
            cart={shop.cart.data}
            wallet={shop.wallet.data}
            pending={shop.cart.isPending}
            busy={shop.action.busy}
            coupon={shop.coupon}
            onCouponChange={shop.setCoupon}
            money={shop.money}
            insufficient={shop.insufficient}
            canCheckout={shop.canCheckout}
            onChange={(row, quantity) => void shop.changeLine(row, quantity)}
            onApplyCoupon={() => void shop.applyCoupon()}
            onClearCoupon={() => void shop.clearCoupon()}
            onBonus={(value) => void shop.setBonus(value)}
            onCheckout={() => void shop.checkout()}
          />
        </div>
      )}
    </div>
  )
}
