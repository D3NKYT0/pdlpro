import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Fish } from 'lucide-react'
import { gamesApi } from '../../services/api'
import { Empty, ErrorNotice, Loading } from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'

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
  const selectedBait = query.data?.baits.find((b) => b.id === bait && b.quantity > 0)
  const canCast =
    !!fishing.data?.active &&
    !fishing.isError &&
    !query.isError &&
    !query.isPending &&
    (fishing.data?.fichas ?? 0) >= (fishing.data?.cost ?? 1)
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 && quantity <= 999
  return (
    <div className="program-page fishing-game">
      <ErrorNotice error={query.error || fishing.error || action.error} />
      {(query.isPending || fishing.isPending) && <Loading />}
      <div className="program-two">
        <Card className="program-section">
          <div>
            <span className="panel-eyebrow">{t('games.fishing.eyebrow')}</span>
            <h2>{t('games.fishing.title')}</h2>
          </div>
          <div className="program-grid">
            <div className="program-stat">
              <small>{t('games.fishing.rod')}</small>
              <strong>{t('games.fishing.rodLevel', { level: fishing.data?.rod.level || 1 })}</strong>
            </div>
            <div className="program-stat">
              <small>{t('games.fishing.xp')}</small>
              <strong>{t('games.fishing.xpValue', { xp: fishing.data?.rod.xp ?? 0 })}</strong>
            </div>
            <div className="program-stat">
              <small>{t('games.fishing.tokens')}</small>
              <strong>{fishing.data?.fichas || 0}</strong>
            </div>
          </div>
          <form
            className="program-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!canCast || action.busy) return
              void action.run(async () => {
                const r = await gamesApi.cast(selectedBait?.id)
                if (selectedBait?.quantity === 1) setBait('')
                setResult(
                  r.success
                    ? t('games.fishing.caught', { name: r.fish?.name })
                    : t('games.fishing.escaped'),
                )
              }, t('games.fishing.castDone'), FISHING_KEYS)
            }}
          >
            <label>
              {t('games.fishing.bait')}
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
            </label>
            <small className="muted">
              {t('games.fishing.castCost', { cost: fishing.data?.cost || 1 })}
            </small>
            <Button
              type="submit"
              className="fishing-cast-button"
              disabled={action.busy || !canCast}
            >
              {action.busy ? t('games.fishing.casting') : t('games.fishing.cast')}
            </Button>
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
        </Card>
        <Card className="program-section">
          <h2>{t('games.fishing.shopTitle')}</h2>
          <label className="program-form">
            {t('games.fishing.buyQuantity')}
            <input
              type="number"
              step={1}
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          {query.data?.baits.map((b) => (
            <article className="program-item" key={b.id}>
              <h3>{b.name}</h3>
              <p>{b.description}</p>
              <small>
                {t('games.fishing.baitChance', {
                  bonus: b.success_bonus,
                  quantity: b.quantity,
                })}
              </small>
              <Button
                type="submit"
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
          {query.data?.baits.length === 0 && (
            <Empty>{t('games.fishing.shopEmpty')}</Empty>
          )}
        </Card>
      </div>
      {(fishing.data?.recent ?? []).length > 0 && (
        <Card className="program-section">
          <h2>{t('games.fishing.recentTitle')}</h2>
          <div className="recent-results">
            {fishing.data?.recent.map((row, index) => (
              <span key={`${row.created_at}-${index}`}>
                {row.success ? row.fish : t('games.fishing.escapedShort')} · {row.created_at}
              </span>
            ))}
          </div>
        </Card>
      )}
      <Card className="program-section">
        <h2>{t('games.fishing.collectionTitle')}</h2>
        <p className="muted">{t('games.fishing.collectionHint')}</p>
        <div className="program-grid">
          {query.data?.collection.map((f) => (
            <article
              className={`program-item ${f.count ? '' : 'program-day is-locked'}`}
              key={f.id}
            >
              <Fish color={f.count ? 'var(--gold)' : 'var(--muted)'} />
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
      </Card>
    </div>
  )
}
