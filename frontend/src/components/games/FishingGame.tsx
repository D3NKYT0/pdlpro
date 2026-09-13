import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Fish } from 'lucide-react'
import { gamesApi } from '../../services/api'
import { formatDateTime } from '../../lib/formatters'
import { Empty, ErrorNotice, Loading } from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'
import { FishPortrait, FishingPond, type FishingPondState } from './GameVisuals'
import { waitForFishingBite, waitForFishingCast } from './fishingReveal'

const FISHING_KEYS = [['fishing'], ['fishing-details']] as const

export function FishingGame() {
  const { t } = useTranslation('panel')
  const query = useQuery({
    queryKey: ['fishing-details'],
    queryFn: gamesApi.fishingDetails,
  })
  const fishing = useQuery({
    queryKey: ['fishing'],
    queryFn: gamesApi.fishing,
  })
  const action = useProgramAction()
  const [bait, setBait] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [result, setResult] = useState('')
  const [pond, setPond] = useState<FishingPondState>('idle')
  const [catchFish, setCatchFish] = useState<{ name: string; rarity: string } | null>(null)
  const selectedBait = query.data?.baits.find((b) => b.id === bait && b.quantity > 0)
  const canCast =
    !!fishing.data?.active &&
    !fishing.isError &&
    !query.isError &&
    !query.isPending &&
    (fishing.data?.fichas ?? 0) >= (fishing.data?.cost ?? 1)
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 && quantity <= 999
  const castLabel =
    pond === 'bite'
      ? t('games.fishing.biting')
      : action.busy
        ? t('games.fishing.casting')
        : t('games.fishing.cast')
  const recent = fishing.data?.recent ?? []
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
        <span className="game-cost">{t('games.fishing.cost', { count: fishing.data?.cost || 1 })}</span>
      </div>
      <div className="fishing-board">
        <div className="fishing-stage">
          <FishingPond state={pond} fishName={catchFish?.name} fishRarity={catchFish?.rarity} />
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
              <small>{t('games.fishing.tokens')}</small>
              <strong>{fishing.data?.fichas || 0}</strong>
            </div>
          </div>
          <form
            className="fishing-cast"
            onSubmit={(e) => {
              e.preventDefault()
              if (!canCast || action.busy) return
              void action.run(async () => {
                setPond('casting')
                setCatchFish(null)
                const started = Date.now()
                try {
                  const r = await gamesApi.cast(selectedBait?.id)
                  if (selectedBait?.quantity === 1) setBait('')
                  if (r.fish) setCatchFish(r.fish)
                  await waitForFishingCast(started)
                  setPond('bite')
                  await waitForFishingBite(started)
                  setPond(r.success ? 'caught' : 'escaped')
                  setResult(
                    r.success
                      ? t('games.fishing.caught', { name: r.fish?.name })
                      : t('games.fishing.escaped'),
                  )
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
            <p className="muted fishing-cast-hint">
              {t('games.fishing.castCost', { cost: fishing.data?.cost || 1 })}
            </p>
          </form>
          {fishing.data && !fishing.data.active && (
            <p className="muted">{t('games.fishing.unavailable')}</p>
          )}
          {fishing.data?.active && fishing.data.fichas < fishing.data.cost && (
            <p className="muted">{t('games.fishing.insufficientTokens')}</p>
          )}
          {result && (
            <p className="program-note" role="status">
              {result}
            </p>
          )}
        </div>
        <aside className="fishing-side">
          <div className="game-subsection">
            <h3>{t('games.fishing.shopTitle')}</h3>
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
            {query.data?.baits.map((b) => (
              <article className="fishing-bait" key={b.id}>
                <div>
                  <h3>{b.name}</h3>
                  <p>{b.description}</p>
                  <small>
                    {t('games.fishing.baitChance', {
                      bonus: b.success_bonus,
                      quantity: b.quantity,
                    })}
                  </small>
                </div>
                <Button
                  type="button"
                  className="ghost"
                  disabled={
                    action.busy ||
                    !validQuantity ||
                    !fishing.data ||
                    query.isError ||
                    fishing.isError ||
                    fishing.data.fichas < b.price * quantity
                  }
                  onClick={() =>
                    void action.run(
                      () => gamesApi.buyBait(b.id, quantity),
                      t('games.fishing.bought'),
                      FISHING_KEYS,
                    )
                  }
                >
                  {t('games.fishing.buy', { price: b.price * quantity })}
                </Button>
              </article>
            ))}
            {query.data?.baits.length === 0 && <Empty>{t('games.fishing.shopEmpty')}</Empty>}
          </div>
          {recent.length > 0 && (
            <div className="game-subsection">
              <h3>{t('games.fishing.recentTitle')}</h3>
              <div className="fishing-recent-list">
                {recent.map((row, index) => (
                  <span className="fishing-recent" key={`${row.created_at}-${index}`}>
                    {row.success && row.fish ? (
                      <FishPortrait name={row.fish} size="chip" />
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
        <div className="fishing-collection">
          {query.data?.collection.map((f) => (
            <article
              className={`fishing-collection-card ${f.count ? '' : 'is-locked'}`}
              key={f.id}
            >
              <FishPortrait name={f.name} rarity={f.rarity} discovered={f.count > 0} />
              <h3>{f.name}</h3>
              <small>
                {t('games.fishing.collectionMeta', {
                  rarity: t(`games.fishing.rarity.${f.rarity}`, { defaultValue: f.rarity }),
                  detail: f.count
                    ? t('games.fishing.captures', { count: f.count })
                    : t('games.fishing.undiscovered'),
                })}
              </small>
            </article>
          ))}
        </div>
      </div>
    </Card>
  )
}
