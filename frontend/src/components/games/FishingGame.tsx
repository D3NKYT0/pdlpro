import { Card } from '../ui/Card'
import { Button, IconButton } from '../ui/Button'
import { Field } from '../ui/Field'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CircleHelp, Fish } from 'lucide-react'
import { gamesApi, type FishingDetails } from '../../services/api'
import { contentLang } from '../../i18n/locale'
import { formatDateTime } from '../../lib/formatters'
import { Empty, ErrorNotice, Loading } from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'
import {
  FishPortrait,
  FishingBaitFrame,
  FishingPond,
  fishingBaitKind,
  type FishingBaitKind,
  type FishingPondState,
} from './GameVisuals'
import { groupFishByRarity, splitFishRarityColumns } from './gameArt'
import { waitForFishingBite, waitForFishingCast, waitForFishingReveal } from './fishingReveal'
import { writeCachedTokens } from './gameTokens'
import { FishingHelpModal } from './FishingHelpModal'

const FISHING_KEYS = [['fishing'], ['fishing-details']] as const

type FishingBait = FishingDetails['baits'][number]

function rodXpToNext(level: number) {
  return Math.max(1, level) * 100
}

function FishingBaitSlot({
  bait,
  kind,
  selected,
  canSelect,
  canAfford,
  deal,
  costLabel,
  busy,
  onSelect,
  onBuy,
}: {
  bait: FishingBait
  kind: FishingBaitKind
  selected: boolean
  canSelect: boolean
  canAfford: boolean
  deal: string
  costLabel: string
  busy: boolean
  onSelect: () => void
  onBuy: () => void
}) {
  const { t } = useTranslation('panel')
  return (
    <div className={`fishing-bait-slot${selected ? ' is-selected' : ''}`} title={bait.description || undefined}>
      <div className="fishing-bait-icon">
        {selected ? <span className="fishing-bait-status">{t('games.fishing.onTheHook')}</span> : null}
        <FishingBaitFrame
          kind={kind}
          stock={bait.quantity}
          selected={selected}
          label={
            canSelect
              ? t('games.fishing.selectBait', { name: bait.name })
              : t('games.fishing.selectBaitEmpty', { name: bait.name })
          }
          disabled={busy || !canSelect}
          onClick={onSelect}
        />
      </div>
      <div className="fishing-bait-meta">
        <strong>{bait.name}</strong>
        <small>
          {t('games.fishing.baitBonus', { bonus: bait.success_bonus })} · {costLabel}
        </small>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        aria-label={deal}
        disabled={busy || !canAfford}
        onClick={onBuy}
      >
        {t('games.fishing.getBait')}
      </Button>
    </div>
  )
}

