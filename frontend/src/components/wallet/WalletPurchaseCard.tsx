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
import type { ApiChargeCurrencyCatalogItem, ApiCoinPackage, ApiWalletPromo } from '../../services/types'
import { formatWalletMoney } from './walletHistory'
import { WalletPromoBanner } from './WalletPromoBanner'

type WalletPurchaseCardProps = {
  currency: string
  onCurrencyChange: (currency: string) => void
  availableCurrencies?: string[]
  catalogCurrencies?: ApiChargeCurrencyCatalogItem[]
  paymentMethod?: string
  availableMethods?: { id: string; name?: string }[]
  onMethodChange?: (methodId: string) => void
  /** Quando definido, o admin fixou este gateway para BRL e o seletor de método é ocultado. */
  brlMethodFixed?: string | null
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

function getPackagePrice(pack: ApiCoinPackage, curr: string): string | null {
  if (pack.prices && pack.prices[curr] !== undefined && pack.prices[curr] !== '') {
    return pack.prices[curr]
  }
  if (curr === 'BRL' && pack.price_brl) {
    return pack.price_brl
  }
  if (curr === 'USD' && pack.price_usd) {
    return pack.price_usd
  }
  return null
}

export function WalletPurchaseCard({
  currency,
  onCurrencyChange,
  availableCurrencies,
  catalogCurrencies,
  paymentMethod,
  availableMethods,
  onMethodChange,
  brlMethodFixed,
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
  const currenciesList = availableCurrencies && availableCurrencies.length > 0 ? availableCurrencies : ['BRL', 'USD']
  const noteVariant = !paymentAvailable
    ? 'Unavailable'
    : simulatedPayment
      ? 'Simulated'
      : paymentMethod === 'stripe'
        ? currency === 'USD'
          ? 'StripeUsd'
          : currency === 'BRL'
            ? 'StripeBrl'
            : 'Stripe'
        : 'MercadoPago'
  const noteTitle = t(`wallet.purchase.note${noteVariant}Title`, {
    defaultValue:
      noteVariant === 'StripeUsd' || noteVariant === 'StripeBrl' || noteVariant === 'Stripe'
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
            : t('wallet.purchase.noteStripe', { defaultValue: t(`wallet.purchase.note${noteVariant}`) })

  const visiblePackages = packages.filter((pack) => Boolean(getPackagePrice(pack, currency)))

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
            {currenciesList.map((c) => {
              const meta = catalogCurrencies?.find((item) => item.code === c)
              const symbol = meta?.symbol || (c === 'BRL' ? 'R$' : c === 'USD' ? '$' : c === 'EUR' ? '€' : '')
              return (
                <button
                  key={c}
                  className={currency === c ? 'is-active' : ''}
                  type="button"
                  aria-pressed={currency === c}
                  onClick={() => onCurrencyChange(c)}
                >
                  {symbol ? <span>{symbol}</span> : null} {c}
                </button>
              )
            })}
          </div>
        ) : currenciesList.length === 1 ? (
          <div className="wallet-currency-badge" aria-label={t('wallet.purchase.currencyGroup')}>
            <span>{catalogCurrencies?.find((item) => item.code === currenciesList[0])?.symbol || (currenciesList[0] === 'USD' ? '$' : 'R$')}</span> {currenciesList[0]}
          </div>
        ) : null}
      </header>

      {/* Seletor de método: ocultado quando admin fixou o gateway */}
      {!brlMethodFixed && availableMethods && availableMethods.length > 1 ? (
        <div className="wallet-method-switcher" role="radiogroup" aria-label={t('wallet.purchase.methodGroup')}>
          {availableMethods.map((m) => {
            const label =
              m.id === 'mercadopago'
                ? t('wallet.purchase.methodMercadoPago')
                : m.id === 'stripe'
                  ? t('wallet.purchase.methodStripe')
                  : m.name || m.id
            const icon =
              m.id === 'mercadopago' ? <Banknote aria-hidden="true" /> : m.id === 'stripe' ? <CreditCard aria-hidden="true" /> : null
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={paymentMethod === m.id}
                className={`wallet-method-btn ${paymentMethod === m.id ? 'is-active' : ''}`}
                onClick={() => onMethodChange?.(m.id)}
              >
                {icon}
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
        {visiblePackages.map((pack) => {
          const price = getPackagePrice(pack, currency) || '0'
          return (
            <button
              key={pack.id}
              className={`pay-pack ${pack.badge ? 'is-featured' : ''}`}
              type="button"
              disabled={busy || !paymentAvailable}
              aria-label={t('wallet.purchase.packAria', {
                coins: pack.total_coins,
                price: formatWalletMoney(price, currency),
              })}
              onClick={() => void onStartPurchase(pack.id)}
            >
              {pack.badge ? <span className="pay-pack-badge"><Sparkles aria-hidden="true" /> {pack.badge}</span> : null}
              <span className="pay-pack-name">{pack.name}</span>
              <span className="pay-pack-coins"><Coins aria-hidden="true" /> {pack.total_coins}</span>
              <small>{t('wallet.purchase.packCoins')}</small>
              {Number(pack.bonus) > 0 ? <span className="pay-pack-bonus">{t('wallet.purchase.packBonus', { bonus: pack.bonus })}</span> : null}
              <strong className="pay-pack-price">{formatWalletMoney(price, currency)}</strong>
              <span className="pay-pack-action">{paymentAvailable ? t('wallet.purchase.packChoose') : t('wallet.purchase.packUnavailable')}</span>
            </button>
          )
        })}
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
