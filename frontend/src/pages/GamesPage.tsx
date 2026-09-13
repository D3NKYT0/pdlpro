import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { useFeedbackAction } from '../hooks/useFeedbackAction'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpRight,
  Box,
  CircleHelp,
  Coins,
  Dices,
  Fish,
  Gift,
  RotateCw,
  Sparkles,
  Sword,
  type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { gamesApi } from '../services/api'
import { isInsufficientTokens } from '../lib/errors'
import { formatCompactQuantity } from '../lib/formatters'
import { ItemIcon } from '../components/ItemIcon'
import { FishingGame } from '../components/games/FishingGame'
import { BoxHuntCard } from '../components/games/BoxCatalog'
import { BoxRevealModal } from '../components/games/BoxRevealModal'
import { sortBoxesByRarity } from '../components/games/gameArt'
import { ChanceStage, MonsterPortrait, RouletteField, RouletteWheel } from '../components/games/GameVisuals'
import { waitForBoxReveal, waitForBoxShake } from '../components/games/boxReveal'
import { waitForDiceReveal, waitForDiceRest } from '../components/games/diceReveal'
import { waitForSlotsReveal } from '../components/games/slotsReveal'
import { ROULETTE_SLOW_MS, waitForRouletteReveal } from '../components/games/rouletteReveal'
import { ResourceGate } from '../components/programs/ResourceGate'
import { BuyTokensModal } from '../components/games/BuyTokensModal'
import { BoxHelpModal } from '../components/games/BoxHelpModal'
import { ChanceRevealModal } from '../components/games/ChanceRevealModal'

type PlayFx = {
  playing?: 'spin' | 'open' | 'dice' | 'slots' | 'fight'
  targetId?: string
  spinFailed?: boolean
  prizeName?: string | null
  prizeQuantity?: number
  prizeItemId?: number
  prizeEnchant?: number
  overlay?: boolean
  boxName?: string
  hunt?: boolean
  slowing?: boolean
  diceRoll?: number
  diceWon?: boolean
  diceChosen?: boolean
  slotsReels?: string[]
  slotsWon?: boolean
  chanceOverlay?: 'dice' | 'slots'
  chancePayout?: number
}

type GameTab = 'roulette' | 'boxes' | 'chance' | 'fishing' | 'economy'

const gameTabs: Array<{ id: GameTab; icon: LucideIcon }> = [
  { id: 'roulette', icon: RotateCw },
  { id: 'boxes', icon: Box },
  { id: 'chance', icon: Dices },
  { id: 'fishing', icon: Fish },
  { id: 'economy', icon: Sword },
]

