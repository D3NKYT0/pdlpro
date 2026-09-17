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
import { BattleStage, ChanceStage, MonsterPortrait, RouletteField, RouletteWheel } from '../components/games/GameVisuals'
import { RespawnTimer } from '../components/games/RespawnTimer'
import { waitForBoxReveal, waitForBoxShake } from '../components/games/boxReveal'
import { waitForDiceReveal, waitForDiceRest } from '../components/games/diceReveal'
import { waitForFightReveal } from '../components/games/fightReveal'
import {
  formatRespawnClock,
  remainingSeconds,
  rememberRespawnTotal,
  useRespawnNow,
} from '../components/games/respawnClock'
import { waitForSlotsReveal } from '../components/games/slotsReveal'
import { ROULETTE_SLOW_MS, waitForRouletteReveal } from '../components/games/rouletteReveal'
import { ResourceGate } from '../components/programs/ResourceGate'
import { BuyTokensModal } from '../components/games/BuyTokensModal'
import { BoxHelpModal } from '../components/games/BoxHelpModal'
import { ChanceRevealModal } from '../components/games/ChanceRevealModal'
import { EnchantRevealModal } from '../components/games/EnchantRevealModal'
import { latestGameTokens, writeCachedTokens } from '../components/games/gameTokens'
import { waitForEnchantReveal } from '../components/games/enchantReveal'

type PlayFx = {
  playing?: 'spin' | 'open' | 'dice' | 'slots' | 'fight' | 'enchant'
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
  fightName?: string
  fightWon?: boolean
  fightRounds?: number
  fightFragments?: number
  enchantOverlay?: boolean
  enchantSuccess?: boolean
  enchantFrom?: number
  enchantToward?: number
  enchantLevel?: number
}

type GameTab = 'roulette' | 'boxes' | 'chance' | 'fishing' | 'economy'