export function FishingGame() {
  const { t, i18n } = useTranslation('panel')
  const language = contentLang(i18n.language)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['fishing-details', language],
    queryFn: gamesApi.fishingDetails,
  })
  const fishing = useQuery({
    queryKey: ['fishing', language],
    queryFn: gamesApi.fishing,
  })
  const action = useProgramAction()
  const [bait, setBait] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [result, setResult] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [pond, setPond] = useState<FishingPondState>('idle')
  const [catchFish, setCatchFish] = useState<{ name: string; rarity: string; art?: string } | null>(null)
  const packSize = fishing.data?.baits_per_token ?? query.data?.baits_per_token ?? 10
  const castCost = fishing.data?.cost ?? 1
  const baits = query.data?.baits ?? []
  const commonBait = baits.find((row) => row.paid_with !== 'baits')
  const commonStock = commonBait?.quantity ?? 0
  const stockedBaits = baits.filter((row) => row.quantity >= castCost)
  const selectedBait = stockedBaits.find((row) => row.id === bait) ?? stockedBaits[0]
  const baitTotal = baits.reduce((sum, row) => sum + row.quantity, 0)
  const rodLevel = fishing.data?.rod.level || 1
  const rodXp = fishing.data?.rod.xp ?? 0
  const xpToNext = rodXpToNext(rodLevel)
  const xpPercent = Math.min(100, Math.round((rodXp / xpToNext) * 100))
  const canCast =
    !!fishing.data?.active &&
    !fishing.isError &&
    !query.isError &&
    !query.isPending &&
    !!selectedBait
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 && quantity <= 999
  const shopReady = validQuantity && !!fishing.data && !query.isError && !fishing.isError
  const castLabel =
    pond === 'bite'
      ? t('games.fishing.biting')
      : action.busy
        ? t('games.fishing.casting')
        : t('games.fishing.cast')
  const recent = fishing.data?.recent ?? []
  const rarityColumns = splitFishRarityColumns(groupFishByRarity(query.data?.collection ?? []))

  function buyBait(row: FishingBait) {
    void action.run(async () => {
      const bought = await gamesApi.buyBait(row.id, quantity)
      writeCachedTokens(queryClient, bought.fichas)
      setBait(row.id)
    }, t('games.fishing.bought'), FISHING_KEYS)
  }

  return (
    <Card className="game-module game-fishing fishing-game">
      <ErrorNotice error={query.error || fishing.error || action.error} />
      {(query.isPending || fishing.isPending) && <Loading />}
      <div className="game-module-heading">
        <span className="game-module-icon">
          <Fish aria-hidden="true" />
        </span>
        <div>
          <span className="panel-eyebrow">{t('games.fishing.eyebrow')}</span>
          <div className="game-module-title">
            <h2>{t('games.fishing.title')}</h2>
            <IconButton
              label={t('games.fishing.helpLabel')}
              size="sm"
              variant="ghost"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp aria-hidden="true" />
            </IconButton>
          </div>
        </div>
        <span className="game-cost">{t('games.fishing.cost', { count: castCost })}</span>
      </div>
      <div className="fishing-board">
        <FishingPond state={pond} fishName={catchFish?.art || catchFish?.name} fishRarity={catchFish?.rarity} />
        <div className="fishing-stage">
          <div className="fishing-console">
            <div className="fishing-hud">
              <div className="fishing-stat">
                <small>{t('games.fishing.rod')}</small>
                <strong>{t('games.fishing.rodLevel', { level: rodLevel })}</strong>
              </div>
              <div className="fishing-stat">
                <small>{t('games.fishing.xp')}</small>
                <strong>{t('games.fishing.xpProgress', { xp: rodXp, next: xpToNext })}</strong>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-label={t('games.fishing.xp')}
                  aria-valuemin={0}
                  aria-valuemax={xpToNext}
                  aria-valuenow={rodXp}
                >
                  <i style={{ width: `${xpPercent}%` }} />
                </div>
              </div>
              <div className="fishing-stat">
                <small>{t('games.fishing.baits')}</small>
                <strong>{t('games.fishing.baitsValue', { count: baitTotal })}</strong>
              </div>
            </div>
            <div className="fishing-controls">
              <section className="fishing-play-pane">
                <header className="fishing-pane-head">
                  <p className="fishing-pane-title">{t('games.fishing.playTitle')}</p>
                  <div className="fishing-shop-bar">
                    <Field className="fishing-qty" label={t('games.fishing.buyQuantity')}>
                      <input
                        type="number"
                        step={1}
                        min={1}
                        max={999}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                    </Field>
                    <p className="muted fishing-shop-wallet">
                      {t('games.fishing.tokensWallet', { count: fishing.data?.fichas ?? 0 })}
                    </p>
                  </div>
                </header>
                <div className="fishing-bait-rack" role="group" aria-label={t('games.fishing.playTitle')}>
                  {baits.map((row) => {
                    const enchanted = row.paid_with === 'baits'
                    const kind = fishingBaitKind(row.paid_with, row.price)
                    const cost = (enchanted ? row.price : 1) * quantity
                    const canAfford = shopReady && (enchanted ? commonStock >= cost : (fishing.data?.fichas ?? 0) >= quantity)
                    const deal = enchanted
                      ? t('games.fishing.buyEnchanted', { cost, count: quantity, name: row.name })
                      : t('games.fishing.buy', { tokens: quantity, baits: packSize * quantity })
                    const costLabel = enchanted
                      ? t('games.fishing.getCostEnchanted', { cost, count: quantity })
                      : t('games.fishing.getCost', { count: quantity, tokens: quantity, baits: packSize * quantity })
                    return (
                      <FishingBaitSlot
                        key={row.id}
                        bait={row}
                        kind={kind}
                        selected={selectedBait?.id === row.id}
                        canSelect={row.quantity >= castCost}
                        canAfford={canAfford}
                        deal={deal}
                        costLabel={costLabel}
                        busy={action.busy}
                        onSelect={() => setBait(row.id)}
                        onBuy={() => buyBait(row)}
                      />
                    )
                  })}
                </div>
                {baits.length === 0 && <Empty>{t('games.fishing.shopEmpty')}</Empty>}
              </section>
              <section className="fishing-cast-pane">
                <p className="fishing-pane-title">{t('games.fishing.castTitle')}</p>
                {selectedBait ? (
                  <p className="fishing-cast-choice">
                    <small>{t('games.fishing.onTheHook')}</small>
                    <strong>{selectedBait.name}</strong>
                  </p>
                ) : (
                  <p className="muted">{t('games.fishing.insufficientBait')}</p>
                )}
                <form
                  className="fishing-cast"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!canCast || action.busy || !selectedBait) return
                    const usedBait = selectedBait
                    void action.run(async () => {
                      setPond('casting')
                      setCatchFish(null)
                      const started = Date.now()
                      try {
                        const r = await gamesApi.cast(usedBait.id)
                        writeCachedTokens(queryClient, r.fichas)
                        if (usedBait.quantity <= castCost) setBait('')
                        if (r.fish) setCatchFish({ name: r.fish.name, rarity: r.fish.rarity, art: r.fish.art })
                        await waitForFishingCast(started)
                        setPond('bite')
                        await waitForFishingBite(started)
                        setPond(r.success ? 'caught' : 'escaped')
                        setResult(
                          r.success
                            ? t('games.fishing.caught', { name: r.fish?.name })
                            : t('games.fishing.escaped'),
                        )
                        await waitForFishingReveal(started)
                        setPond('idle')
                        setCatchFish(null)
                      } catch (error) {
                        setPond('idle')
                        setCatchFish(null)
                        throw error
                      }
                    }, t('games.fishing.castDone'), FISHING_KEYS)
                  }}
                >
                  <Button type="submit" className="fishing-cast-button" disabled={action.busy || !canCast}>
                    {castLabel}
                  </Button>
                </form>
                <p className="muted fishing-cast-hint">{t('games.fishing.castCost', { count: castCost })}</p>
              </section>
            </div>
            <div className="fishing-console-note">
              {fishing.data && !fishing.data.active && (
                <p className="muted">{t('games.fishing.unavailable')}</p>
              )}
              {result && (
                <p className="program-note" role="status">
                  {result}
                </p>
              )}
            </div>
          </div>
        </div>
        <aside className="fishing-side">
          {recent.length > 0 && (
            <div className="game-subsection">
              <h3>{t('games.fishing.recentTitle')}</h3>
              <div className="fishing-recent-list">
                {recent.map((row, index) => (
                  <span className="fishing-recent" key={`${row.created_at}-${index}`}>
                    {row.success && row.fish ? (
                      <FishPortrait name={row.fish_art || row.fish} size="chip" />
                    ) : (
                      <i className="fishing-recent-miss" aria-hidden="true" />
                    )}
                    <b>{row.success ? row.fish : t('games.fishing.escapedShort')}</b>
                    <time dateTime={row.created_at}>{formatDateTime(row.created_at, 'short')}</time>
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      <div className="game-subsection">
        <h3>{t('games.fishing.collectionTitle')}</h3>
        <p className="muted">{t('games.fishing.collectionHint')}</p>
        <div className="fishing-tiers">
          {(['left', 'right'] as const).map((side) => {
            const tiers = rarityColumns[side]
            if (!tiers.length) return null
            return (
              <div className="fishing-tiers-col" data-side={side} key={side}>
                {tiers.map((tier) => (
                  <section className="fishing-tier" data-rarity={tier.rarity} key={tier.rarity}>
                    <header className="fishing-tier-head">
                      <h4>{t(`games.fishing.rarity.${tier.rarity}`, { defaultValue: tier.rarity })}</h4>
                      <small>
                        {t('games.fishing.tierProgress', {
                          found: tier.items.filter((f) => f.count > 0).length,
                          total: tier.items.length,
                        })}
                      </small>
                    </header>
                    <div className="fishing-collection">
                      {tier.items.map((f) => (
                        <article
                          className={`fishing-collection-card ${f.count ? '' : 'is-locked'}`}
                          key={f.id}
                        >
                          <FishPortrait name={f.art || f.name} rarity={f.rarity} discovered={f.count > 0} />
                          <h3>{f.name}</h3>
                          <small>
                            {f.count
                              ? t('games.fishing.captures', { count: f.count })
                              : t('games.fishing.undiscovered')}
                          </small>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          })}
        </div>
      </div>
      <FishingHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Card>
  )
}