export function GamesPage() {
  const { t } = useTranslation('panel')
  const action = useFeedbackAction()
  const queryClient = useQueryClient()
  const roulette = useQuery({ queryKey: ['roulette'], queryFn: gamesApi.roulette })
  const bonus = useQuery({ queryKey: ['daily-bonus'], queryFn: gamesApi.dailyBonus })
  const boxes = useQuery({ queryKey: ['boxes'], queryFn: gamesApi.boxes })
  const minigames = useQuery({ queryKey: ['minigames'], queryFn: gamesApi.minigames })
  const economy = useQuery({ queryKey: ['economy'], queryFn: gamesApi.economy })
  const [amount, setAmount] = useState('5')
  const [diceAmount, setDiceAmount] = useState('1')
  const [diceType, setDiceType] = useState('even')
  const [fx, setFx] = useState<PlayFx>({})
  const diceRestSeq = useRef(0)
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null)
  const [buyTokensOpen, setBuyTokensOpen] = useState(false)
  const [boxHelpOpen, setBoxHelpOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const requestedGame = params.get('tab')
  const activeGame = gameTabs.find((tab) => tab.id === requestedGame)?.id ?? 'roulette'
  function setActiveGame(tab: GameTab) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('tab', tab)
      return next
    })
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['roulette'] })
    await queryClient.invalidateQueries({ queryKey: ['daily-bonus'] })
    await queryClient.invalidateQueries({ queryKey: ['bag'] })
    await queryClient.invalidateQueries({ queryKey: ['boxes'] })
    await queryClient.invalidateQueries({ queryKey: ['minigames'] })
    await queryClient.invalidateQueries({ queryKey: ['fishing'] })
    await queryClient.invalidateQueries({ queryKey: ['economy'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
    await queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }

  const knownTokens = roulette.data?.fichas ?? minigames.data?.fichas
  const tokens = knownTokens ?? 0
  const quietTokens = { quiet: isInsufficientTokens }

  function needTokens(cost = 1) {
    if (knownTokens == null || knownTokens >= cost) return false
    setBuyTokensOpen(true)
    return true
  }

  function noteTokenFailure(error: unknown) {
    if (isInsufficientTokens(error)) setBuyTokensOpen(true)
  }

  async function spin() {
    if (needTokens(roulette.data?.cost ?? 1)) return
    setFx({ playing: 'spin' })
    const outcome = await action.run(async () => {
      const startedAt = Date.now()
      const result = await gamesApi.spin()
      await waitForRouletteReveal(startedAt)
      return result
    }, t('games.toast.spinError'), quietTokens)
    if (outcome.ok) {
      setFx({
        spinFailed: outcome.value.failed,
        prizeName: outcome.value.failed ? null : outcome.value.prize?.name ?? null,
        prizeQuantity: outcome.value.prize?.quantity ?? 1,
        prizeItemId: outcome.value.prize?.item_id,
      })
      await refresh()
    } else {
      noteTokenFailure(outcome.error)
      setFx({})
    }
  }

  async function buy(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await gamesApi.buyTokens(Number(amount))
      toast.success(t('games.toast.tokensCredited'))
      setBuyTokensOpen(false)
      await refresh()
    }, t('games.toast.buyTokensError'))
  }

  async function claim() {
    await action.run(async () => {
      const result = await gamesApi.claimDailyBonus()
      toast.success(t('games.toast.bonusCredited', { amount: result.amount }))
      await refresh()
    }, t('games.toast.claimError'))
  }

  async function buyBox(id: string, reset = false) {
    await action.run(async () => {
      await gamesApi.buyBox(id)
      toast.success(t(reset ? 'games.toast.boxReset' : 'games.toast.boxBought'))
      await refresh()
    }, t(reset ? 'games.toast.resetBoxError' : 'games.toast.buyBoxError'))
  }

  function requestBuy(id: string, name: string, reset: boolean, locked: boolean) {
    if (locked) return
    if (reset) {
      setResetTarget({ id, name })
      return
    }
    void buyBox(id, false)
  }

  async function confirmReset() {
    if (!resetTarget) return
    const { id } = resetTarget
    setResetTarget(null)
    await buyBox(id, true)
  }

  async function openBox(id: string) {
    if (needTokens(1)) return
    const boxName = ownedBoxes.find((row) => row.id === id)?.type_name
    setFx({ playing: 'open', targetId: id, boxName })
    const outcome = await action.run(async () => {
      const startedAt = Date.now()
      const pending = gamesApi.openBox(id)
      await waitForBoxShake(startedAt)
      setFx((current) => ({ ...current, overlay: true }))
      const result = await pending
      await waitForBoxReveal(startedAt)
      setFx({
        targetId: id,
        boxName,
        overlay: true,
        prizeName: result.item.name,
        prizeQuantity: result.item.quantity ?? 1,
        prizeItemId: result.item.item_id,
        prizeEnchant: result.item.enchant,
        hunt: result.hunt === true,
      })
      await refresh()
      return result
    }, t('games.toast.openBoxError'), quietTokens)
    if (!outcome.ok) {
      noteTokenFailure(outcome.error)
      setFx({})
    }
  }

  async function playDice(event: FormEvent) {
    event.preventDefault()
    if (needTokens(Number(diceAmount) || 1)) return
    const startedAt = Date.now()
    diceRestSeq.current += 1
    const restSeq = diceRestSeq.current
    setFx((current) => ({
      playing: 'dice',
      diceRoll: current.diceRoll,
      slotsReels: current.slotsReels,
      slotsWon: current.slotsWon,
    }))
    const outcome = await action.run(async () => {
      const result = await gamesApi.dice({ bet_type: diceType, amount: Number(diceAmount) })
      setFx((current) => ({
        playing: 'dice',
        diceRoll: result.roll,
        diceWon: result.won,
        slotsReels: current.slotsReels,
      }))
      await waitForDiceReveal(startedAt)
      await refresh()
      return result
    }, t('games.toast.diceError'), quietTokens)
    if (outcome.ok) {
      setFx((current) => ({
        diceRoll: outcome.value.roll,
        diceWon: outcome.value.won,
        diceChosen: true,
        chanceOverlay: 'dice',
        chancePayout: outcome.value.payout,
        slotsReels: current.slotsReels,
        slotsWon: current.slotsWon,
      }))
      void waitForDiceRest().then(() => {
        if (diceRestSeq.current !== restSeq) return
        setFx((current) => {
          if (current.playing === 'dice') return current
          return {
            diceRoll: current.diceRoll,
            slotsReels: current.slotsReels,
            slotsWon: current.slotsWon,
            chanceOverlay: current.chanceOverlay,
            chancePayout: current.chancePayout,
          }
        })
      })
    } else {
      noteTokenFailure(outcome.error)
      setFx((current) => ({ diceRoll: current.diceRoll, slotsReels: current.slotsReels }))
    }
  }

  async function playSlots() {
    if (needTokens(minigames.data?.slots.cost ?? 1)) return
    const startedAt = Date.now()
    setFx((current) => ({
      playing: 'slots',
      diceRoll: current.diceRoll,
      diceWon: current.diceWon,
      diceChosen: current.diceChosen,
      slotsReels: current.slotsReels,
    }))
    const outcome = await action.run(async () => {
      const result = await gamesApi.slots()
      setFx((current) => ({
        playing: 'slots',
        diceRoll: current.diceRoll,
        diceWon: current.diceWon,
        diceChosen: current.diceChosen,
        slotsReels: result.reels,
        slotsWon: result.won,
      }))
      await waitForSlotsReveal(startedAt)
      await refresh()
      return result
    }, t('games.toast.slotsError'), quietTokens)
    if (outcome.ok) {
      setFx((current) => ({
        diceRoll: current.diceRoll,
        diceWon: current.diceWon,
        diceChosen: current.diceChosen,
        slotsReels: outcome.value.reels,
        slotsWon: outcome.value.won,
        chanceOverlay: 'slots',
        chancePayout: outcome.value.payout,
      }))
    } else {
      noteTokenFailure(outcome.error)
      setFx((current) => ({
        diceRoll: current.diceRoll,
        diceWon: current.diceWon,
        diceChosen: current.diceChosen,
        slotsReels: current.slotsReels,
      }))
    }
  }

  async function fight(monsterId: string) {
    if (needTokens(1)) return
    setFx({ playing: 'fight', targetId: monsterId })
    const outcome = await action.run(async () => {
      const result = await gamesApi.fight(monsterId)
      toast[result.won ? 'success' : 'error'](
        result.won ? t('games.toast.fightWin', { fragments: result.fragments_earned }) : t('games.toast.fightLoss'),
      )
      await refresh()
      return result
    }, t('games.toast.fightError'), quietTokens)
    if (!outcome.ok) noteTokenFailure(outcome.error)
    setFx(outcome.ok ? { targetId: monsterId } : {})
  }

  async function enchant() {
    await action.run(async () => {
      const result = await gamesApi.enchant()
      toast[result.success ? 'success' : 'error'](
        result.success ? t('games.toast.enchantSuccess', { level: result.weapon.level }) : t('games.toast.enchantFailed'),
      )
      await refresh()
    }, t('games.toast.enchantError'))
  }

  useEffect(() => {
    if (fx.playing !== 'spin') return
    const timer = window.setTimeout(() => {
      setFx((current) => (current.playing === 'spin' ? { ...current, slowing: true } : current))
    }, ROULETTE_SLOW_MS)
    return () => window.clearTimeout(timer)
  }, [fx.playing])

  const shopBoxes = sortBoxesByRarity(boxes.data?.types ?? [], (row) => row.name, (row) => row.price)
  const ownedBoxes = sortBoxesByRarity(
    boxes.data?.boxes ?? [],
    (row) => row.type_name,
  )
  return (
    <div className="games-page">
      <Card as="header" className="games-hero">
        <div className="games-hero-copy">
          <span className="panel-eyebrow">{t('games.eyebrow')}</span>
          <h1>{t('games.title')}</h1>
          <p className="muted">{t('games.description')}</p>
          <Link className="games-hero-jump" to="/panel/rewards">
            {t('games.rewardsLink')}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
        <div className="token-balance">
          <Coins aria-hidden="true" />
          <span>{t('games.balance')}</span>
          <strong>{t('games.tokens', { count: tokens })}</strong>
        </div>
      </Card>

      <Tabs id="game" label={t('games.tabsLabel')} className="game-tabs" value={activeGame} onChange={setActiveGame} items={gameTabs.map(({ id, icon: Icon }) => ({ id, label: t(`games.tabs.${id}`), icon: <Icon aria-hidden="true" /> }))} />

      <fieldset className="game-tab-panels ui-action-group" disabled={action.pending}>
        <div
          className="game-tab-layout roulette-tab"
          id="game-panel-roulette"
          role="tabpanel"
          aria-labelledby="game-tab-roulette"
          hidden={activeGame !== 'roulette'}
        >
          <Card className="game-module game-roulette">
          <div className="game-module-heading">
            <span className="game-module-icon"><RotateCw aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">{t('games.roulette.eyebrow')}</span>
              <h2>{t('games.roulette.title')}</h2>
            </div>
            <span className="game-cost">{t('games.roulette.cost', { count: roulette.data?.cost ?? 1 })}</span>
          </div>

          <div className="roulette-content">
            <div className="roulette-action">
              <RouletteField />
              <RouletteWheel
                tokens={tokens}
                spinning={fx.playing === 'spin'}
                slowing={fx.slowing === true}
                missed={fx.spinFailed === true}
                prizeName={fx.prizeName}
                prizeQuantity={fx.prizeQuantity}
                prizeItemId={fx.prizeItemId}
                prizes={roulette.data?.prizes ?? []}
                missLabel={t('games.roulette.missed')}
              />
              <p className="muted">{t('games.roulette.failChance', { percent: roulette.data?.fail_chance ?? 20 })}</p>
              <Button type="button" onClick={() => void spin()}>
                <Sparkles aria-hidden="true" /> {t('games.roulette.spin')}
              </Button>
            </div>

            <div className="roulette-side">
              <form className="game-inline-form" onSubmit={buy}>
                <Field>
                  {t('games.roulette.buyLabel')} <span>{t('games.roulette.buyHint')}</span>
                  <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" />
                </Field>
                <Button className="ghost" type="submit">
                  <Coins aria-hidden="true" /> {t('games.roulette.buy')}
                </Button>
              </form>

              <div className="game-subsection">
                <h3>{t('games.roulette.prizes')}</h3>
                <div className="prize-list">
                  {(roulette.data?.prizes ?? []).map((prize) => (
                    <div
                      className={`prize-item${fx.prizeName === prize.name && (fx.prizeQuantity ?? 1) === (prize.quantity ?? 1) ? ' is-hit' : ''}`}
                      key={prize.id}
                    >
                      <ItemIcon itemId={prize.item_id} name={prize.name} size={28} />
                      <span>
                        <strong>{prize.name}</strong>
                        <small>{prize.rarity}</small>
                      </span>
                      <b>{t('games.roulette.prizeQty', { quantity: formatCompactQuantity(prize.quantity ?? 1) })}</b>
                    </div>
                  ))}
                  {!roulette.data?.prizes.length ? <p className="game-empty">{t('games.roulette.noPrizes')}</p> : null}
                </div>
              </div>
            </div>
          </div>
          </Card>

          <Card className="game-module game-daily">
          <div className="game-module-heading">
            <span className="game-module-icon"><Gift aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">{t('games.daily.eyebrow')}</span>
              <h2>{t('games.daily.title')}</h2>
            </div>
          </div>
          <div className="daily-value">
            <span>{t('games.daily.todayValue')}</span>
            <strong>R$ {bonus.data?.amount ?? '10.00'}</strong>
          </div>
          {bonus.data?.claimed ? (
            <div className="game-state is-complete"><Sparkles aria-hidden="true" /> {t('games.daily.claimed')}</div>
          ) : (
            <Button type="button" onClick={() => void claim()}>
              <Gift aria-hidden="true" /> {t('games.daily.claim')}
            </Button>
          )}
          <div className="game-guide">
            <h3>{t('games.daily.guideTitle')}</h3>
            <p className="muted">{t('games.daily.guideLead')}</p>
            <h3>{t('games.daily.tipsTitle')}</h3>
            <ul className="game-guide-list">
              <li>{t('games.daily.tips.spin')}</li>
              <li>{t('games.daily.tips.miss', { percent: roulette.data?.fail_chance ?? 20 })}</li>
              <li>{t('games.daily.tips.prize')}</li>
              <li>{t('games.daily.tips.daily')}</li>
            </ul>
          </div>
          </Card>
        </div>

        <Card
          className="game-module game-boxes"
          id="game-panel-boxes"
          role="tabpanel"
          aria-labelledby="game-tab-boxes"
          hidden={activeGame !== 'boxes'}
        >
          <div className="game-module-heading">
            <span className="game-module-icon"><Box aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">{t('games.boxes.eyebrow')}</span>
              <div className="game-module-title">
                <h2>{t('games.boxes.title')}</h2>
                <IconButton
                  label={t('games.boxes.helpLabel')}
                  size="sm"
                  variant="ghost"
                  onClick={() => setBoxHelpOpen(true)}
                >
                  <CircleHelp aria-hidden="true" />
                </IconButton>
              </div>
              <p className="muted">{t('games.boxes.lead')}</p>
            </div>
          </div>
          {ownedBoxes.length ? (
            <div className="game-subsection">
              <h3>{t('games.boxes.ownedTitle')}</h3>
              <div className="game-box-grid">
                {ownedBoxes.map((row) => (
                  <BoxHuntCard
                    key={row.id}
                    name={row.type_name}
                    featured={row.featured}
                    items={row.items}
                    owned
                    remaining={row.remaining}
                    total={row.total}
                    huntRemaining={row.hunt_remaining !== false}
                    opening={fx.playing === 'open' && fx.targetId === row.id && !fx.overlay}
                    onAction={() => void openBox(row.id)}
                    actionLabel={t('games.boxes.open', { count: 1 })}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {shopBoxes.length ? (
            <div className="game-subsection">
              <h3>{t('games.boxes.shopTitle')}</h3>
              <div className="game-box-grid">
                {shopBoxes.map((row) => {
                  const owned = ownedBoxes.find((box) => box.type_id === row.id || box.type_name === row.name)
                  const opened = owned != null && (owned.remaining ?? 0) < (owned.total ?? 0)
                  const resetting = owned != null
                  const locked = resetting && !opened
                  return (
                    <BoxHuntCard
                      key={row.id}
                      name={row.name}
                      price={row.price}
                      opens={row.boosters_amount}
                      featured={row.featured}
                      items={row.items}
                      resetting={resetting}
                      locked={locked}
                      onAction={() => requestBuy(row.id, row.name, resetting, locked)}
                      actionLabel={t(resetting ? 'games.boxes.reset' : 'games.boxes.buy')}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}
          {!boxes.data?.types.length && !boxes.data?.boxes.length ? (
            <div className="game-empty"><Box aria-hidden="true" /> {t('games.boxes.empty')}</div>
          ) : null}
        </Card>
        <BoxHelpModal open={boxHelpOpen} onClose={() => setBoxHelpOpen(false)} />
        <Modal
          className="game-box-reset-modal"
          open={resetTarget != null}
          title={t('games.boxes.resetConfirmTitle')}
          onClose={() => setResetTarget(null)}
        >
          <p>{t('games.boxes.resetConfirm', { name: resetTarget?.name ?? '' })}</p>
          <div className="game-box-reset-actions">
            <Button variant="warning" type="button" onClick={() => void confirmReset()}>
              {t('games.boxes.resetConfirmAction')}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setResetTarget(null)}>
              {t('games.boxes.resetCancel')}
            </Button>
          </div>
        </Modal>
        <BuyTokensModal
          open={buyTokensOpen}
          tokens={tokens}
          amount={amount}
          pending={action.pending}
          onAmountChange={setAmount}
          onClose={() => setBuyTokensOpen(false)}
          onConfirm={buy}
        />
        <BoxRevealModal
          open={fx.overlay === true}
          name={fx.boxName ?? ''}
          opening={fx.playing === 'open'}
          prizeName={fx.prizeName}
          prizeItemId={fx.prizeItemId}
          prizeQuantity={fx.prizeQuantity}
          prizeEnchant={fx.prizeEnchant}
          hunt={fx.hunt === true}
          onClose={() => setFx({})}
        />
        <ChanceRevealModal
          open={fx.chanceOverlay != null}
          kind={fx.chanceOverlay}
          won={(fx.chanceOverlay === 'dice' ? fx.diceWon : fx.slotsWon) === true}
          roll={fx.diceRoll}
          reels={fx.slotsReels}
          payout={fx.chancePayout}
          onClose={() => setFx((current) => ({ ...current, chanceOverlay: undefined }))}
        />

        <Card
          className="game-module game-chance"
          id="game-panel-chance"
          role="tabpanel"
          aria-labelledby="game-tab-chance"
          hidden={activeGame !== 'chance'}
        >
          <div className="game-module-heading">
            <span className="game-module-icon"><Dices aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">{t('games.chance.eyebrow')}</span>
              <h2>{t('games.chance.title')}</h2>
            </div>
          </div>
          <ChanceStage
            rolling={fx.playing === 'dice'}
            roll={fx.diceRoll}
            chosen={fx.diceChosen === true}
            won={fx.diceWon === true}
            spinningSlots={fx.playing === 'slots'}
            slotsWon={fx.slotsWon === true}
            reels={fx.slotsReels}
            symbols={minigames.data?.slots.symbols}
            diceLabel={t('games.chance.diceBoard')}
            slotsLabel={t('games.chance.slotsBoard')}
            symbolLabel={(symbol) => t(`games.chance.symbols.${symbol}`, { defaultValue: symbol })}
          />
          <div className="chance-controls">
            <form className="chance-dice-form" onSubmit={playDice}>
              <div className="chance-guide is-pairs">
                <span className="panel-eyebrow">{t('games.chance.diceGuideEyebrow')}</span>
                <h3>{t('games.chance.diceGuideTitle')}</h3>
                <p>{t('games.chance.diceGuideLead')}</p>
                <dl>
                  <div>
                    <dt>{t('games.chance.even')}</dt>
                    <dd>{t('games.chance.diceEvenPay')}</dd>
                  </div>
                  <div>
                    <dt>{t('games.chance.odd')}</dt>
                    <dd>{t('games.chance.diceOddPay')}</dd>
                  </div>
                  <div>
                    <dt>{t('games.chance.high')}</dt>
                    <dd>{t('games.chance.diceHighPay')}</dd>
                  </div>
                  <div>
                    <dt>{t('games.chance.low')}</dt>
                    <dd>{t('games.chance.diceLowPay')}</dd>
                  </div>
                </dl>
              </div>
              <div className="chance-play-foot">
                <Field>
                  {t('games.chance.betType')}
                  <select value={diceType} onChange={(event) => setDiceType(event.target.value)}>
                    <option value="even">{t('games.chance.even')}</option>
                    <option value="odd">{t('games.chance.odd')}</option>
                    <option value="high">{t('games.chance.high')}</option>
                    <option value="low">{t('games.chance.low')}</option>
                  </select>
                </Field>
                <Field>
                  {t('games.chance.tokens')}
                  <input value={diceAmount} onChange={(event) => setDiceAmount(event.target.value)} inputMode="numeric" />
                </Field>
                <Button type="submit"><Dices aria-hidden="true" /> {t('games.chance.playDice')}</Button>
              </div>
            </form>
            <div className="chance-slots-play">
              <div className="chance-guide">
                <span className="panel-eyebrow">{t('games.chance.slotsGuideEyebrow')}</span>
                <h3>{t('games.chance.slotsGuideTitle')}</h3>
                <p>{t('games.chance.slotsGuideLead', { count: minigames.data?.slots.cost ?? 1 })}</p>
                <dl>
                  <div>
                    <dt>{t('games.chance.slotsTriple')}</dt>
                    <dd>{t('games.chance.slotsTriplePay')}</dd>
                  </div>
                  <div>
                    <dt>{t('games.chance.slotsPair')}</dt>
                    <dd>{t('games.chance.slotsPairPay')}</dd>
                  </div>
                  <div>
                    <dt>{t('games.chance.slotsMiss')}</dt>
                    <dd>{t('games.chance.slotsMissPay')}</dd>
                  </div>
                </dl>
              </div>
              <div className="chance-play-foot">
                <Button className="ghost" type="button" onClick={() => void playSlots()}>
                  {t('games.chance.playSlots', { count: minigames.data?.slots.cost ?? 1 })}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div
          id="game-panel-fishing"
          role="tabpanel"
          aria-labelledby="game-tab-fishing"
          hidden={activeGame !== 'fishing'}
        >
          {activeGame === 'fishing' && (
            <ResourceGate code="fishing">
              <FishingGame />
            </ResourceGate>
          )}
        </div>

        <Card
          className="game-module game-economy"
          id="game-panel-economy"
          role="tabpanel"
          aria-labelledby="game-tab-economy"
          hidden={activeGame !== 'economy'}
        >
          <div className="game-module-heading">
            <span className="game-module-icon"><Sword aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">{t('games.economy.eyebrow')}</span>
              <h2>{t('games.economy.title')}</h2>
            </div>
            <div className="weapon-level">{t('games.economy.weapon')} <strong>+{economy.data?.weapon.level ?? 0}</strong></div>
          </div>
          <div className="fragment-progress">
            <span><b>{economy.data?.weapon.fragments ?? 0}</b> {t('games.economy.fragments', { max: 10 })}</span>
            <i style={{ width: `${Math.min(100, ((economy.data?.weapon.fragments ?? 0) / 10) * 100)}%` }} />
          </div>
          <div className="monster-list">
            {(economy.data?.monsters ?? []).map((monster) => (
              <article className={`monster-item${fx.playing === 'fight' && fx.targetId === monster.id ? ' is-fighting' : ''}${monster.alive ? '' : ' is-down'}`} key={monster.id}>
                <MonsterPortrait
                  id={monster.id}
                  down={!monster.alive}
                  fighting={fx.playing === 'fight' && fx.targetId === monster.id}
                />
                <span><strong>{monster.name}</strong><small>{t('games.economy.requiredWeapon', { level: monster.required_weapon_level })}</small></span>
                {monster.alive ? (
                  <Button className="ghost" type="button" onClick={() => void fight(monster.id)}>{t('games.economy.fight', { count: 1 })}</Button>
                ) : (
                  <span className="respawn">{t('games.economy.respawn', { seconds: monster.respawn_in })}</span>
                )}
              </article>
            ))}
          </div>
          <Button type="button" onClick={() => void enchant()}>
            <Sparkles aria-hidden="true" /> {t('games.economy.enchant', { count: 10 })}
          </Button>
        </Card>

      </fieldset>
    </div>
  )
}
