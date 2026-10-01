import { useState, useMemo, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ArrowRightLeft,
  Coins,
  DollarSign,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { Field } from '../../components/ui/Field'
import { Toggle } from '../../components/ui/Toggle'
import { staffApi, type ApiStaffChargeCurrency } from '../../services/api'
import { apiErrorMessage } from '../../lib/errors'
import { AdminHeader, AdminSaveBar } from './AdminChrome'
import {
  CurrencyGlobeEnamelIcon,
  CoinsStackEnamelIcon,
  SettlementVaultEnamelIcon,
  ScalesTradeEnamelIcon,
  CoinForgeEnamelIcon,
} from './ChargeCurrencyEnamelIcons'
import './charge-currencies.css'

const EMPTY_DRAFT = {
  code: '',
  name: '',
  symbol: '',
  coins_per_unit: '1.00',
  sort_order: 0,
  enabled: true,
}

const CURRENCY_PRESETS = [
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro', rate: '1.00' },
  { code: 'USD', symbol: '$', name: 'Dólar Americano', rate: '5.00' },
  { code: 'EUR', symbol: '€', name: 'Euro Europeu', rate: '5.50' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino', rate: '0.005' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno', rate: '0.005' },
  { code: 'GBP', symbol: '£', name: 'Libra Esterlina', rate: '6.50' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano', rate: '1.35' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano', rate: '0.25' },
]

export function AdminChargeCurrenciesPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()

  const currencies = useQuery({
    queryKey: ['staff-charge-currencies'],
    queryFn: staffApi.chargeCurrencies,
  })

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all')

  // Simulator state
  const [simAmount, setSimAmount] = useState('10.00')
  const [simMode, setSimMode] = useState<'currency_to_coins' | 'coins_to_currency'>('currency_to_coins')

  const items = useMemo(() => currencies.data ?? [], [currencies.data])
  const activeItems = useMemo(() => items.filter((i) => i.enabled), [items])
  const settlementCurrency = useMemo(() => items.find((i) => i.is_settlement), [items])

  const filteredItems = useMemo(() => {
    let result = items
    if (activeTab === 'active') result = result.filter((i) => i.enabled)
    if (activeTab === 'inactive') result = result.filter((i) => !i.enabled)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (i) => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q),
      )
    }
    return result
  }, [items, activeTab, searchQuery])

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<ApiStaffChargeCurrency>) => staffApi.saveChargeCurrency(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-charge-currencies'] })
      queryClient.invalidateQueries({ queryKey: ['payment-catalog'] })
      toast.success(t('chargeCurrencies.toast.saved'))
      handleReset()
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, t('chargeCurrencies.toast.error')))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.deleteChargeCurrency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-charge-currencies'] })
      queryClient.invalidateQueries({ queryKey: ['payment-catalog'] })
      toast.success(t('chargeCurrencies.toast.deleted'))
      if (editingId) handleReset()
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, t('chargeCurrencies.toast.error')))
    },
  })

  function handleReset() {
    setDraft({
      code: '',
      name: '',
      symbol: '',
      coins_per_unit: '1.00',
      sort_order: items.length,
      enabled: true,
    })
    setEditingId(null)
  }

  function handleEdit(item: ApiStaffChargeCurrency) {
    setEditingId(item.id)
    setDraft({
      code: item.code,
      name: item.name,
      symbol: item.symbol,
      coins_per_unit: item.coins_per_unit,
      sort_order: item.sort_order,
      enabled: item.enabled,
    })
    window.scrollTo({ top: 140, behavior: 'smooth' })
  }

  function handleApplyPreset(preset: (typeof CURRENCY_PRESETS)[number]) {
    setDraft((prev) => ({
      ...prev,
      code: preset.code,
      symbol: preset.symbol,
      name: preset.name,
      coins_per_unit: preset.rate,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cleanCode = draft.code.trim().toUpperCase()
    if (cleanCode.length !== 3) {
      toast.error(t('chargeCurrencies.form.codeHint'))
      return
    }

    await saveMutation.mutateAsync({
      id: editingId || undefined,
      code: cleanCode,
      name: draft.name.trim(),
      symbol: draft.symbol.trim(),
      coins_per_unit: draft.coins_per_unit,
      sort_order: Number(draft.sort_order),
      enabled: draft.enabled,
    })
  }

  async function handleToggle(item: ApiStaffChargeCurrency) {
    if (item.is_settlement && item.enabled) {
      toast.error(t('chargeCurrencies.list.cannotDisableSettlement'))
      return
    }
    await saveMutation.mutateAsync({
      id: item.id,
      enabled: !item.enabled,
    })
  }

  async function handleDelete(item: ApiStaffChargeCurrency) {
    if (item.is_settlement) {
      toast.error(t('chargeCurrencies.list.cannotDeleteSettlement'))
      return
    }
    if (!window.confirm(t('chargeCurrencies.list.confirmDelete', { code: item.code }))) {
      return
    }
    await deleteMutation.mutateAsync(item.id)
  }

  const parsedSimAmount = parseFloat(simAmount) || 0

  return (
    <div className="account-page charge-currencies-page">
      <AdminHeader
        kicker={t('chargeCurrencies.kicker')}
        title={t('chargeCurrencies.title')}
        description={t('chargeCurrencies.description')}
      />

      <ErrorNotice error={currencies.error} />

      {/* Top Stats Overview with Enamel Artwork */}
      <section className="charge-currency-stats">
        <div className="charge-currency-stat-card">
          <div className="charge-currency-enamel-wrapper">
            <CurrencyGlobeEnamelIcon width={46} height={46} />
          </div>
          <div className="charge-currency-stat-content">
            <span className="charge-currency-stat-value">{items.length}</span>
            <span className="charge-currency-stat-label">{t('chargeCurrencies.stats.total')}</span>
          </div>
        </div>

        <div className="charge-currency-stat-card">
          <div className="charge-currency-enamel-wrapper">
            <CoinsStackEnamelIcon width={46} height={46} />
          </div>
          <div className="charge-currency-stat-content">
            <span className="charge-currency-stat-value">{activeItems.length}</span>
            <span className="charge-currency-stat-label">{t('chargeCurrencies.stats.active')}</span>
          </div>
        </div>

        <div className="charge-currency-stat-card is-settlement">
          <div className="charge-currency-enamel-wrapper">
            <SettlementVaultEnamelIcon width={46} height={46} />
          </div>
          <div className="charge-currency-stat-content">
            <span className="charge-currency-stat-value">
              {settlementCurrency ? settlementCurrency.code : 'BRL'}
            </span>
            <span className="charge-currency-stat-label">{t('chargeCurrencies.stats.settlement')}</span>
          </div>
        </div>
      </section>

      {/* Main 2-column workspace */}
      <div className="charge-currencies-workspace">
        {/* Form Card */}
        <form onSubmit={handleSubmit} className="charge-currency-form-card">
          <header className="charge-currency-form-header">
            <div className="charge-currency-enamel-wrapper" style={{ width: 48, height: 48 }}>
              <CoinForgeEnamelIcon width={40} height={40} />
            </div>
            <div>
              <span className="panel-eyebrow">
                {editingId
                  ? t('chargeCurrencies.form.editEyebrow')
                  : t('chargeCurrencies.form.createEyebrow')}
              </span>
              <h2>
                {editingId
                  ? t('chargeCurrencies.form.editTitle', { code: draft.code })
                  : t('chargeCurrencies.form.createTitle')}
              </h2>
              <p className="muted" style={{ margin: 0 }}>
                {t('chargeCurrencies.form.text')}
              </p>
            </div>
          </header>

          {/* Quick Preset Buttons (1-click fill) */}
          {!editingId ? (
            <div className="charge-currency-presets">
              <span className="charge-currency-presets-label">
                <Zap aria-hidden="true" style={{ width: 14, height: 14 }} />
                Preenchimento Rápido de Moedas
              </span>
              <div className="charge-currency-presets-pills">
                {CURRENCY_PRESETS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    className="charge-currency-preset-btn"
                    onClick={() => handleApplyPreset(p)}
                  >
                    <span>{p.symbol}</span>
                    <strong>{p.code}</strong>
                    <small style={{ opacity: 0.7 }}>({p.name.split(' ')[0]})</small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="charge-currency-form-grid">
            <Field>
              {t('chargeCurrencies.form.code')}
              <input
                type="text"
                maxLength={3}
                placeholder={t('chargeCurrencies.form.codePlaceholder')}
                value={draft.code}
                onChange={(e) => setDraft((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                disabled={Boolean(editingId)}
                required
              />
              <small>{t('chargeCurrencies.form.codeHint')}</small>
            </Field>

            <Field>
              {t('chargeCurrencies.form.name')}
              <input
                type="text"
                maxLength={50}
                placeholder={t('chargeCurrencies.form.namePlaceholder')}
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <small>{t('chargeCurrencies.form.nameHint')}</small>
            </Field>

            <Field>
              {t('chargeCurrencies.form.symbol')}
              <input
                type="text"
                maxLength={8}
                placeholder={t('chargeCurrencies.form.symbolPlaceholder')}
                value={draft.symbol}
                onChange={(e) => setDraft((prev) => ({ ...prev, symbol: e.target.value }))}
                required
              />
              <small>{t('chargeCurrencies.form.symbolHint')}</small>
            </Field>

            <Field>
              {t('chargeCurrencies.form.coinsPerUnit')}
              <input
                type="number"
                min="0.0001"
                step="any"
                value={draft.coins_per_unit}
                onChange={(e) => setDraft((prev) => ({ ...prev, coins_per_unit: e.target.value }))}
                required
              />
              <small>{t('chargeCurrencies.form.coinsPerUnitHint')}</small>
            </Field>

            <Field>
              {t('chargeCurrencies.form.sortOrder')}
              <input
                type="number"
                min="0"
                step="1"
                value={draft.sort_order}
                onChange={(e) => setDraft((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
              />
              <small>{t('chargeCurrencies.form.sortOrderHint')}</small>
            </Field>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Toggle
                label={t('chargeCurrencies.form.enabled')}
                checked={draft.enabled}
                onChange={(e) => setDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
                disabled={Boolean(editingId && items.find((i) => i.id === editingId)?.is_settlement)}
              />
              <small className="muted">{t('chargeCurrencies.form.enabledHint')}</small>
            </div>
          </div>

          {/* Live Preview of the Card in the Form */}
          {draft.code ? (
            <div className="charge-currency-live-preview">
              <span className="charge-currency-live-preview-title">
                Prévia da Cotação:
              </span>
              <div className="charge-currency-live-preview-pill">
                <span>{draft.symbol || '$'} 1,00</span>
                <span>=</span>
                <Coins aria-hidden="true" style={{ width: 16, height: 16, color: '#ffca28' }} />
                <span>{draft.coins_per_unit || '1.00'} Coins</span>
              </div>
            </div>
          ) : null}

          {editingId && items.find((i) => i.id === editingId)?.is_settlement ? (
            <div className="charge-currency-settlement-notice">
              <ShieldCheck aria-hidden="true" style={{ width: 20, height: 20, flexShrink: 0 }} />
              <span>{t('chargeCurrencies.form.settlementNotice')}</span>
            </div>
          ) : null}

          <div className="charge-currency-form-actions">
            <AdminSaveBar saving={saveMutation.isPending} />
            {editingId ? (
              <Button type="button" className="ghost" onClick={handleReset}>
                {t('chargeCurrencies.form.cancel')}
              </Button>
            ) : null}
          </div>
        </form>

        {/* Live Simulator Widget */}
        <aside className="charge-currency-simulator-card">
          <header className="charge-currency-simulator-header">
            <div className="charge-currency-enamel-wrapper" style={{ width: 48, height: 48 }}>
              <ScalesTradeEnamelIcon width={40} height={40} />
            </div>
            <div>
              <span className="panel-eyebrow">{t('chargeCurrencies.calculator.eyebrow')}</span>
              <h2>{t('chargeCurrencies.calculator.title')}</h2>
              <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>
                {t('chargeCurrencies.calculator.text')}
              </p>
            </div>
          </header>

          <Field>
            {simMode === 'currency_to_coins'
              ? t('chargeCurrencies.calculator.currencyAmount')
              : 'Quantidade de Coins desejada'}
            <input
              type="number"
              min="0.01"
              step="1"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              placeholder="10.00"
            />
          </Field>

          {/* Quick Amount Chips */}
          <div className="charge-currency-sim-presets">
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Atalhos:</span>
            {['10', '25', '50', '100', '250', '500'].map((preset) => (
              <button
                key={preset}
                type="button"
                className="charge-currency-sim-preset-chip"
                onClick={() => setSimAmount(preset)}
              >
                +{preset}
              </button>
            ))}
          </div>

          {/* Mode Switcher */}
          <div className="charge-currency-sim-direction">
            <span>
              {simMode === 'currency_to_coins'
                ? 'Calculando: Moeda Fiduciária ➔ Coins entregues'
                : 'Calculando: Coins necessárias ➔ Custo em cada Moeda'}
            </span>
            <Button
              type="button"
              size="sm"
              className="ghost"
              onClick={() =>
                setSimMode((prev) =>
                  prev === 'currency_to_coins' ? 'coins_to_currency' : 'currency_to_coins',
                )
              }
              title="Alternar sentido de conversão"
            >
              <ArrowRightLeft aria-hidden="true" style={{ width: 14, height: 14 }} />
            </Button>
          </div>

          <div className="charge-currency-sim-results">
            {activeItems.length === 0 ? (
              <p className="muted">{t('chargeCurrencies.list.empty')}</p>
            ) : (
              activeItems.map((curr) => {
                const rate = parseFloat(curr.coins_per_unit) || 1
                const codeClass = `is-${curr.code.toLowerCase()}`

                if (simMode === 'currency_to_coins') {
                  const totalCoins = (parsedSimAmount * rate).toFixed(2)
                  return (
                    <div key={curr.id} className={`charge-currency-sim-row ${codeClass}`}>
                      <div className="charge-currency-sim-badge">
                        <span className="charge-currency-sim-tag">{curr.code}</span>
                        <div>
                          <strong style={{ color: '#fff', display: 'block', fontSize: '0.9rem' }}>
                            {curr.name}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {curr.symbol} {parsedSimAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="charge-currency-sim-values">
                        <div className="charge-currency-sim-output">
                          <Coins aria-hidden="true" style={{ width: 18, height: 18, color: '#ffd54f' }} />
                          <span>{totalCoins}</span>
                        </div>
                        <span className="charge-currency-sim-sub">Coins creditadas</span>
                      </div>
                    </div>
                  )
                } else {
                  const neededMoney = rate > 0 ? (parsedSimAmount / rate).toFixed(2) : '0.00'
                  return (
                    <div key={curr.id} className={`charge-currency-sim-row ${codeClass}`}>
                      <div className="charge-currency-sim-badge">
                        <span className="charge-currency-sim-tag">{curr.code}</span>
                        <div>
                          <strong style={{ color: '#fff', display: 'block', fontSize: '0.9rem' }}>
                            {curr.name}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            1 Coin = {curr.symbol} {(1 / rate).toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <div className="charge-currency-sim-values">
                        <div className="charge-currency-sim-output" style={{ color: '#64b5f6' }}>
                          <span>{curr.symbol} {neededMoney}</span>
                        </div>
                        <span className="charge-currency-sim-sub">Para {parsedSimAmount} coins</span>
                      </div>
                    </div>
                  )
                }
              })
            )}
          </div>
        </aside>
      </div>

      {/* Catalog Grid */}
      <Card className="charge-currencies-catalog">
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">{t('chargeCurrencies.list.eyebrow')}</span>
            <h2>{t('chargeCurrencies.list.title')}</h2>
            <p className="muted">{t('chargeCurrencies.list.text')}</p>
          </div>
          <Button type="button" className="ghost" onClick={handleReset}>
            <Plus aria-hidden="true" /> {t('chargeCurrencies.form.createTitle')}
          </Button>
        </div>

        {/* Filter and Search Toolbar */}
        <div className="charge-currencies-filter-bar">
          <div className="charge-currencies-filter-tabs">
            <button
              type="button"
              className={`charge-currencies-filter-tab ${activeTab === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Todas ({items.length})
            </button>
            <button
              type="button"
              className={`charge-currencies-filter-tab ${activeTab === 'active' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Ativas ({activeItems.length})
            </button>
            <button
              type="button"
              className={`charge-currencies-filter-tab ${activeTab === 'inactive' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('inactive')}
            >
              Pausadas ({items.length - activeItems.length})
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: '#9f9a91',
              }}
            />
            <input
              type="text"
              placeholder="Buscar moeda por código ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 34, height: 36, fontSize: '0.84rem' }}
            />
          </div>
        </div>

        {currencies.isLoading ? <LoadingState /> : null}

        {!currencies.isLoading && filteredItems.length === 0 ? (
          <EmptyState>{t('chargeCurrencies.list.empty')}</EmptyState>
        ) : null}

        <div className="charge-currencies-grid">
          {filteredItems.map((item) => {
            const isEditing = editingId === item.id
            const rate = parseFloat(item.coins_per_unit) || 1
            const inverse = rate > 0 ? (1 / rate).toFixed(4) : '0'
            const currencyClass = `is-currency-${item.code.toLowerCase()}`

            return (
              <article
                key={item.id}
                className={[
                  'charge-currency-card',
                  currencyClass,
                  item.is_settlement ? 'is-settlement' : '',
                  isEditing ? 'is-editing' : '',
                  !item.enabled ? 'is-disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="charge-currency-card-top">
                  <div className="charge-currency-identity">
                    <div className="charge-currency-badge-code">{item.code}</div>
                    <div className="charge-currency-names">
                      <span className="charge-currency-name">{item.name}</span>
                      <span className="charge-currency-symbol-tag">
                        {item.symbol} · {t('chargeCurrencies.list.orderLabel', { order: item.sort_order })}
                      </span>
                    </div>
                  </div>

                  {item.is_settlement ? (
                    <span className="charge-currency-settlement-pill">
                      <ShieldCheck aria-hidden="true" style={{ width: 14, height: 14 }} />
                      {t('chargeCurrencies.list.settlementBadge')}
                    </span>
                  ) : null}
                </div>

                <div className="charge-currency-rate-box">
                  <div className="charge-currency-rate-primary">
                    <span>{t('chargeCurrencies.list.rateLabel')}</span>
                    <strong>
                      1 {item.code} = {item.coins_per_unit} Coins
                    </strong>
                  </div>
                  <span className="charge-currency-rate-secondary">
                    {t('chargeCurrencies.list.inverseRate', { symbol: item.symbol, amount: inverse })}
                  </span>
                </div>

                <div className="charge-currency-card-footer">
                  <Toggle
                    label={item.enabled ? t('chargeCurrencies.list.active') : t('chargeCurrencies.list.inactive')}
                    checked={item.enabled}
                    onChange={() => void handleToggle(item)}
                    disabled={item.is_settlement && item.enabled}
                  />

                  <div className="charge-currency-card-actions">
                    <Button
                      type="button"
                      size="sm"
                      className="ghost"
                      onClick={() => handleEdit(item)}
                      aria-label={`${t('chrome.edit')} ${item.code}`}
                    >
                      <Pencil aria-hidden="true" />
                      {t('chrome.edit')}
                    </Button>
                    {!item.is_settlement ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => void handleDelete(item)}
                        disabled={deleteMutation.isPending}
                        aria-label={`${t('chrome.delete')} ${item.code}`}
                      >
                        <Trash2 aria-hidden="true" />
                        {t('chrome.delete')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </Card>

      {/* Cross-navigation and Architecture Guides */}
      <aside className="charge-currency-info-card">
        <div className="charge-currency-info-item">
          <div className="charge-currency-enamel-wrapper" style={{ width: 44, height: 44 }}>
            <Package aria-hidden="true" style={{ width: 22, height: 22, color: 'var(--panel-gold, #c5a161)' }} />
          </div>
          <div className="charge-currency-info-text">
            <strong>Preços dos Pacotes de Coins</strong>
            Cada pacote da loja recebe preços individuais nas moedas ativas cadastradas aqui.
            Gerencie em{' '}
            <Link to="/panel/admin/coin-packages">
              Pacotes de Recarga
            </Link>.
          </div>
        </div>
        <div className="charge-currency-info-item">
          <div className="charge-currency-enamel-wrapper" style={{ width: 44, height: 44 }}>
            <Sliders aria-hidden="true" style={{ width: 22, height: 22, color: '#60a5fa' }} />
          </div>
          <div className="charge-currency-info-text">
            <strong>Gateways e Moedas Stripe</strong>
            O Stripe apresenta apenas as moedas configuradas em <code>STRIPE_PRESENTMENT_CURRENCIES</code>.
            Ajuste em{' '}
            <Link to="/panel/admin/integrations?tab=payments">
              Integrações de Pagamento
            </Link>.
          </div>
        </div>
      </aside>
    </div>
  )
}
