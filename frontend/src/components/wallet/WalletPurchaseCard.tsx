import type { FormEvent } from 'react'
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
import type { ApiCoinPackage, ApiPaymentOrder, ApiWalletPromo } from '../../services/types'
import { formatWalletMoney } from './walletHistory'
import { WalletPromoBanner } from './WalletPromoBanner'

type WalletPurchaseCardProps = {
  currency: 'BRL' | 'USD'
  onCurrencyChange: (currency: 'BRL' | 'USD') => void
  paymentAvailable: boolean
  simulatedPayment: boolean
  mockAutoConfirm?: boolean
  packages: ApiCoinPackage[]
  promo: ApiWalletPromo | null | undefined
  catalogLoading: boolean
  customAmount: string
  onCustomAmountChange: (value: string) => void
  busy: boolean
  onStartPurchase: (packageId?: string) => void
  order: ApiPaymentOrder | null
  document: string
  onDocumentChange: (value: string) => void
  onPayStripe: (event: FormEvent) => void
}

export function WalletPurchaseCard({
  currency,
  onCurrencyChange,
  paymentAvailable,
  simulatedPayment,
  mockAutoConfirm,
  packages,
  promo,
  catalogLoading,
  customAmount,
  onCustomAmountChange,
  busy,
  onStartPurchase,
  order,
  document,
  onDocumentChange,
  onPayStripe,
}: WalletPurchaseCardProps) {
  const priceKey = currency === 'USD' ? 'price_usd' : 'price_brl'

  return (
    <Card className="wallet-purchase-card">
      <header className="wallet-section-heading">
        <span className="wallet-section-icon" aria-hidden="true"><CreditCard /></span>
        <div>
          <span className="panel-eyebrow">Adicionar saldo</span>
          <h2>Escolha sua recarga</h2>
          <p>Selecione a moeda de pagamento e o pacote ideal para você.</p>
        </div>
        <div className="wallet-currency-switch" role="group" aria-label="Moeda do pagamento">
          <button
            className={currency === 'BRL' ? 'is-active' : ''}
            type="button"
            aria-pressed={currency === 'BRL'}
            onClick={() => onCurrencyChange('BRL')}
          >
            <span>R$</span> BRL
          </button>
          <button
            className={currency === 'USD' ? 'is-active' : ''}
            type="button"
            aria-pressed={currency === 'USD'}
            onClick={() => onCurrencyChange('USD')}
          >
            <span>$</span> USD
          </button>
        </div>
      </header>

      <div className={`wallet-payment-note${paymentAvailable ? '' : ' is-unavailable'}`}>
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>{paymentAvailable ? simulatedPayment ? 'Pagamento sujeito a confirmação' : currency === 'USD' ? 'Pagamento internacional via Stripe' : 'Pagamento nacional via Mercado Pago' : 'Recargas temporariamente indisponíveis'}</strong>
          <small>{paymentAvailable ? simulatedPayment ? mockAutoConfirm ? 'O crédito automático está habilitado neste ambiente.' : 'O saldo será adicionado somente após a aprovação do pedido.' : currency === 'USD' ? 'Cartão processado com segurança no próprio site.' : 'Pague com cartão, PIX ou boleto sem sair do painel.' : 'Nenhuma cobrança será criada enquanto o serviço de pagamento estiver indisponível.'}</small>
        </span>
      </div>

      <div className="pay-packs">
        {packages.map((pack) => (
          <button
            key={pack.id}
            className={`pay-pack ${pack.badge ? 'is-featured' : ''}`}
            type="button"
            disabled={busy || !paymentAvailable}
            aria-label={`Comprar ${pack.total_coins} moedas por ${formatWalletMoney(pack[priceKey], currency)}`}
            onClick={() => void onStartPurchase(pack.id)}
          >
            {pack.badge ? <span className="pay-pack-badge"><Sparkles aria-hidden="true" /> {pack.badge}</span> : null}
            <span className="pay-pack-name">{pack.name}</span>
            <span className="pay-pack-coins"><Coins aria-hidden="true" /> {pack.total_coins}</span>
            <small>moedas</small>
            {Number(pack.bonus) > 0 ? <span className="pay-pack-bonus">+ {pack.bonus} de bônus</span> : null}
            <strong className="pay-pack-price">{formatWalletMoney(pack[priceKey], currency)}</strong>
            <span className="pay-pack-action">{paymentAvailable ? 'Escolher pacote' : 'Indisponível'}</span>
          </button>
        ))}
      </div>

      {catalogLoading ? <div className="wallet-inline-state"><Clock3 aria-hidden="true" /> Carregando pacotes...</div> : null}

      <div className="wallet-custom-purchase">
        <div className="wallet-custom-copy">
          <span className="wallet-section-icon" aria-hidden="true"><Banknote /></span>
          <div>
            <strong>Prefere outro valor?</strong>
            <small>Informe quanto deseja pagar e calcularemos as moedas.</small>
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
            <span>Valor em {currency}</span>
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
            <CircleDollarSign aria-hidden="true" /> Comprar agora
          </Button>
        </form>
      </div>

      {promo ? <WalletPromoBanner promo={promo} /> : null}

      <div className="wallet-checkout">
        {order?.method === 'mercadopago' && !order.pix_qr_code ? (
          <Field>
            <span>CPF ou CNPJ do pagador</span>
            <input value={document} onChange={(event) => onDocumentChange(event.target.value)} placeholder="000.000.000-00" />
          </Field>
        ) : null}
        {order?.method === 'mercadopago' ? <div id="payment-brick" /> : null}
        {order?.method === 'stripe' ? (
          <form onSubmit={(event) => void onPayStripe(event)}>
            <div id="stripe-element" />
            <Button type="submit" disabled={busy}>
              <CreditCard aria-hidden="true" /> Pagar com cartão
            </Button>
          </form>
        ) : null}
        {order?.pix_qr_code ? (
          <div className="wallet-pix-result">
            <h3>PIX copia e cola</h3>
            <textarea readOnly value={order.pix_qr_code} rows={3} />
            {order.pix_qr_code_base64 ? (
              <img alt="QR Code PIX" src={`data:image/png;base64,${order.pix_qr_code_base64}`} width={180} />
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
