import { Coins, ShoppingBag, Sparkles, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'

export function ShopHero({
  balance,
  bonus,
  cartCount,
  money,
}: {
  balance?: string
  bonus?: string
  cartCount: number
  money: (value: string | number) => string
}) {
  const { t } = useTranslation('panel')

  return (
    <Card className="shop-hero">
      <span className="shop-hero-motes" aria-hidden="true" />
      <div className="shop-hero-copy">
        <span className="panel-eyebrow">{t('shop.eyebrow')}</span>
        <div className="shop-hero-title">
          <span className="shop-title-icon" aria-hidden="true">
            <ShoppingBag />
          </span>
          <h1>{t('shop.title')}</h1>
        </div>
        <p>{t('shop.description')}</p>
        <div className="shop-hero-actions">
          <ButtonLink to="/panel/wallet">
            <WalletCards aria-hidden="true" /> {t('shop.openWallet')}
          </ButtonLink>
        </div>
      </div>
      <ul className="shop-hero-facts" aria-label={t('shop.heroFactsAria')}>
        <li>
          <Coins aria-hidden="true" />
          <span>{t('shop.heroBalance')}</span>
          <strong>{money(balance || '0.00')}</strong>
        </li>
        <li>
          <ShoppingBag aria-hidden="true" />
          <span>{t('shop.heroCart')}</span>
          <strong>{t('shop.heroCartCount', { count: cartCount })}</strong>
        </li>
        <li>
          <Sparkles aria-hidden="true" />
          <span>{t('shop.heroBonus')}</span>
          <strong>{money(bonus || '0.00')}</strong>
        </li>
      </ul>
    </Card>
  )
}
