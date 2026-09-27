import { useState, useEffect, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Calculator,
  Coins,
  CreditCard,
  Eye,
  Gift,
  Layers,
  Megaphone,
  Pencil,
  Percent,
  Plus,
  Sparkles,
  Trash2,
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

  const tabItems = [
    { id: 'promo' as const, label: t('wallet.tabs.promo'), icon: <Megaphone className="w-4 h-4" /> },
    { id: 'tiers' as const, label: t('wallet.tabs.tiers'), icon: <Layers className="w-4 h-4" /> },
    { id: 'rules' as const, label: t('wallet.tabs.rules'), icon: <Zap className="w-4 h-4" /> },
    { id: 'simulator' as const, label: t('wallet.tabs.simulator'), icon: <Calculator className="w-4 h-4" /> },
  ]

  const tierRows = tiers.data ?? []

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
        <form className="admin-coins-form wallet-bonus-tab-content" onSubmit={onSubmitPromo}>
          <Card className="admin-config-section admin-coin-identity">
            <header className="admin-services-heading">
              <span><Megaphone /></span>
              <div>
                <span className="panel-eyebrow">{t('wallet.eyebrow')}</span>
                <h2>{t('wallet.bannerTitle')}</h2>
                <p>{t('wallet.bannerText')}</p>
              </div>
            </header>

            <div className="account-form-fields">
              <Field>
                {t('wallet.fieldTitle')}
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={120}
                />
              </Field>

              <Field>
                {t('wallet.fieldDescription')}
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={240}
                  placeholder={t('wallet.descriptionPlaceholder')}
                />
              </Field>

              <Field>
                {t('wallet.badge')}
                <input
                  value={badge}
                  onChange={(event) => setBadge(event.target.value)}
                  maxLength={40}
                  placeholder={t('wallet.badgePlaceholder')}
                />
              </Field>

              <Field>
                <span className="admin-coin-metric-icon" aria-hidden="true"><Percent /></span>
                {t('wallet.percent')}
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={percent}
                  onChange={(event) => setPercent(event.target.value)}
                  required
                />
              </Field>

              <Field>
                {t('wallet.startsAt')}
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </Field>

              <Field>
                {t('wallet.endsAt')}
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </Field>

              <div className="field ui-field" data-theme-part="field">
                <span>{t('wallet.stackingMode')}</span>
                <div className="wallet-stacking-options">
                  <label className={`wallet-stacking-card ${stackingMode === 'max' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="stacking_mode"
                      value="max"
                      checked={stackingMode === 'max'}
                      onChange={() => setStackingMode('max')}
                    />
                    <div className="wallet-stacking-text">
                      <strong>{t('wallet.stackingModeMax')}</strong>
                      <small>Ex: se a faixa dá 10% e a campanha 15%, o jogador ganha 15%.</small>
                    </div>
                  </label>

                  <label className={`wallet-stacking-card ${stackingMode === 'sum' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="stacking_mode"
                      value="sum"
                      checked={stackingMode === 'sum'}
                      onChange={() => setStackingMode('sum')}
                    />
                    <div className="wallet-stacking-text">
                      <strong>{t('wallet.stackingModeSum')}</strong>
                      <small>Ex: se a faixa dá 10% e a campanha 15%, o jogador ganha 25%!</small>
                    </div>
                  </label>
                </div>
              </div>

              <Toggle
                label={t('wallet.activeToggle')}
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
            </div>
          </Card>

          {/* Live Banner Preview */}
          <div className="wallet-preview-section">
            <div className="wallet-preview-header">
              <span><Eye className="w-4 h-4 inline-block mr-1" /> {t('wallet.livePreview')}</span>
              {active ? (
                <span className="text-green-400">● {t('wallet.status.current')}</span>
              ) : (
                <span className="text-gray-400">○ {t('wallet.status.inactive')}</span>
              )}
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
          <Card className="admin-game-panel">
            <header className="admin-services-heading">
              <span><Layers /></span>
              <div>
                <span className="panel-eyebrow">{t('wallet.tiers.eyebrow')}</span>
                <h2>{t('wallet.tiers.title')}</h2>
                <p>{t('wallet.tiers.text')}</p>
              </div>
              <Button variant="primary" size="sm" onClick={openNewTierModal}>
                <Plus className="w-4 h-4 mr-1 inline-block" /> {t('wallet.tiers.newButton')}
              </Button>
            </header>
          </Card>

          {tierRows.length === 0 ? (
            <EmptyState>{t('wallet.tiers.empty')}</EmptyState>
          ) : (
            <div className="wallet-tiers-grid">
              {tierRows.map((tier) => (
                <div
                  key={tier.id}
                  className={`wallet-tier-card ${!tier.active ? 'is-inactive' : ''}`}
                >
                  <div className="wallet-tier-header">
                    <div className="wallet-tier-range">
                      <span>{tier.min_amount}</span>
                      {tier.max_amount ? ` – ${tier.max_amount}` : ' +'} Moedas
                    </div>
                    <span className="wallet-tier-badge">+{Number(tier.percent)}%</span>
                  </div>

                  <div className="wallet-tier-desc">
                    {tier.description || <em className="opacity-50">—</em>}
                  </div>

                  <div className="wallet-tier-meta">
                    <span>
                      {tier.active ? '● Ativa' : '○ Inativa'} · Ordem: #{tier.order}
                    </span>
                    <div className="wallet-tier-actions">
                      <IconButton
                        label="Editar"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditTierModal(tier)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </IconButton>
                      <IconButton
                        label="Excluir"
                        variant="danger"
                        size="sm"
                        onClick={() => onDeleteTier(tier)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Nova / Editar Faixa */}
          <Modal
            open={tierModalOpen}
            onClose={() => setTierModalOpen(false)}
            title={editingTierId ? t('wallet.tiers.editingTitle', { name: tierDraft.description || 'Faixa' }) : t('wallet.tiers.createTitle')}
          >
            <form onSubmit={onSaveTier} className="account-form-fields">
              <Field>
                {t('wallet.tiers.description')}
                <input
                  value={tierDraft.description ?? ''}
                  onChange={(e) => setTierDraft((cur) => ({ ...cur, description: e.target.value }))}
                  placeholder={t('wallet.tiers.descriptionPlaceholder')}
                  maxLength={120}
                />
              </Field>

              <Field>
                {t('wallet.tiers.minAmount')}
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
                label="Definir limite máximo de moedas"
                checked={tierHasMax}
                onChange={(e) => setTierHasMax(e.target.checked)}
              />

              {tierHasMax && (
                <Field>
                  {t('wallet.tiers.maxAmount')}
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
                {t('wallet.tiers.percent')}
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
                {t('wallet.tiers.order')}
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

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => setTierModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" busy={tierAction.pending}>
                  Salvar Faixa
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* TAB 3: REGRAS ESPECIAIS & INCENTIVOS */}
      {activeTab === 'rules' && (
        <form className="admin-coins-form wallet-bonus-tab-content" onSubmit={onSubmitPromo}>
          <Card className="admin-game-panel">
            <header className="admin-services-heading">
              <span><Zap /></span>
              <div>
                <span className="panel-eyebrow">{t('wallet.specialRules.eyebrow')}</span>
                <h2>{t('wallet.specialRules.title')}</h2>
                <p>{t('wallet.specialRules.text')}</p>
              </div>
            </header>
          </Card>

          <div className="wallet-rules-grid">
            {/* 1ª Recarga */}
            <div className="wallet-rule-card">
              <div className="wallet-rule-card-header">
                <Gift />
                <strong>{t('wallet.specialRules.firstPurchaseTitle')}</strong>
              </div>
              <p>{t('wallet.specialRules.firstPurchaseText')}</p>

              <Toggle
                label={t('wallet.specialRules.firstPurchaseToggle')}
                checked={firstPurchaseActive}
                onChange={(e) => setFirstPurchaseActive(e.target.checked)}
              />

              {firstPurchaseActive && (
                <Field>
                  {t('wallet.specialRules.firstPurchasePercent')}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={firstPurchasePercent}
                    onChange={(e) => setFirstPurchasePercent(e.target.value)}
                    required
                  />
                </Field>
              )}
            </div>

            {/* Bônus PIX */}
            <div className="wallet-rule-card">
              <div className="wallet-rule-card-header">
                <CreditCard />
                <strong>{t('wallet.specialRules.pixTitle')}</strong>
              </div>
              <p>{t('wallet.specialRules.pixText')}</p>

              <Field>
                {t('wallet.specialRules.pixPercent')}
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={pixBonusPercent}
                  onChange={(e) => setPixBonusPercent(e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>

          <Card as="div" className="admin-server-actions">
            <span>
              <strong>Incentivos & Regras de Conversão</strong>
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
          <Card className="admin-game-panel">
            <header className="admin-services-heading">
              <span><Calculator /></span>
              <div>
                <span className="panel-eyebrow">{t('wallet.simulator.eyebrow')}</span>
                <h2>{t('wallet.simulator.title')}</h2>
                <p>{t('wallet.simulator.text')}</p>
              </div>
            </header>
          </Card>

          <div className="wallet-sim-layout">
            {/* Input Controls */}
            <Card className="admin-config-section">
              <div className="account-form-fields">
                <Field>
                  {t('wallet.simulator.amount')}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={simAmount}
                    onChange={(e) => setSimAmount(Math.max(1, Number(e.target.value)))}
                  />
                  <div className="wallet-sim-chips">
                    {[100, 250, 500, 1000, 2500, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`wallet-sim-chip ${simAmount === amt ? 'is-active' : ''}`}
                        onClick={() => setSimAmount(amt)}
                      >
                        {amt} moedas
                      </button>
                    ))}
                  </div>
                </Field>

                <Field>
                  {t('wallet.simulator.paymentMethod')}
                  <select
                    value={simPaymentMethod}
                    onChange={(e) => setSimPaymentMethod(e.target.value as 'standard' | 'pix')}
                    className="w-full bg-[#181511] border border-[#c5a161]/30 p-2 text-white rounded"
                  >
                    <option value="standard">{t('wallet.simulator.paymentDefault')}</option>
                    <option value="pix">{t('wallet.simulator.paymentPix')}</option>
                  </select>
                </Field>

                <Toggle
                  label={t('wallet.simulator.isFirstPurchase')}
                  checked={simIsFirstPurchase}
                  onChange={(e) => setSimIsFirstPurchase(e.target.checked)}
                />
              </div>
            </Card>

            {/* Result Simulation */}
            <div className="wallet-sim-result-card">
              {simLoading ? (
                <div className="py-12 text-center text-gold">
                  <Sparkles className="w-8 h-8 animate-spin mx-auto mb-2 opacity-60" />
                  <p>{t('wallet.simulator.calculating')}</p>
                </div>
              ) : simResult ? (
                <>
                  <div className="wallet-sim-hero">
                    <div className="wallet-sim-metric">
                      <span>{t('wallet.simulator.baseAmount')}</span>
                      <strong>{simResult.amount}</strong>
                    </div>
                    <div className="wallet-sim-metric">
                      <span>{t('wallet.simulator.totalPercent')}</span>
                      <strong className="is-highlight">+{Number(simResult.total_percent)}%</strong>
                    </div>
                    <div className="wallet-sim-metric">
                      <span>{t('wallet.simulator.bonusCoins')}</span>
                      <strong>+{simResult.bonus_coins}</strong>
                    </div>
                    <div className="wallet-sim-metric">
                      <span>{t('wallet.simulator.totalCoins')}</span>
                      <strong className="is-highlight">{simResult.total_coins}</strong>
                    </div>
                  </div>

                  <div className="wallet-sim-breakdown">
                    <span className="text-xs uppercase text-gold font-semibold tracking-wider mb-1">
                      {t('wallet.simulator.breakdownTitle')}
                    </span>

                    <div className="wallet-sim-breakdown-row">
                      <span>{t('wallet.simulator.breakdownTier')}</span>
                      <strong>+{simResult.breakdown.tier_bonus} moedas</strong>
                    </div>

                    <div className="wallet-sim-breakdown-row">
                      <span>{t('wallet.simulator.breakdownPromo')}</span>
                      <strong>+{simResult.breakdown.promo_bonus} moedas</strong>
                    </div>

                    {simResult.breakdown.pix_bonus > 0 && (
                      <div className="wallet-sim-breakdown-row is-bonus">
                        <span>{t('wallet.simulator.breakdownPix')}</span>
                        <strong>+{simResult.breakdown.pix_bonus} moedas</strong>
                      </div>
                    )}

                    {simResult.breakdown.first_purchase_bonus > 0 && (
                      <div className="wallet-sim-breakdown-row is-bonus">
                        <span>{t('wallet.simulator.breakdownFirstPurchase')}</span>
                        <strong>+{simResult.breakdown.first_purchase_bonus} moedas</strong>
                      </div>
                    )}
                  </div>

                  {simResult.rule_applied && (
                    <div className="wallet-sim-applied">
                      <Sparkles className="w-4 h-4 flex-shrink-0" />
                      <span>{simResult.rule_applied}</span>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