const FIGHT_COST = 1
const ENCHANT_COST = 10
const ENCHANT_GOAL = 10

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

  const knownTokens = latestGameTokens([
    { fichas: roulette.data?.fichas, updatedAt: roulette.dataUpdatedAt },
    { fichas: minigames.data?.fichas, updatedAt: minigames.dataUpdatedAt },
    { fichas: economy.data?.fichas, updatedAt: economy.dataUpdatedAt },
  ])
  const tokens = knownTokens ?? 0
  const quietTokens = { quiet: isInsufficientTokens }

  function applyTokens(fichas?: number) {
    if (fichas == null) return
    writeCachedTokens(queryClient, fichas)
  }

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
      applyTokens(result.fichas)
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
      const credited = await gamesApi.buyTokens(Number(amount))
      applyTokens(credited.fichas)
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
      applyTokens(result.fichas)
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
      applyTokens(result.fichas)
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
      applyTokens(result.fichas)
      setFx((current) => ({
        playing: 'slots',
        diceRoll: current.diceRoll,
        diceWon: current.diceWon,
        diceChosen: current.diceChosen,
        slotsReels: current.slotsReels,
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
    if (needTokens(FIGHT_COST)) return
    const monster = economy.data?.monsters.find((row) => row.id === monsterId)
    setFx({ playing: 'fight', targetId: monsterId, fightName: monster?.name })
    const outcome = await action.run(async () => {
      const startedAt = Date.now()
      const result = await gamesApi.fight(monsterId)
      applyTokens(result.fichas)
      await waitForFightReveal(startedAt)
      await refresh()
      return result
    }, t('games.toast.fightError'), quietTokens)
    if (outcome.ok) {
      setFx({
        targetId: monsterId,
        fightName: monster?.name,
        fightWon: outcome.value.won,
        fightRounds: outcome.value.rounds,
        fightFragments: outcome.value.fragments_earned,
      })
    } else {
      noteTokenFailure(outcome.error)
      setFx({})
    }
  }

  async function enchant() {
    const from = economy.data?.weapon.level ?? 0
    const toward = Math.min(ENCHANT_GOAL, from + 1)
    setFx({ playing: 'enchant', enchantFrom: from, enchantToward: toward })
    const outcome = await action.run(async () => {
      const startedAt = Date.now()
      const result = await gamesApi.enchant()
      await waitForEnchantReveal(startedAt)
      await refresh()
      return result
    }, t('games.toast.enchantError'))
    if (outcome.ok) {
      setFx({
        enchantOverlay: true,
        enchantSuccess: outcome.value.success,
        enchantFrom: from,
        enchantToward: toward,
        enchantLevel: outcome.value.weapon.level,
      })
      return
    }
    setFx({})
  }

  const waitingRespawn = (economy.data?.monsters ?? []).some((row) => !row.alive && row.respawn_in > 0)
  const now = useRespawnNow(activeGame === 'economy' && waitingRespawn)
  const respawnTotals = useRef<Record<string, number>>({})
  if (economy.data) {
    respawnTotals.current = rememberRespawnTotal(respawnTotals.current, economy.data.monsters)
  }

  useEffect(() => {
    if (fx.playing !== 'spin') return
    const timer = window.setTimeout(() => {
      setFx((current) => (current.playing === 'spin' ? { ...current, slowing: true } : current))
    }, ROULETTE_SLOW_MS)
    return () => window.clearTimeout(timer)
  }, [fx.playing])

  useEffect(() => {
    if (!economy.data || economy.isFetching) return
    const ready = economy.data.monsters.some((row) => {
      if (row.alive) return false
      return remainingSeconds(row.respawn_in, economy.dataUpdatedAt, now) <= 0
    })
    if (ready) void queryClient.invalidateQueries({ queryKey: ['economy'] })
  }, [economy.data, economy.dataUpdatedAt, economy.isFetching, now, queryClient])

  const fragments = economy.data?.weapon.fragments ?? 0
  const weaponLevel = economy.data?.weapon.level ?? 0
  const nextEnchant = Math.min(ENCHANT_GOAL, weaponLevel + 1)
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
        <EnchantRevealModal
          open={fx.playing === 'enchant' || fx.enchantOverlay === true}
          attempting={fx.playing === 'enchant'}
          success={fx.enchantSuccess === true}
          from={fx.enchantFrom ?? 0}
          toward={fx.enchantToward ?? 0}
          level={fx.enchantLevel ?? 0}
          onClose={() => setFx({})}
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
            <div className="weapon-now">
              <div className="weapon-level">
                <small>{t('games.economy.weapon')}</small>
                <strong>+{weaponLevel}</strong>
                <span>{t('games.economy.enchantGoal', { goal: ENCHANT_GOAL })}</span>
              </div>
              <div
                className="weapon-path"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={ENCHANT_GOAL}
                aria-valuenow={weaponLevel}
                aria-label={t('games.economy.enchantAria', { current: weaponLevel, goal: ENCHANT_GOAL })}
              >
                <ol className="weapon-path-steps">
                  {Array.from({ length: ENCHANT_GOAL }, (_, index) => {
                    const step = index + 1
                    const state = step <= weaponLevel ? 'is-done' : step === nextEnchant && weaponLevel < ENCHANT_GOAL ? 'is-next' : ''
                    return (
                      <li className={state} key={step}>
                        +{step}
                      </li>
                    )
                  })}
                </ol>
                <p className="weapon-path-next">
                  {weaponLevel >= ENCHANT_GOAL
                    ? t('games.economy.enchantPeak', { goal: ENCHANT_GOAL })
                    : t('games.economy.enchantNext', { level: nextEnchant, goal: ENCHANT_GOAL })}
                </p>
              </div>
            </div>
          </div>
          <div className="economy-content">
            <div className="economy-roster">
              <section className="weapon-forge">
                <div
                  className={`fragment-progress${fragments >= ENCHANT_COST ? ' is-ready' : ''}`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={ENCHANT_COST}
                  aria-valuenow={fragments}
                  aria-label={t('games.economy.fragmentsAria', { current: fragments, max: ENCHANT_COST })}
                >
                  <div className="fragment-progress-head">
                    <small>{t('games.economy.fragmentsLabel')}</small>
                    <strong>
                      <b>{fragments}</b>
                      <span>{t('games.economy.fragments', { max: ENCHANT_COST })}</span>
                    </strong>
                  </div>
                  <span className="fragment-progress-track" aria-hidden="true">
                    <i className="fragment-progress-fill" style={{ width: `${Math.min(100, (fragments / ENCHANT_COST) * 100)}%` }} />
                    <i className="fragment-progress-sheen" />
                    <span className="fragment-progress-pips">
                      {Array.from({ length: ENCHANT_COST }, (_, index) => (
                        <i key={index} className={index < fragments ? 'is-lit' : undefined} />
                      ))}
                    </span>
                  </span>
                </div>
                <Button
                  type="button"
                  variant={fragments >= ENCHANT_COST ? 'success' : undefined}
                  disabled={fragments < ENCHANT_COST}
                  onClick={() => void enchant()}
                >
                  <Sparkles aria-hidden="true" /> {t('games.economy.enchant', { count: ENCHANT_COST })}
                </Button>
              </section>
              <div className="monster-list">
                {(economy.data?.monsters ?? []).map((monster) => {
                  const wait = remainingSeconds(monster.respawn_in, economy.dataUpdatedAt, now)
                  const canFight = monster.alive && weaponLevel >= monster.required_weapon_level
                  const canAffordFight = knownTokens == null || knownTokens >= FIGHT_COST
                  return (
                    <article className={`monster-item${fx.playing === 'fight' && fx.targetId === monster.id ? ' is-fighting' : ''}${monster.alive ? '' : ' is-down'}`} key={monster.id}>
                      <MonsterPortrait
                        id={monster.id}
                        name={monster.name}
                        down={!monster.alive}
                        fighting={fx.playing === 'fight' && fx.targetId === monster.id}
                      />
                      <span><strong>{monster.name}</strong><small>{t('games.economy.requiredWeapon', { level: monster.required_weapon_level })}</small></span>
                      <div className="monster-actions">
                        {!monster.alive ? (
                          <RespawnTimer
                            remaining={wait}
                            total={respawnTotals.current[monster.id] ?? wait}
                            label={t('games.economy.respawnWait', { clock: formatRespawnClock(wait) })}
                          />
                        ) : null}
                        <Button
                          variant={canFight && !canAffordFight ? 'yellow' : 'ghost'}
                          type="button"
                          disabled={!canFight}
                          onClick={() => void fight(monster.id)}
                        >
                          {t('games.economy.fight', { count: FIGHT_COST })}
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
            <div className="economy-stage">
              <BattleStage
                phase={fx.playing === 'fight' ? 'clash' : fx.fightWon === true ? 'win' : fx.fightWon === false ? 'loss' : 'idle'}
                monsterId={fx.targetId}
                monsterName={fx.fightName}
                weaponLevel={weaponLevel}
                idleLabel={t('games.economy.idle')}
                clashLabel={t('games.economy.clashing')}
                playerLabel={t('games.economy.player')}
                versusLabel={t('games.economy.versus')}
                winLabel={t('games.economy.revealWin')}
                lossLabel={t('games.economy.revealLoss')}
                fragmentsLabel={t('games.economy.revealFragments', { fragments: fx.fightFragments ?? 0 })}
                roundsLabel={fx.fightRounds ? t('games.economy.rounds', { count: fx.fightRounds }) : undefined}
              />
            </div>
          </div>
        </Card>

      </fieldset>
    </div>
  )
}
