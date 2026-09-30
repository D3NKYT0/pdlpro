import { useTranslation } from 'react-i18next'
import {
  Banknote,
  CircleDollarSign,
  Clock3,
  Coins,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import type { ApiCoinPackage, ApiWalletPromo } from '../../services/types'
import { formatWalletMoney } from './walletHistory'
import { WalletPromoBanner } from './WalletPromoBanner'

type WalletPurchaseCardProps = {
  currency: 'BRL' | 'USD'
  onCurrencyChange: (currency: 'BRL' | 'USD') => void
  availableCurrencies?: ('BRL' | 'USD')[]
  paymentMethod?: string
  availableMethods?: { id: string; name?: string }[]
  onMethodChange?: (methodId: string) => void
  paymentAvailable: boolean
  simulatedPayment: boolean
  packages: ApiCoinPackage[]
  promo: ApiWalletPromo | null | undefined
  catalogLoading: boolean
  customAmount: string
  onCustomAmountChange: (value: string) => void
  busy: boolean
  onStartPurchase: (packageId?: string) => void
  mpOptions?: {
    pix?: boolean
    boleto?: boolean
    credit_card?: boolean
    debit_card?: boolean
  }
}

export function WalletPurchaseCard({
  currency,
  onCurrencyChange,
  availableCurrencies,
  paymentMethod,
  availableMethods,
  onMethodChange,
  paymentAvailable,
  simulatedPayment,
  packages,
  promo,
  catalogLoading,
  customAmount,
  onCustomAmountChange,
  busy,
  onStartPurchase,
  mpOptions,
}: WalletPurchaseCardProps) {
  const { t } = useTranslation('panel')
  const priceKey = currency === 'USD' ? 'price_usd' : 'price_brl'
  const currenciesList = availableCurrencies && availableCurrencies.length > 0 ? availableCurrencies : ['BRL', 'USD']
  const noteVariant = !paymentAvailable
    ? 'Unavailable'
    : simulatedPayment
      ? 'Simulated'
      : paymentMethod === 'stripe'
        ? currency === 'USD'
          ? 'StripeUsd'
          : 'StripeBrl'
        : 'MercadoPago'
  const noteTitle = t(`wallet.purchase.note${noteVariant}Title`, {
    defaultValue:
      noteVariant === 'StripeUsd'
        ? t('wallet.purchase.noteStripeTitle')
        : noteVariant === 'StripeBrl'
          ? t('wallet.purchase.noteStripeTitle')
          : undefined,
  })
  const noteText =
    noteVariant === 'Simulated'
      ? t('wallet.purchase.noteManualConfirm')
      : noteVariant === 'MercadoPago'
        ? mpOptions && mpOptions.pix !== false && mpOptions.boleto === false && mpOptions.credit_card === false && mpOptions.debit_card === false
          ? t('wallet.purchase.noteMercadoPagoPixOnly', { defaultValue: 'Pague com PIX com liberação imediata sem sair do painel.' })
          : mpOptions && mpOptions.boleto !== false && mpOptions.pix === false && mpOptions.credit_card === false && mpOptions.debit_card === false
            ? t('wallet.purchase.noteMercadoPagoBoletoOnly', { defaultValue: 'Pague com boleto bancário sem sair do painel.' })
            : t('wallet.purchase.noteMercadoPago')
        : noteVariant === 'StripeUsd'
          ? t('wallet.purchase.noteStripeUsd', { defaultValue: t('wallet.purchase.noteStripe') })
          : noteVariant === 'StripeBrl'
            ? t('wallet.purchase.noteStripeBrl', { defaultValue: t('wallet.purchase.noteStripe') })
            : t(`wallet.purchase.note${noteVariant}`)

  return (
    <Card className="wallet-purchase-card">
      <header className="wallet-section-heading">
        <span className="wallet-section-icon" aria-hidden="true"><CreditCard /></span>
        <div>
          <span className="panel-eyebrow">{t('wallet.purchase.eyebrow')}</span>
          <h2>{t('wallet.purchase.title')}</h2>
          <p>{t('wallet.purchase.subtitle')}</p>
        </div>
        {currenciesList.length > 1 ? (
          <div className="wallet-currency-switch" role="group" aria-label={t('wallet.purchase.currencyGroup')}>
            {currenciesList.includes('BRL') ? (
              <button
                className={currency === 'BRL' ? 'is-active' : ''}
                type="button"
                aria-pressed={currency === 'BRL'}
                onClick={() => onCurrencyChange('BRL')}
              >
                <span>R$</span> BRL
              </button>
            ) : null}
            {currenciesList.includes('USD') ? (
              <button
                className={currency === 'USD' ? 'is-active' : ''}
                type="button"
                aria-pressed={currency === 'USD'}
                onClick={() => onCurrencyChange('USD')}
              >
                <span>$</span> USD
              </button>
            ) : null}
          </div>
        ) : currenciesList.length === 1 ? (
          <div className="wallet-currency-badge" aria-label={t('wallet.purchase.currencyGroup')}>
            <span>{currenciesList[0] === 'USD' ? '$' : 'R$'}</span> {currenciesList[0]}
          </div>
        ) : null}
      </header>

      {availableMethods && availableMethods.length > 1 ? (
        <div className="wallet-method-switcher" role="radiogroup" aria-label={t('wallet.purchase.methodGroup')}>
          {availableMethods.map((m) => {
            const label =
              m.id === 'mercadopago'
                ? t('wallet.purchase.methodMercadoPago')
                : m.id === 'stripe'
                  ? t('wallet.purchase.methodStripe')
                  : m.name || m.id
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={paymentMethod === m.id}
                className={`wallet-method-btn ${paymentMethod === m.id ? 'is-active' : ''}`}
                onClick={() => onMethodChange?.(m.id)}
              >
                {label}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className={`wallet-payment-note${paymentAvailable ? '' : ' is-unavailable'}`}>
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>{noteTitle}</strong>
          <small>{noteText}</small>
        </span>
      </div>

      <div className="pay-packs">
        {packages.map((pack) => (
          <button
            key={pack.id}
            className={`pay-pack ${pack.badge ? 'is-featured' : ''}`}
            type="button"
            disabled={busy || !paymentAvailable}
            aria-label={t('wallet.purchase.packAria', {
              coins: pack.total_coins,
              price: formatWalletMoney(pack[priceKey], currency),
            })}
            onClick={() => void onStartPurchase(pack.id)}
          >
            {pack.badge ? <span className="pay-pack-badge"><Sparkles aria-hidden="true" /> {pack.badge}</span> : null}
            <span className="pay-pack-name">{pack.name}</span>
            <span className="pay-pack-coins"><Coins aria-hidden="true" /> {pack.total_coins}</span>
            <small>{t('wallet.purchase.packCoins')}</small>
            {Number(pack.bonus) > 0 ? <span className="pay-pack-bonus">{t('wallet.purchase.packBonus', { bonus: pack.bonus })}</span> : null}
            <strong className="pay-pack-price">{formatWalletMoney(pack[priceKey], currency)}</strong>
            <span className="pay-pack-action">{paymentAvailable ? t('wallet.purchase.packChoose') : t('wallet.purchase.packUnavailable')}</span>
          </button>
        ))}
      </div>

      {catalogLoading ? <div className="wallet-inline-state"><Clock3 aria-hidden="true" /> {t('wallet.purchase.loadingPackages')}</div> : null}

      <div className="wallet-custom-purchase">
        <div className="wallet-custom-copy">
          <span className="wallet-section-icon" aria-hidden="true"><Banknote /></span>
          <div>
            <strong>{t('wallet.purchase.customTitle')}</strong>
            <small>{t('wallet.purchase.customSubtitle')}</small>
          </div>
        </div>
        <form
          className="wallet-custom-form"
          onSubmit={(event) => {
            event.preventDefault()
            void onStartPurchase()
          }}
        >
          <Field>
            <span>{t('wallet.purchase.customAmount', { currency })}</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={customAmount}
              onChange={(event) => onCustomAmountChange(event.target.value)}
              placeholder={currency === 'USD' ? '9.90' : '50.00'}
            />
          </Field>
          <Button type="submit" disabled={busy || !customAmount || !paymentAvailable}>
            <CircleDollarSign aria-hidden="true" /> {t('wallet.purchase.buyNow')}
          </Button>
        </form>
      </div>

      {promo ? <WalletPromoBanner promo={promo} /> : null}
    </Card>
  )
}
