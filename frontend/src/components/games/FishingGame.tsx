import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Fish } from 'lucide-react'
import { gamesApi } from '../../services/api'
import { contentLang } from '../../i18n/locale'
import { formatDateTime } from '../../lib/formatters'
import { Empty, ErrorNotice, Loading } from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'
import {
  FishPortrait,
  FishingBaitFrame,
  FishingPond,
  fishingBaitKind,
  type FishingPondState,
} from './GameVisuals'
import { groupFishByRarity, splitFishRarityColumns } from './gameArt'
import { waitForFishingBite, waitForFishingCast, waitForFishingReveal } from './fishingReveal'
import { writeCachedTokens } from './gameTokens'

const FISHING_KEYS = [['fishing'], ['fishing-details']] as const

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
  const [openBait, setOpenBait] = useState('')
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
  const canCast =
    !!fishing.data?.active &&
    !fishing.isError &&
    !query.isError &&
    !query.isPending &&
    !!selectedBait
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 && quantity <= 999
  const castLabel =
    pond === 'bite'
      ? t('games.fishing.biting')
      : action.busy
        ? t('games.fishing.casting')
        : t('games.fishing.cast')
  const recent = fishing.data?.recent ?? []
  const rarityColumns = splitFishRarityColumns(groupFishByRarity(query.data?.collection ?? []))
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
          <h2>{t('games.fishing.title')}</h2>
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
                <strong>{t('games.fishing.rodLevel', { level: fishing.data?.rod.level || 1 })}</strong>
              </div>
              <div className="fishing-stat">
                <small>{t('games.fishing.xp')}</small>
                <strong>{t('games.fishing.xpValue', { xp: fishing.data?.rod.xp ?? 0 })}</strong>
              </div>
              <div className="fishing-stat">
                <small>{t('games.fishing.baits')}</small>
                <strong>{t('games.fishing.baitsValue', { count: baitTotal })}</strong>
              </div>
            </div>
            <div className="fishing-controls">
              <div className="fishing-play">
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
                  <Field label={t('games.fishing.bait')}>
                    <select
                      value={selectedBait?.id ?? ''}
                      disabled={action.busy}
                      onChange={(e) => setBait(e.target.value)}
                    >
                      <option value="">{t('games.fishing.noBait')}</option>
                      {query.data?.baits
                        .filter((b) => b.quantity > 0)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {t('games.fishing.baitOption', {
                              name: b.name,
                              quantity: b.quantity,
                              bonus: b.success_bonus,
                            })}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Button type="submit" className="fishing-cast-button" disabled={action.busy || !canCast}>
                    {castLabel}
                  </Button>
                </form>
              </div>
              <i className="fishing-dock-split" aria-hidden="true" />
              <div className="fishing-shop">
                <p className="fishing-shop-title">{t('games.fishing.shopTitle')}</p>
                <div className="fishing-shop-row">
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
                  <div className="fishing-shop-icons">
                    {baits.map((b) => {
                      const enchanted = b.paid_with === 'baits'
                      const kind = fishingBaitKind(b.paid_with, b.price)
                      const cost = (enchanted ? b.price : 1) * quantity
                      const canAfford = enchanted
                        ? commonStock >= cost
                        : (fishing.data?.fichas ?? 0) >= quantity
                      const deal = enchanted
                        ? t('games.fishing.buyEnchanted', { cost, count: quantity, name: b.name })
                        : t('games.fishing.buy', { tokens: quantity, baits: packSize * quantity })
                      return (
                        <div
                          className={`fishing-bait-buy${openBait === b.id ? ' is-open' : ''}`}
                          key={b.id}
                          onMouseEnter={() => setOpenBait(b.id)}
                          onMouseLeave={() => setOpenBait('')}
                        >
                          <FishingBaitFrame
                            kind={kind}
                            stock={b.quantity}
                            label={deal}
                            selected={selectedBait?.id === b.id}
                            onFocus={() => setOpenBait(b.id)}
                            onBlur={() => setOpenBait('')}
                            disabled={
                              action.busy ||
                              !validQuantity ||
                              !fishing.data ||
                              query.isError ||
                              fishing.isError ||
                              !canAfford
                            }
                            onClick={() =>
                              void action.run(async () => {
                                const bought = await gamesApi.buyBait(b.id, quantity)
                                writeCachedTokens(queryClient, bought.fichas)
                                setBait(b.id)
                              }, t('games.fishing.bought'), FISHING_KEYS)
                            }
                          />
                          <div className="fishing-bait-tip" role="tooltip" hidden={openBait !== b.id}>
                            <strong>{b.name}</strong>
                            {b.description ? <p>{b.description}</p> : null}
                            <small>{deal}</small>
                            <small>
                              {t('games.fishing.baitChance', {
                                bonus: b.success_bonus,
                                quantity: b.quantity,
                              })}
                            </small>
                            {!enchanted ? (
                              <small>{t('games.fishing.exchangeRate', { count: packSize })}</small>
                            ) : (
                              <small>{t('games.fishing.enchantedHint')}</small>
                            )}
                            <small>{t('games.fishing.tokensWallet', { count: fishing.data?.fichas ?? 0 })}</small>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {query.data?.baits.length === 0 && <Empty>{t('games.fishing.shopEmpty')}</Empty>}
              </div>
            </div>
            <div className="fishing-console-note">
              <p className="muted fishing-cast-hint">{t('games.fishing.castCost', { count: castCost })}</p>
              {fishing.data && !fishing.data.active && (
                <p className="muted">{t('games.fishing.unavailable')}</p>
              )}
              {fishing.data?.active && !selectedBait && (
                <p className="muted">{t('games.fishing.insufficientBait')}</p>
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
    </Card>
  )
}
