import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { useFeedbackAction } from '../hooks/useFeedbackAction'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Coins,
  Dices,
  Fish,
  Gift,
  PackageOpen,
  RotateCw,
  Sparkles,
  Sword,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { gamesApi } from '../services/api'
import { ItemIcon } from '../components/ItemIcon'
import { FishingGame } from '../components/games/FishingGame'
import { ResourceGate } from '../components/programs/ResourceGate'

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

  async function spin() {
    await action.run(async () => {
      const result = await gamesApi.spin()
      if (result.failed) toast.error(t('games.toast.noPrize'))
      else toast.success(t('games.toast.prizeWon', { prize: result.prize?.name }))
      await refresh()
    }, t('games.toast.spinError'))
  }

  async function buy(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await gamesApi.buyTokens(Number(amount))
      toast.success(t('games.toast.tokensCredited'))
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

  async function buyBox(id: string) {
    await action.run(async () => {
      await gamesApi.buyBox(id)
      toast.success(t('games.toast.boxBought'))
      await refresh()
    }, t('games.toast.buyBoxError'))
  }

  async function openBox(id: string) {
    await action.run(async () => {
      const result = await gamesApi.openBox(id)
      toast.success(t('games.toast.boxOpened', { name: result.item.name, enchant: result.item.enchant }))
      await refresh()
    }, t('games.toast.openBoxError'))
  }

  async function playDice(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      const result = await gamesApi.dice({ bet_type: diceType, amount: Number(diceAmount) })
      const outcome = result.won ? t('games.toast.diceWin', { payout: result.payout }) : t('games.toast.diceLoss')
      toast[result.won ? 'success' : 'error'](t('games.toast.diceResult', { roll: result.roll, outcome }))
      await refresh()
    }, t('games.toast.diceError'))
  }

  async function playSlots() {
    await action.run(async () => {
      const result = await gamesApi.slots()
      const outcome = result.won ? t('games.toast.slotsWin', { payout: result.payout }) : t('games.toast.slotsLoss')
      toast[result.won ? 'success' : 'error'](t('games.toast.slotsResult', { reels: result.reels.join(' | '), outcome }))
      await refresh()
    }, t('games.toast.slotsError'))
  }

  async function fight(monsterId: string) {
    await action.run(async () => {
      const result = await gamesApi.fight(monsterId)
      toast[result.won ? 'success' : 'error'](
        result.won ? t('games.toast.fightWin', { fragments: result.fragments_earned }) : t('games.toast.fightLoss'),
      )
      await refresh()
    }, t('games.toast.fightError'))
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

  const tokens = roulette.data?.fichas ?? minigames.data?.fichas ?? 0

  return (
    <div className="games-page">
      <div className="program-actions"><Link className="btn ghost" to="/panel/rewards">{t('games.rewardsLink')}</Link></div>
      <Card as="header" className="games-hero">
        <div className="games-hero-copy">
          <span className="panel-eyebrow">{t('games.eyebrow')}</span>
          <h1>{t('games.title')}</h1>
          <p className="muted">{t('games.description')}</p>
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
              <div className="roulette-orbit" aria-hidden="true">
                <Trophy />
                <span>{tokens}</span>
              </div>
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
                    <div className="prize-item" key={prize.id}>
                      <ItemIcon itemId={prize.item_id} name={prize.name} size={28} />
                      <span><strong>{prize.name}</strong><small>{prize.rarity}</small></span>
                      <b>{prize.weight}</b>
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
              <h2>{t('games.boxes.title')}</h2>
            </div>
          </div>
          <div className="game-item-list">
            {(boxes.data?.types ?? []).map((row) => (
              <article className="game-list-item" key={row.id}>
                <PackageOpen aria-hidden="true" />
                <span><strong>{row.name}</strong><small>{t('games.boxes.boosters', { count: row.boosters_amount })}</small></span>
                <b>R$ {row.price}</b>
                <Button className="ghost" type="button" onClick={() => void buyBox(row.id)}>{t('games.boxes.buy')}</Button>
              </article>
            ))}
            {(boxes.data?.boxes ?? []).map((row) => (
              <article className="game-list-item" key={row.id}>
                <Box aria-hidden="true" />
                <span><strong>{row.type_name}</strong><small>{t('games.boxes.remaining', { remaining: row.remaining, total: row.total })}</small></span>
                <Button type="button" onClick={() => void openBox(row.id)}>{t('games.boxes.open', { count: 1 })}</Button>
              </article>
            ))}
            {!boxes.data?.types.length && !boxes.data?.boxes.length ? (
              <div className="game-empty"><Box aria-hidden="true" /> {t('games.boxes.empty')}</div>
            ) : null}
          </div>
        </Card>

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
          <form className="game-form-grid" onSubmit={playDice}>
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
            <div className="game-actions">
              <Button type="submit"><Dices aria-hidden="true" /> {t('games.chance.playDice')}</Button>
              <Button className="ghost" type="button" onClick={() => void playSlots()}>
                {t('games.chance.playSlots', { count: minigames.data?.slots.cost ?? 1 })}
              </Button>
            </div>
          </form>
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
              <article className="monster-item" key={monster.id}>
                <Sword aria-hidden="true" />
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
