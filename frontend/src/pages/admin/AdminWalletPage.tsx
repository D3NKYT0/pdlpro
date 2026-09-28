import { useState, useEffect, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Award,
  Calendar,
  Calculator,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Crown,
  Eye,
  Gift,
  Info,
  Layers,
  Megaphone,
  Pencil,
  Percent,
  Plus,
  ShieldCheck,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback'
import { Field } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { Toggle } from '../../components/ui/Toggle'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import {
  BannerFlagIcon,
  GiftBoxIcon,
  GoldCoinIcon,
  PaymentCardIcon,
  PixBoltIcon,
} from '../../components/icons'
import { CrownIcon, RankIcon } from '../../components/achievements/AchievementIcons'
import {
  staffApi,
  type ApiBonusSimulationResult,
  type ApiStaffBonusTier,
} from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'
import './wallet-bonus.css'

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(value: string) {
  if (!value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

type WalletTab = 'promo' | 'tiers' | 'rules' | 'simulator'

const EMPTY_TIER: Omit<ApiStaffBonusTier, 'id'> = {
  min_amount: 100,
  max_amount: null,
  percent: '10.00',
  description: '',
  active: true,
  order: 1,
}

export function AdminWalletPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<WalletTab>('promo')

  // Queries
  const promo = useQuery({ queryKey: ['staff-wallet-promo'], queryFn: staffApi.walletPromo })
  const tiers = useQuery({
    queryKey: ['staff-bonus-tiers'],
    queryFn: typeof staffApi.bonusTiers === 'function' ? staffApi.bonusTiers : async () => [],
    enabled: activeTab === 'tiers' || activeTab === 'simulator',
  })

  // Promotion Form State
  const [percent, setPercent] = useState('10.00')
  const [title, setTitle] = useState(() => t('wallet.defaultTitle'))
  const [description, setDescription] = useState('')
  const [badge, setBadge] = useState('')
  const [stackingMode, setStackingMode] = useState<'max' | 'sum'>('max')
  const [active, setActive] = useState(false)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  // Special Rules State
  const [firstPurchaseActive, setFirstPurchaseActive] = useState(false)
  const [firstPurchasePercent, setFirstPurchasePercent] = useState('15.00')
  const [pixBonusPercent, setPixBonusPercent] = useState('5.00')

  // Tiers Form State (Modal)
  const [tierModalOpen, setTierModalOpen] = useState(false)
  const [editingTierId, setEditingTierId] = useState<string | null>(null)
  const [tierDraft, setTierDraft] = useState<Partial<ApiStaffBonusTier>>(EMPTY_TIER)
  const [tierHasMax, setTierHasMax] = useState(false)

  // Simulator State
  const [simAmount, setSimAmount] = useState(500)
  const [simPaymentMethod, setSimPaymentMethod] = useState<'standard' | 'pix'>('standard')
  const [simIsFirstPurchase, setSimIsFirstPurchase] = useState(false)
  const [simResult, setSimResult] = useState<ApiBonusSimulationResult | null>(null)
  const [simLoading, setSimLoading] = useState(false)

  const promoAction = useFeedbackAction()
  const tierAction = useFeedbackAction()

  useEffect(() => {
    if (!promo.data) return
    setPercent(promo.data.percent)
    setTitle(promo.data.title)
    setDescription(promo.data.description)
    setBadge(promo.data.badge || '')
    setStackingMode(promo.data.stacking_mode || 'max')
    setActive(promo.data.active)
    setStartsAt(toDatetimeLocal(promo.data.starts_at))
    setEndsAt(toDatetimeLocal(promo.data.ends_at))
    setFirstPurchaseActive(Boolean(promo.data.first_purchase_active))
    setFirstPurchasePercent(promo.data.first_purchase_percent || '15.00')
    setPixBonusPercent(promo.data.pix_bonus_percent || '5.00')
  }, [promo.data])

  // Real-time Simulation Trigger
  useEffect(() => {
    if (activeTab !== 'simulator') return
    if (typeof staffApi.previewBonusSimulation !== 'function') return
    let ignore = false
    setSimLoading(true)
    staffApi
      .previewBonusSimulation({
        amount: simAmount,
        payment_method: simPaymentMethod,
        is_first_purchase: simIsFirstPurchase,
      })
      .then((res) => {
        if (!ignore) {
          setSimResult(res)
          setSimLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) setSimLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [activeTab, simAmount, simPaymentMethod, simIsFirstPurchase, promo.data, tiers.data])

  // Save Promotion / Rules Form
  async function onSubmitPromo(event: FormEvent) {
    event.preventDefault()
    await promoAction.run(async () => {
      await staffApi.saveWalletPromo({
        percent,
        title,
        description,
        badge,
        stacking_mode: stackingMode,
        first_purchase_active: firstPurchaseActive,
        first_purchase_percent: firstPurchasePercent,
        pix_bonus_percent: pixBonusPercent,
        active,
        starts_at: fromDatetimeLocal(startsAt),
        ends_at: fromDatetimeLocal(endsAt),
      })
      toast.success(t('wallet.toast.saved'))
      await queryClient.invalidateQueries({ queryKey: ['staff-wallet-promo'] })
    }, t('wallet.toast.error'))
  }

  // Tier Handlers
  function openNewTierModal() {
    setEditingTierId(null)
    setTierDraft({ ...EMPTY_TIER, order: (tiers.data?.length ?? 0) + 1 })
    setTierHasMax(false)
    setTierModalOpen(true)
  }

  function openEditTierModal(tier: ApiStaffBonusTier) {
    setEditingTierId(tier.id)
    setTierDraft({ ...tier })
    setTierHasMax(tier.max_amount !== null)
    setTierModalOpen(true)
  }

  async function onSaveTier(event: FormEvent) {
    event.preventDefault()
    await tierAction.run(async () => {
      await staffApi.saveBonusTier({
        id: editingTierId || undefined,
        min_amount: Number(tierDraft.min_amount || 1),
        max_amount: tierHasMax ? Number(tierDraft.max_amount || 1) : null,
        percent: String(tierDraft.percent || '0'),
        description: tierDraft.description || '',
        active: tierDraft.active ?? true,
        order: Number(tierDraft.order || 1),
      })
      toast.success(t('wallet.tiers.toast.saved'))
      setTierModalOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['staff-bonus-tiers'] })
    }, t('wallet.tiers.toast.error'))
  }

  async function onDeleteTier(tier: ApiStaffBonusTier) {
    if (!window.confirm(t('wallet.tiers.confirmDelete'))) return
    await tierAction.run(async () => {
      await staffApi.deleteBonusTier(tier.id)
      toast.success(t('wallet.tiers.toast.deleted'))
      await queryClient.invalidateQueries({ queryKey: ['staff-bonus-tiers'] })
    }, t('wallet.tiers.toast.error'))
  }

  const tierRows = tiers.data ?? []

  const tabItems = [
    {
      id: 'promo' as const,
      label: (
        <>
          <span>{t('wallet.tabs.promo')}</span>
          <span className="wallet-tab-pill">
            {active && promo.data?.currently_active ? '● LIVE' : active ? 'ON' : 'OFF'}
          </span>
        </>
      ),
      icon: <Megaphone className="w-4 h-4" />,
    },
    {
      id: 'tiers' as const,
      label: (
        <>
          <span>{t('wallet.tabs.tiers')}</span>
          <span className="wallet-tab-pill">{tierRows.length}</span>
        </>
      ),
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'rules' as const,
      label: (
        <>
          <span>{t('wallet.tabs.rules')}</span>
          <span className="wallet-tab-pill">
            {firstPurchaseActive ? 'PIX + 1ª' : 'PIX'}
          </span>
        </>
      ),
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: 'simulator' as const,
      label: (
        <>
          <span>{t('wallet.tabs.simulator')}</span>
          <span className="wallet-tab-pill">Live</span>
        </>
      ),
      icon: <Calculator className="w-4 h-4" />,
    },
  ]

  return (
    <div className="account-page wallet-bonus-workspace">
      <AdminHeader
        kicker={t('wallet.kicker')}
        title={t('wallet.title')}
        description={t('wallet.description')}
      />

      <ErrorNotice error={promo.error || tiers.error} />

      <Tabs
        id="admin-wallet-tabs"
        label="Configuração de Bônus"
        items={tabItems}
        value={activeTab}
        onChange={setActiveTab}
        className="wallet-bonus-tabs"
      />

      {/* TAB 1: CAMPANHAS & EVENTOS */}
      {activeTab === 'promo' && (
        <form className="wallet-bonus-tab-content" onSubmit={onSubmitPromo}>
          <div className="wallet-hero-card">
            <div className="wallet-hero-header">
              <div className="wallet-header-crest promo-crest">
                <Megaphone className="w-6 h-6" />
              </div>
              <div className="wallet-hero-text">
                <span className="panel-eyebrow">{t('wallet.eyebrow')}</span>
                <h2>{t('wallet.bannerTitle')}</h2>
                <p>{t('wallet.bannerText')}</p>
              </div>
              <div className="wallet-hero-actions">
                <div
                  className={`wallet-status-badge ${
                    active
                      ? promo.data?.currently_active
                        ? 'is-live'
                        : 'is-scheduled'
                      : 'is-off'
                  }`}
                >
                  <span className="led-dot" />
                  <strong>
                    {active
                      ? promo.data?.currently_active
                        ? t('wallet.status.current')
                        : t('wallet.status.outOfWindow')
                      : t('wallet.status.inactive')}
                  </strong>
                </div>
                <div className="wallet-mode-badge">
                  {stackingMode === 'sum' ? (
                    <>
                      <Layers className="w-3.5 h-3.5" />
                      <span>{t('wallet.stackingModeSum')}</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-3.5 h-3.5" />
                      <span>{t('wallet.stackingModeMax')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="wallet-two-col-layout">
            {/* Left Column: Config Form */}
            <div className="wallet-form-column">
              {/* Card 1: Identidade da Campanha */}
              <div className="wallet-section-card">
                <div className="wallet-section-header">
                  <Tag className="w-4 h-4" />
                  <h3>{t('wallet.sections.identity')}</h3>
                </div>

                <div className="account-form-fields">
                  <Field>
                    <span className="wallet-field-title">
                      <Tag aria-hidden="true" className="w-3.5 h-3.5" />
                      {t('wallet.fieldTitle')}
                    </span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                      maxLength={120}
                    />
                  </Field>

                  <Field>
                    <span className="wallet-field-title">
                      <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
                      {t('wallet.fieldDescription')}
                    </span>
                    <input
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={240}
                      placeholder={t('wallet.descriptionPlaceholder')}
                    />
                  </Field>

                  <div className="wallet-form-span-2">
                    <Field>
                      <span className="wallet-field-title">
                        <Award aria-hidden="true" className="w-3.5 h-3.5" />
                        {t('wallet.badge')}
                      </span>
                      <input
                        value={badge}
                        onChange={(event) => setBadge(event.target.value)}
                        maxLength={40}
                        placeholder={t('wallet.badgePlaceholder')}
                      />
                    </Field>
                    <div className="wallet-preset-group">
                      <span className="wallet-preset-label">{t('wallet.quickPresets')}</span>
                      {['BÔNUS ESPECIAL', 'LIMITADO', 'FIM DE SEMANA', 'EVENTO VIP'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`wallet-preset-pill ${badge === preset ? 'is-active' : ''}`}
                          onClick={() => setBadge(preset)}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Bônus & Vigência */}
              <div className="wallet-section-card">
                <div className="wallet-section-header">
                  <Percent className="w-4 h-4" />
                  <h3>{t('wallet.sections.bonus')}</h3>
                </div>

                <div className="account-form-fields">
                  <div className="wallet-form-span-2">
                    <Field>
                      <span className="wallet-field-title">
                        <Percent aria-hidden="true" className="w-3.5 h-3.5" />
                        {t('wallet.percent')}
                      </span>
                      <span className="admin-coin-input">
                        <b>%</b>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={percent}
                          onChange={(event) => setPercent(event.target.value)}
                          required
                        />
                      </span>
                    </Field>
                    <div className="wallet-preset-group">
                      <span className="wallet-preset-label">{t('wallet.quickPresets')}</span>
                      {['5.00', '10.00', '15.00', '20.00', '25.00', '30.00'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`wallet-preset-pill ${percent === p ? 'is-active' : ''}`}
                          onClick={() => setPercent(p)}
                        >
                          +{Number(p)}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field>
                    <span className="wallet-field-title">
                      <Calendar aria-hidden="true" className="w-3.5 h-3.5" />
                      {t('wallet.startsAt')}
                    </span>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(event) => setStartsAt(event.target.value)}
                    />
                  </Field>

                  <Field>
                    <span className="wallet-field-title">
                      <Clock aria-hidden="true" className="w-3.5 h-3.5" />
                      {t('wallet.endsAt')}
                    </span>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(event) => setEndsAt(event.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Card 3: Modo de Aplicação */}
              <div className="wallet-section-card">
                <div className="wallet-section-header">
                  <Sliders className="w-4 h-4" />
                  <h3>{t('wallet.stackingMode')}</h3>
                </div>

                <div className="wallet-stacking-options">
                  <label className={`wallet-stacking-card ${stackingMode === 'max' ? 'is-selected' : ''}`}>
                    <div className="wallet-stacking-top">
                      <div className="wallet-stacking-icon-badge">
                        <Crown className="w-5 h-5" />
                      </div>
                      <span className="wallet-formula-tag">MAX(Faixa, Campanha)</span>
                    </div>
                    <div className="wallet-stacking-text">
                      <strong>{t('wallet.stackingModeMax')}</strong>
                      <small>Ex: se a faixa dá 10% e a campanha 15%, o jogador ganha 15%.</small>
                    </div>
                    <div className="wallet-stacking-footer">
                      <input
                        type="radio"
                        name="stacking_mode"
                        value="max"
                        checked={stackingMode === 'max'}
                        onChange={() => setStackingMode('max')}
                      />
                      <span>{t('wallet.stackingSelectMax')}</span>
                    </div>
                  </label>

                  <label className={`wallet-stacking-card ${stackingMode === 'sum' ? 'is-selected' : ''}`}>
                    <div className="wallet-stacking-top">
                      <div className="wallet-stacking-icon-badge">
                        <Layers className="w-5 h-5" />
                      </div>
                      <span className="wallet-formula-tag">Faixa + Campanha</span>
                    </div>
                    <div className="wallet-stacking-text">
                      <strong>{t('wallet.stackingModeSum')}</strong>
                      <small>Ex: se a faixa dá 10% e a campanha 15%, o jogador ganha 25%!</small>
                    </div>
                    <div className="wallet-stacking-footer">
                      <input
                        type="radio"
                        name="stacking_mode"
                        value="sum"
                        checked={stackingMode === 'sum'}
                        onChange={() => setStackingMode('sum')}
                      />
                      <span>{t('wallet.stackingSelectSum')}</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card 4: Ativação */}
              <div className="wallet-section-card">
                <div className="wallet-section-header">
                  <Zap className="w-4 h-4" />
                  <h3>{t('wallet.sections.activation')}</h3>
                </div>
                <Toggle
                  label={t('wallet.activeToggle')}
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
              </div>
            </div>

            {/* Right Column: Live Preview Studio */}
            <div className="wallet-preview-column">
              <div className="wallet-preview-studio">
                <div className="wallet-preview-window-head">
                  <div className="wallet-preview-window-title">
                    <Eye className="w-4 h-4" />
                    <span>{t('wallet.livePreview')}</span>
                  </div>
                  <div className="wallet-preview-window-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <aside className="wallet-promo-banner" aria-label={title}>
                  <div className="wallet-promo-banner-art" aria-hidden="true" />
                  <div className="wallet-promo-banner-shade" aria-hidden="true" />
                  <div className="wallet-promo-banner-copy">
                    <span className="panel-eyebrow">{badge || t('wallet.eyebrow')}</span>
                    <strong>{title || t('wallet.untitled')}</strong>
                    {description ? <small>{description}</small> : null}
                    <div className="wallet-promo-banner-offer" aria-hidden="true">
                      <b>{Number(percent || 0)}%</b>
                      <span>BONUS</span>
                    </div>
                  </div>
                </aside>

                <div className="wallet-preview-callout">
                  <Info className="w-4 h-4" />
                  <span>{t('wallet.previewCard.tip')}</span>
                </div>
              </div>
            </div>
          </div>

          <Card as="div" className="admin-server-actions">
            <span>
              <strong>{title || t('wallet.untitled')}</strong>
              <small>
                {t('wallet.summary', {
                  percent: percent || '0',
                  status: active
                    ? promo.data?.currently_active
                      ? t('wallet.status.current')
                      : t('wallet.status.outOfWindow')
                    : t('wallet.status.inactive'),
                })}
              </small>
            </span>
            <AdminSaveBar saving={promoAction.pending} />
          </Card>
        </form>
      )}

      {/* TAB 2: FAIXAS PROGRESSIVAS */}
      {activeTab === 'tiers' && (
        <div className="wallet-bonus-tab-content">
          <div className="wallet-hero-card">
            <div className="wallet-hero-header">
              <div className="wallet-header-crest tiers-crest">
                <Layers className="w-6 h-6" />
              </div>
              <div className="wallet-hero-text">
                <span className="panel-eyebrow">{t('wallet.tiers.eyebrow')}</span>
                <h2>{t('wallet.tiers.title')}</h2>
                <p>{t('wallet.tiers.text')}</p>
              </div>
              <div className="wallet-hero-actions">
                <Button variant="primary" size="sm" onClick={openNewTierModal}>
                  <Plus className="w-4 h-4 mr-1.5 inline-block" /> {t('wallet.tiers.newButton')}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="wallet-stats-bar">
            <div className="wallet-stat-card">
              <div className="wallet-stat-icon">
                <Layers className="w-5 h-5" />
              </div>
              <div className="wallet-stat-info">
                <span>{t('wallet.heroStats.totalTiers')}</span>
                <strong>{tierRows.length}</strong>
              </div>
            </div>

            <div className="wallet-stat-card">
              <div className="wallet-stat-icon">
                <Coins className="w-5 h-5" />
              </div>
              <div className="wallet-stat-info">
                <span>{t('wallet.heroStats.startTier')}</span>
                <strong>
                  {tierRows.length > 0 ? Math.min(...tierRows.map((r) => r.min_amount)) : 0} {t('wallet.tiers.coinsUnit')}
                </strong>
              </div>
            </div>

            <div className="wallet-stat-card">
              <div className="wallet-stat-icon">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="wallet-stat-info">
                <span>{t('wallet.heroStats.maxTier')}</span>
                <strong>
                  {tierRows.some((r) => r.max_amount === null)
                    ? t('wallet.tiers.maxUnlimited')
                    : tierRows.length > 0
                    ? Math.max(...tierRows.map((r) => r.max_amount || 0)) + ' ' + t('wallet.tiers.coinsUnit')
                    : '—'}
                </strong>
              </div>
            </div>

            <div className="wallet-stat-card">
              <div className="wallet-stat-icon">
                <Crown className="w-5 h-5" />
              </div>
              <div className="wallet-stat-info">
                <span>{t('wallet.heroStats.topBonus')}</span>
                <strong className="highlight">
                  {tierRows.length > 0
                    ? '+' + Math.max(...tierRows.map((r) => Number(r.percent || 0))) + '%'
                    : '0%'}
                </strong>
              </div>
            </div>
          </div>

          {/* Visual Progression Ladder */}
          {tierRows.length > 0 && (
            <div className="wallet-ladder-card">
              <div className="wallet-ladder-head">
                <strong>{t('wallet.ladder.title')}</strong>
                <small>{t('wallet.ladder.subtitle')}</small>
              </div>
              <div className="wallet-ladder-steps">
                {tierRows
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((tier, idx, arr) => (
                    <div key={tier.id} className="wallet-ladder-step">
                      <div className="wallet-ladder-tile">
                        <Coins className="w-4 h-4 text-gold flex-shrink-0" />
                        <div className="wallet-ladder-tile-amount">
                          <span>{t('wallet.tiers.tierRank', { order: tier.order })}</span>
                          <strong>
                            {tier.min_amount} {tier.max_amount ? `– ${tier.max_amount}` : '+'}
                          </strong>
                        </div>
                        <span className="wallet-tier-badge">+{Number(tier.percent)}%</span>
                      </div>
                      {idx < arr.length - 1 && <ArrowRight className="wallet-ladder-arrow w-4 h-4" />}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {tierRows.length === 0 ? (
            <EmptyState>{t('wallet.tiers.empty')}</EmptyState>
          ) : (
            <div className="wallet-tiers-grid">
              {tierRows.map((tier, index) => {
                const medalColors = ['#cd7f32', '#c0c0c0', '#ffd700', '#60a5fa']
                const medalColor = medalColors[Math.min(index, medalColors.length - 1)]
                return (
                  <div
                    key={tier.id}
                    className={`wallet-tier-card ${!tier.active ? 'is-inactive' : ''}`}
                  >
                    <div className="wallet-tier-header">
                      <div className="wallet-tier-rank-badge">
                        <Award className="w-3.5 h-3.5" style={{ color: medalColor }} />
                        <span>{t('wallet.tiers.tierRank', { order: tier.order })}</span>
                      </div>
                      <span className="wallet-tier-badge">+{Number(tier.percent)}%</span>
                    </div>

                    <div className="wallet-tier-range">
                      <Coins className="w-5 h-5 flex-shrink-0" />
                      <span>{tier.min_amount}</span>
                      {tier.max_amount ? ` – ${tier.max_amount}` : ' +'} {t('wallet.tiers.coinsUnit')}
                    </div>

                    <div className="wallet-tier-desc">
                      {tier.description || <em className="opacity-50">—</em>}
                    </div>

                    <div className="wallet-tier-meta">
                      <span className={tier.active ? 'text-emerald-400 font-semibold' : 'text-muted'}>
                        {tier.active ? '● ' + t('wallet.tiers.activeStatus') : '○ ' + t('wallet.tiers.inactiveStatus')} · {t('wallet.tiers.orderLabel', { order: tier.order })}
                      </span>
                      <div className="wallet-tier-actions">
                        <IconButton
                          label={t('wallet.tiers.editAction')}
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditTierModal(tier)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </IconButton>
                        <IconButton
                          label={t('wallet.tiers.deleteAction')}
                          variant="danger"
                          size="sm"
                          onClick={() => onDeleteTier(tier)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Modal Nova / Editar Faixa */}
          <Modal
            open={tierModalOpen}
            onClose={() => setTierModalOpen(false)}
            title={
              editingTierId
                ? t('wallet.tiers.editingTitle', { name: tierDraft.description || 'Faixa' })
                : t('wallet.tiers.createTitle')
            }
          >
            <form onSubmit={onSaveTier} className="account-form-fields">
              <Field>
                <span className="wallet-field-title">
                  <Tag className="w-3.5 h-3.5" />
                  {t('wallet.tiers.description')}
                </span>
                <input
                  value={tierDraft.description ?? ''}
                  onChange={(e) => setTierDraft((cur) => ({ ...cur, description: e.target.value }))}
                  placeholder={t('wallet.tiers.descriptionPlaceholder')}
                  maxLength={120}
                />
              </Field>

              <Field>
                <span className="wallet-field-title">
                  <Coins className="w-3.5 h-3.5" />
                  {t('wallet.tiers.minAmount')}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={tierDraft.min_amount ?? 100}
                  onChange={(e) => setTierDraft((cur) => ({ ...cur, min_amount: Number(e.target.value) }))}
                  required
                />
              </Field>

              <Toggle
                label={t('wallet.tiers.defineMaxToggle')}
                checked={tierHasMax}
                onChange={(e) => setTierHasMax(e.target.checked)}
              />

              {tierHasMax && (
                <Field>
                  <span className="wallet-field-title">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {t('wallet.tiers.maxAmount')}
                  </span>
                  <input
                    type="number"
                    min={tierDraft.min_amount || 1}
                    step="1"
                    value={tierDraft.max_amount ?? (tierDraft.min_amount ? tierDraft.min_amount * 2 : 500)}
                    onChange={(e) => setTierDraft((cur) => ({ ...cur, max_amount: Number(e.target.value) }))}
                    required
                  />
                </Field>
              )}

              <Field>
                <span className="wallet-field-title">
                  <Percent className="w-3.5 h-3.5" />
                  {t('wallet.tiers.percent')}
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={tierDraft.percent ?? '10.00'}
                  onChange={(e) => setTierDraft((cur) => ({ ...cur, percent: e.target.value }))}
                  required
                />
              </Field>

              <Field>
                <span className="wallet-field-title">
                  <Award className="w-3.5 h-3.5" />
                  {t('wallet.tiers.order')}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={tierDraft.order ?? 1}
                  onChange={(e) => setTierDraft((cur) => ({ ...cur, order: Number(e.target.value) }))}
                  required
                />
              </Field>

              <Toggle
                label={t('wallet.tiers.active')}
                checked={tierDraft.active ?? true}
                onChange={(e) => setTierDraft((cur) => ({ ...cur, active: e.target.checked }))}
              />

              <div className="wallet-modal-actions">
                <Button variant="ghost" onClick={() => setTierModalOpen(false)}>
                  {t('wallet.tiers.cancelButton')}
                </Button>
                <Button variant="primary" type="submit" busy={tierAction.pending}>
                  {t('wallet.tiers.saveButton')}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* TAB 3: REGRAS ESPECIAIS & INCENTIVOS */}
      {activeTab === 'rules' && (
        <form className="wallet-bonus-tab-content" onSubmit={onSubmitPromo}>
          <div className="wallet-hero-card">
            <div className="wallet-hero-header">
              <div className="wallet-header-crest rules-crest">
                <Zap className="w-6 h-6" />
              </div>
              <div className="wallet-hero-text">
                <span className="panel-eyebrow">{t('wallet.specialRules.eyebrow')}</span>
                <h2>{t('wallet.specialRules.title')}</h2>
                <p>{t('wallet.specialRules.text')}</p>
              </div>
              <div className="wallet-hero-actions">
                <div className={`wallet-status-badge ${firstPurchaseActive ? 'is-live' : 'is-off'}`}>
                  <span className="led-dot" />
                  <strong>
                    {firstPurchaseActive
                      ? t('wallet.specialRules.firstPurchaseStatusActive')
                      : t('wallet.specialRules.firstPurchaseStatusOff')}
                  </strong>
                </div>
                <div className="wallet-mode-badge">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('wallet.specialRules.pixBonusLabel', { percent: pixBonusPercent })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="wallet-rules-grid">
            {/* 1ª Recarga */}
            <div className={`wallet-rule-card theme-ruby ${firstPurchaseActive ? 'is-active-rule' : ''}`}>
              <div className="wallet-rule-card-header">
                <div className="wallet-rule-crest ruby-crest">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <span className="panel-eyebrow text-red-400">{t('wallet.rulesCards.firstPurchaseTag')}</span>
                  <strong>{t('wallet.specialRules.firstPurchaseTitle')}</strong>
                  <p>{t('wallet.specialRules.firstPurchaseText')}</p>
                </div>
              </div>

              <div className="wallet-rule-card-body">
                <Toggle
                  label={t('wallet.specialRules.firstPurchaseToggle')}
                  checked={firstPurchaseActive}
                  onChange={(e) => setFirstPurchaseActive(e.target.checked)}
                />

                {firstPurchaseActive && (
                  <>
                    <Field>
                      <span className="wallet-field-title">
                        <Percent className="w-3.5 h-3.5" />
                        {t('wallet.specialRules.firstPurchasePercent')}
                      </span>
                      <span className="admin-coin-input">
                        <b>%</b>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={firstPurchasePercent}
                          onChange={(e) => setFirstPurchasePercent(e.target.value)}
                          required
                        />
                      </span>
                    </Field>

                    <div className="wallet-preset-group">
                      <span className="wallet-preset-label">{t('wallet.quickPresets')}</span>
                      {['10.00', '15.00', '20.00', '25.00'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`wallet-preset-pill ${firstPurchasePercent === p ? 'is-active' : ''}`}
                          onClick={() => setFirstPurchasePercent(p)}
                        >
                          +{Number(p)}%
                        </button>
                      ))}
                    </div>

                    <div className="wallet-preview-callout">
                      <Sparkles className="w-4 h-4 text-red-400" />
                      <span>{t('wallet.rulesCards.firstPurchaseTip')}</span>
                    </div>

                    <div className="wallet-mock-player-badge ruby-badge">
                      <Gift className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{t('wallet.rulesCards.mockFirstPurchase', { percent: firstPurchasePercent })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bônus PIX */}
            <div className={`wallet-rule-card theme-emerald ${Number(pixBonusPercent) > 0 ? 'is-active-rule' : ''}`}>
              <div className="wallet-rule-card-header">
                <div className="wallet-rule-crest emerald-crest">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <span className="panel-eyebrow text-emerald-400">{t('wallet.rulesCards.pixTag')}</span>
                  <strong>{t('wallet.specialRules.pixTitle')}</strong>
                  <p>{t('wallet.specialRules.pixText')}</p>
                </div>
              </div>

              <div className="wallet-rule-card-body">
                <Field>
                  <span className="wallet-field-title">
                    <Percent className="w-3.5 h-3.5" />
                    {t('wallet.specialRules.pixPercent')}
                  </span>
                  <span className="admin-coin-input">
                    <b>%</b>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={pixBonusPercent}
                      onChange={(e) => setPixBonusPercent(e.target.value)}
                      required
                    />
                  </span>
                </Field>

                <div className="wallet-preset-group">
                  <span className="wallet-preset-label">{t('wallet.quickPresets')}</span>
                  {['3.00', '5.00', '7.00', '10.00'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`wallet-preset-pill ${pixBonusPercent === p ? 'is-active' : ''}`}
                      onClick={() => setPixBonusPercent(p)}
                    >
                      +{Number(p)}%
                    </button>
                  ))}
                </div>

                <div className="wallet-preview-callout">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{t('wallet.rulesCards.pixTip')}</span>
                </div>

                <div className="wallet-mock-player-badge emerald-badge">
                  <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t('wallet.rulesCards.mockPix', { percent: pixBonusPercent })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stacking Guide Full Card */}
          <div className="wallet-rules-guide-card">
            <div className="wallet-section-header">
              <Sliders className="w-4 h-4" />
              <h3>{t('wallet.rulesCards.stackingGuideTitle')}</h3>
            </div>
            <p className="wallet-guide-subtitle">{t('wallet.rulesCards.stackingGuideText')}</p>
            <div className="wallet-rules-guide-grid">
              <div className="wallet-rules-guide-item">
                <Layers className="w-4 h-4" />
                <div>
                  <strong>{t('wallet.rulesCards.guideTierTitle')}</strong>
                  <p>{t('wallet.rulesCards.guideTierDesc')}</p>
                </div>
              </div>
              <div className="wallet-rules-guide-item">
                <Megaphone className="w-4 h-4" />
                <div>
                  <strong>{t('wallet.rulesCards.guidePromoTitle')}</strong>
                  <p>{t('wallet.rulesCards.guidePromoDesc')}</p>
                </div>
              </div>
              <div className="wallet-rules-guide-item">
                <Zap className="w-4 h-4" />
                <div>
                  <strong>{t('wallet.rulesCards.guideIncentivesTitle')}</strong>
                  <p>{t('wallet.rulesCards.guideIncentivesDesc')}</p>
                </div>
              </div>
            </div>
          </div>

          <Card as="div" className="admin-server-actions">
            <span>
              <strong>{t('wallet.rulesCards.summaryTitle')}</strong>
              <small>
                {firstPurchaseActive ? `1ª Recarga: +${firstPurchasePercent}%` : '1ª Recarga desativada'}
                {' · '}
                PIX: +{pixBonusPercent}%
              </small>
            </span>
            <AdminSaveBar saving={promoAction.pending} />
          </Card>
        </form>
      )}

      {/* TAB 4: SIMULADOR EM TEMPO REAL */}
      {activeTab === 'simulator' && (
        <div className="wallet-bonus-tab-content">
          <div className="wallet-hero-card">
            <div className="wallet-hero-header">
              <div className="wallet-header-crest sim-crest">
                <Calculator className="w-6 h-6" />
              </div>
              <div className="wallet-hero-text">
                <span className="panel-eyebrow">{t('wallet.simulator.eyebrow')}</span>
                <h2>{t('wallet.simulator.title')}</h2>
                <p>{t('wallet.simulator.text')}</p>
              </div>
              <div className="wallet-hero-actions">
                <div className="wallet-status-badge is-live">
                  <span className="led-dot" />
                  <strong>{t('wallet.simulator.engineActive')}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="wallet-sim-layout">
            {/* Input Controls */}
            <div className="wallet-section-card wallet-sim-controls-card">
              <div className="wallet-section-header">
                <Sliders className="w-4 h-4 text-gold-bright" />
                <div>
                  <h3>{t('wallet.simulator.paramsTitle')}</h3>
                </div>
              </div>

              {/* Cenários de Teste Rápidos em destaque no topo */}
              <div className="wallet-sim-block">
                <span className="wallet-field-title">
                  <Sparkles className="w-3.5 h-3.5 text-gold-bright" />
                  {t('wallet.simPresets.title')}
                </span>
                <div className="wallet-scenario-buttons">
                  <button
                    type="button"
                    className={`wallet-scenario-btn ${
                      simAmount === 500 && simPaymentMethod === 'pix' && simIsFirstPurchase
                        ? 'is-active'
                        : ''
                    }`}
                    onClick={() => {
                      setSimAmount(500)
                      setSimPaymentMethod('pix')
                      setSimIsFirstPurchase(true)
                    }}
                  >
                    <div className="wallet-scenario-badge is-pix">
                      <PixBoltIcon width={28} height={28} />
                    </div>
                    <div className="wallet-scenario-text">
                      <strong className="wallet-scenario-title">
                        {t('wallet.simPresets.newPlayerPix')}
                      </strong>
                      <span className="wallet-scenario-desc">
                        {t('wallet.simPresets.newPlayerPixDesc')}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`wallet-scenario-btn ${
                      simAmount === 1000 && simPaymentMethod === 'standard' && !simIsFirstPurchase
                        ? 'is-active'
                        : ''
                    }`}
                    onClick={() => {
                      setSimAmount(1000)
                      setSimPaymentMethod('standard')
                      setSimIsFirstPurchase(false)
                    }}
                  >
                    <div className="wallet-scenario-badge is-card">
                      <PaymentCardIcon width={28} height={28} />
                    </div>
                    <div className="wallet-scenario-text">
                      <strong className="wallet-scenario-title">
                        {t('wallet.simPresets.regularCard')}
                      </strong>
                      <span className="wallet-scenario-desc">
                        {t('wallet.simPresets.regularCardDesc')}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`wallet-scenario-btn ${
                      simAmount === 5000 && simPaymentMethod === 'pix' && !simIsFirstPurchase
                        ? 'is-active'
                        : ''
                    }`}
                    onClick={() => {
                      setSimAmount(5000)
                      setSimPaymentMethod('pix')
                      setSimIsFirstPurchase(false)
                    }}
                  >
                    <div className="wallet-scenario-badge is-vip">
                      <CrownIcon width={28} height={28} />
                    </div>
                    <div className="wallet-scenario-text">
                      <strong className="wallet-scenario-title">
                        {t('wallet.simPresets.whaleVip')}
                      </strong>
                      <span className="wallet-scenario-desc">
                        {t('wallet.simPresets.whaleVipDesc')}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quantidade de Moedas + Chips */}
              <div className="wallet-sim-block">
                <Field>
                  <span className="wallet-field-title">
                    <GoldCoinIcon width={18} height={18} />
                    {t('wallet.simulator.amount')}
                  </span>
                  <div className="wallet-sim-input-group">
                    <div className="wallet-sim-input-prefix">
                      <GoldCoinIcon width={24} height={24} />
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={simAmount}
                      onChange={(e) => setSimAmount(Math.max(1, Number(e.target.value)))}
                      className="wallet-sim-input"
                    />
                    <span className="wallet-sim-input-unit">
                      {t('wallet.simulator.coinsUnit')}
                    </span>
                  </div>
                  <div className="wallet-sim-chips">
                    {[100, 250, 500, 1000, 2500, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`wallet-sim-chip ${simAmount === amt ? 'is-active' : ''}`}
                        onClick={() => setSimAmount(amt)}
                      >
                        <GoldCoinIcon width={16} height={16} />
                        <span>{amt} {t('wallet.simulator.coinsUnit')}</span>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              {/* Método de Pagamento & Toggle 1ª Recarga */}
              <div className="wallet-sim-bottom-grid">
                <div className="wallet-sim-field">
                  <span className="wallet-field-title">
                    {simPaymentMethod === 'pix' ? (
                      <PixBoltIcon width={18} height={18} />
                    ) : (
                      <PaymentCardIcon width={18} height={18} />
                    )}
                    {t('wallet.simulator.paymentMethod')}
                  </span>
                  <select
                    value={simPaymentMethod}
                    onChange={(e) => setSimPaymentMethod(e.target.value as 'standard' | 'pix')}
                    className="wallet-sim-select"
                  >
                    <option value="standard">{t('wallet.simulator.paymentDefault')}</option>
                    <option value="pix">{t('wallet.simulator.paymentPix')}</option>
                  </select>
                </div>

                <div className="wallet-sim-toggle-card">
                  <div className="wallet-sim-toggle-left">
                    <div className="wallet-sim-toggle-badge">
                      <GiftBoxIcon width={24} height={24} />
                    </div>
                    <div className="wallet-sim-toggle-info">
                      <strong className="wallet-sim-toggle-title">
                        {t('wallet.simulator.isFirstPurchase')}
                      </strong>
                      <span className="wallet-sim-toggle-desc">
                        {firstPurchaseActive
                          ? `+${firstPurchasePercent}% de bônus inicial`
                          : 'Sem bônus extra'}
                      </span>
                    </div>
                  </div>
                  <Toggle
                    checked={simIsFirstPurchase}
                    onChange={(e) => setSimIsFirstPurchase(e.target.checked)}
                  />
                </div>
              </div>
            </div>

            {/* Result Simulation */}
            <div className="wallet-sim-result-card">
              <div className="wallet-sim-receipt-head">
                <strong>
                  <Sparkles className="w-4 h-4 text-gold-bright" />
                  {t('wallet.simPresets.receiptTitle')}
                </strong>
                <span className="wallet-status-badge is-live">
                  <span className="led-dot" />
                  {t('wallet.simulator.instant')}
                </span>
              </div>

              {simLoading ? (
                <div className="wallet-sim-calc-loading">
                  <Sparkles className="w-8 h-8 text-gold-bright" />
                  <p>{t('wallet.simulator.calculating')}</p>
                </div>
              ) : simResult ? (() => {
                const breakdown = simResult.breakdown ?? {
                  tier_bonus: simResult.tier_bonus ?? 0,
                  promo_bonus: simResult.promo_bonus ?? 0,
                  pix_bonus: simResult.pix_bonus ?? 0,
                  first_purchase_bonus: simResult.first_purchase_bonus ?? 0,
                }
                const totalPercent = simResult.total_percent ?? simResult.percent ?? '0'
                const bonusCoins = simResult.bonus_coins ?? simResult.bonus ?? 0
                const totalCoins = simResult.total_coins ?? simResult.total ?? simResult.amount
                const ruleApplied = simResult.rule_applied ?? simResult.description ?? ''

                const totalNum = Number(totalCoins) || Number(simResult.amount) || 1
                const pctBase = Math.round((Number(simResult.amount) / totalNum) * 100)
                const pctBonus = 100 - pctBase

                return (
                  <>
                    <div className="wallet-sim-hero">
                      <div className="wallet-sim-metric-box">
                        <div className="wallet-sim-metric-label">
                          <GoldCoinIcon width={18} height={18} />
                          <span>{t('wallet.simulator.baseAmount')}</span>
                        </div>
                        <div className="wallet-sim-metric-val">{simResult.amount}</div>
                      </div>

                      <div className="wallet-sim-metric-box highlight">
                        <div className="wallet-sim-metric-label">
                          <TrendingUp className="w-4 h-4 text-gold-bright" />
                          <span>{t('wallet.simulator.totalPercent')}</span>
                        </div>
                        <div className="wallet-sim-metric-val is-highlight">+{Number(totalPercent)}%</div>
                      </div>

                      <div className="wallet-sim-metric-box">
                        <div className="wallet-sim-metric-label">
                          <GiftBoxIcon width={18} height={18} />
                          <span>{t('wallet.simulator.bonusCoins')}</span>
                        </div>
                        <div className="wallet-sim-metric-val">+{bonusCoins}</div>
                      </div>

                      <div className="wallet-sim-metric-box highlight total-highlight">
                        <div className="wallet-sim-metric-label">
                          <CrownIcon width={20} height={20} />
                          <span>{t('wallet.simulator.totalCoins')}</span>
                        </div>
                        <div className="wallet-sim-metric-val is-highlight">{totalCoins}</div>
                      </div>
                    </div>

                    {/* Visual Composition Bar */}
                    <div className="wallet-sim-visual-bar-wrap">
                      <div className="wallet-sim-bar-legend">
                        <span>{t('wallet.simPresets.visualComparison')}</span>
                        <span>{t('wallet.simulator.basePlusBonus', { base: simResult.amount, bonus: bonusCoins })}</span>
                      </div>
                      <div className="wallet-sim-visual-bar">
                        <div
                          className="wallet-sim-bar-seg seg-base"
                          style={{ width: `${pctBase}%` }}
                          title={`Base: ${simResult.amount} ${t('wallet.simulator.coinsUnit')}`}
                        />
                        <div
                          className="wallet-sim-bar-seg seg-tier"
                          style={{ width: `${pctBonus}%` }}
                          title={`Bônus: +${bonusCoins} ${t('wallet.simulator.coinsUnit')}`}
                        />
                      </div>
                    </div>

                    <div className="wallet-sim-breakdown">
                      <div className="wallet-section-header mb-0 pb-2">
                        <Sliders className="w-4 h-4 text-gold-bright" />
                        <h3>{t('wallet.simulator.breakdownTitle')}</h3>
                      </div>

                      <div className="wallet-sim-breakdown-row">
                        <div className="wallet-sim-breakdown-item">
                          <RankIcon width={20} height={20} />
                          <span>{t('wallet.simulator.breakdownTier')}</span>
                        </div>
                        <strong>+{Number(breakdown.tier_bonus)} {t('wallet.simulator.coinsUnit')}</strong>
                      </div>

                      <div className="wallet-sim-breakdown-row">
                        <div className="wallet-sim-breakdown-item">
                          <BannerFlagIcon width={20} height={20} />
                          <span>{t('wallet.simulator.breakdownPromo')}</span>
                        </div>
                        <strong>+{Number(breakdown.promo_bonus)} {t('wallet.simulator.coinsUnit')}</strong>
                      </div>

                      {Number(breakdown.pix_bonus) > 0 && (
                        <div className="wallet-sim-breakdown-row is-bonus">
                          <div className="wallet-sim-breakdown-item">
                            <PixBoltIcon width={20} height={20} />
                            <span>{t('wallet.simulator.breakdownPix')}</span>
                          </div>
                          <strong>+{Number(breakdown.pix_bonus)} {t('wallet.simulator.coinsUnit')}</strong>
                        </div>
                      )}

                      {Number(breakdown.first_purchase_bonus) > 0 && (
                        <div className="wallet-sim-breakdown-row is-bonus">
                          <div className="wallet-sim-breakdown-item">
                            <GiftBoxIcon width={20} height={20} />
                            <span>{t('wallet.simulator.breakdownFirstPurchase')}</span>
                          </div>
                          <strong>+{Number(breakdown.first_purchase_bonus)} {t('wallet.simulator.coinsUnit')}</strong>
                        </div>
                      )}
                    </div>

                    {ruleApplied && (
                      <div className="wallet-sim-applied">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-gold-bright" />
                        <div className="wallet-sim-applied-info">
                          <small className="wallet-sim-applied-label">
                            {t('wallet.simulator.appliedRule')}
                          </small>
                          <span className="wallet-sim-applied-val">{ruleApplied}</span>
                        </div>
                      </div>
                    )}
                  </>
                )
              })() : (
                <div className="wallet-sim-calc-empty">
                  <Calculator className="w-8 h-8 opacity-50" />
                  <p>{t('wallet.simulator.text')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
