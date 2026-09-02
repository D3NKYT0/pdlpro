import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { gamesApi, isApiError } from '../services/api'
import { ItemIcon } from '../components/ItemIcon'
import { FishingGame } from '../components/games/FishingGame'
import { ResourceGate } from '../components/programs/ResourceGate'

type GameTab = 'roulette' | 'boxes' | 'chance' | 'fishing' | 'economy'

const gameTabs: Array<{ id: GameTab; label: string; icon: LucideIcon }> = [
  { id: 'roulette', label: 'Roleta', icon: RotateCw },
  { id: 'boxes', label: 'Caixas', icon: Box },
  { id: 'chance', label: 'Dados e slots', icon: Dices },
  { id: 'fishing', label: 'Pesca', icon: Fish },
  { id: 'economy', label: 'Economia', icon: Sword },
]

export function GamesPage() {
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
    try {
      const result = await gamesApi.spin()
      if (result.failed) toast.error('Sem prêmio desta vez')
      else toast.success(`Você ganhou ${result.prize?.name}`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no giro')
    }
  }

  async function buy(event: FormEvent) {
    event.preventDefault()
    try {
      await gamesApi.buyTokens(Number(amount))
      toast.success('Fichas creditadas')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível comprar fichas')
    }
  }

  async function claim() {
    try {
      const result = await gamesApi.claimDailyBonus()
      toast.success(`Bônus de R$ ${result.amount} creditado`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível resgatar')
    }
  }

  async function buyBox(id: string) {
    try {
      await gamesApi.buyBox(id)
      toast.success('Caixa comprada')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha na compra')
    }
  }

  async function openBox(id: string) {
    try {
      const result = await gamesApi.openBox(id)
      toast.success(`${result.item.name} (+${result.item.enchant})`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao abrir')
    }
  }

  async function playDice(event: FormEvent) {
    event.preventDefault()
    try {
      const result = await gamesApi.dice({ bet_type: diceType, amount: Number(diceAmount) })
      toast[result.won ? 'success' : 'error'](`Dado ${result.roll} · ${result.won ? `+${result.payout}` : 'perdeu'}`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha nos dados')
    }
  }

  async function playSlots() {
    try {
      const result = await gamesApi.slots()
      toast[result.won ? 'success' : 'error'](`${result.reels.join(' | ')} · ${result.won ? `+${result.payout}` : 'nada'}`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha nos slots')
    }
  }

  async function fight(monsterId: string) {
    try {
      const result = await gamesApi.fight(monsterId)
      toast[result.won ? 'success' : 'error'](
        result.won ? `Vitória · +${result.fragments_earned} fragmentos` : 'Derrota',
      )
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no combate')
    }
  }

  async function enchant() {
    try {
      const result = await gamesApi.enchant()
      toast[result.success ? 'success' : 'error'](
        result.success ? `Arma +${result.weapon.level}` : 'O encantamento falhou',
      )
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no encante')
    }
  }

  const tokens = roulette.data?.fichas ?? minigames.data?.fichas ?? 0

  return (
    <div className="games-page">
      <div className="program-actions"><Link className="btn ghost" to="/painel/recompensas">Missões, bônus diário e rankings ↗</Link></div>
      <header className="card games-hero">
        <div className="games-hero-copy">
          <span className="panel-eyebrow">Central de jogos</span>
          <h1>Jogos e recompensas</h1>
          <p className="muted">Use suas fichas, conquiste prêmios e fortaleça seu personagem.</p>
        </div>
        <div className="token-balance">
          <Coins aria-hidden="true" />
          <span>Saldo disponível</span>
          <strong>{tokens} fichas</strong>
        </div>
      </header>

      <div className="game-tabs" role="tablist" aria-label="Escolha um jogo">
        {gameTabs.map((tab) => {
          const Icon = tab.icon
          const active = activeGame === tab.id
          return (
            <button
              className={active ? 'active' : undefined}
              id={`game-tab-${tab.id}`}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`game-panel-${tab.id}`}
              onClick={() => setActiveGame(tab.id)}
            >
              <Icon aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="game-tab-panels">
        <div
          className="game-tab-layout roulette-tab"
          id="game-panel-roulette"
          role="tabpanel"
          aria-labelledby="game-tab-roulette"
          hidden={activeGame !== 'roulette'}
        >
          <section className="card game-module game-roulette">
          <div className="game-module-heading">
            <span className="game-module-icon"><RotateCw aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">Tente a sorte</span>
              <h2>Roleta</h2>
            </div>
            <span className="game-cost">{roulette.data?.cost ?? 1} ficha por giro</span>
          </div>

          <div className="roulette-content">
            <div className="roulette-action">
              <div className="roulette-orbit" aria-hidden="true">
                <Trophy />
                <span>{tokens}</span>
              </div>
              <p className="muted">Chance de não receber prêmio: {roulette.data?.fail_chance ?? 20}%</p>
              <button className="btn" type="button" onClick={() => void spin()}>
                <Sparkles aria-hidden="true" /> Girar agora
              </button>
            </div>

            <div className="roulette-side">
              <form className="game-inline-form" onSubmit={buy}>
                <label className="field">
                  Comprar fichas <span>1 ficha = R$ 1</span>
                  <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" />
                </label>
                <button className="btn ghost" type="submit">
                  <Coins aria-hidden="true" /> Comprar
                </button>
              </form>

              <div className="game-subsection">
                <h3>Prêmios disponíveis</h3>
                <div className="prize-list">
                  {(roulette.data?.prizes ?? []).map((prize) => (
                    <div className="prize-item" key={prize.id}>
                      <ItemIcon itemId={prize.item_id} name={prize.name} size={28} />
                      <span><strong>{prize.name}</strong><small>{prize.rarity}</small></span>
                      <b>{prize.weight}</b>
                    </div>
                  ))}
                  {!roulette.data?.prizes.length ? <p className="game-empty">Nenhum prêmio configurado.</p> : null}
                </div>
              </div>
            </div>
          </div>
          </section>

          <section className="card game-module game-daily">
          <div className="game-module-heading">
            <span className="game-module-icon"><Gift aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">Recompensa diária</span>
              <h2>Bônus diário</h2>
            </div>
          </div>
          <div className="daily-value">
            <span>Valor de hoje</span>
            <strong>R$ {bonus.data?.amount ?? '10.00'}</strong>
          </div>
          {bonus.data?.claimed ? (
            <div className="game-state is-complete"><Sparkles aria-hidden="true" /> Bônus já resgatado hoje</div>
          ) : (
            <button className="btn" type="button" onClick={() => void claim()}>
              <Gift aria-hidden="true" /> Resgatar bônus
            </button>
          )}
          </section>
        </div>

        <section
          className="card game-module game-boxes"
          id="game-panel-boxes"
          role="tabpanel"
          aria-labelledby="game-tab-boxes"
          hidden={activeGame !== 'boxes'}
        >
          <div className="game-module-heading">
            <span className="game-module-icon"><Box aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">Itens surpresa</span>
              <h2>Caixas</h2>
            </div>
          </div>
          <div className="game-item-list">
            {(boxes.data?.types ?? []).map((row) => (
              <article className="game-list-item" key={row.id}>
                <PackageOpen aria-hidden="true" />
                <span><strong>{row.name}</strong><small>{row.boosters_amount} boosters</small></span>
                <b>R$ {row.price}</b>
                <button className="btn ghost" type="button" onClick={() => void buyBox(row.id)}>Comprar</button>
              </article>
            ))}
            {(boxes.data?.boxes ?? []).map((row) => (
              <article className="game-list-item" key={row.id}>
                <Box aria-hidden="true" />
                <span><strong>{row.type_name}</strong><small>{row.remaining} de {row.total} restantes</small></span>
                <button className="btn" type="button" onClick={() => void openBox(row.id)}>Abrir · 1 ficha</button>
              </article>
            ))}
            {!boxes.data?.types.length && !boxes.data?.boxes.length ? (
              <div className="game-empty"><Box aria-hidden="true" /> Nenhuma caixa disponível no momento.</div>
            ) : null}
          </div>
        </section>

        <section
          className="card game-module game-chance"
          id="game-panel-chance"
          role="tabpanel"
          aria-labelledby="game-tab-chance"
          hidden={activeGame !== 'chance'}
        >
          <div className="game-module-heading">
            <span className="game-module-icon"><Dices aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">Minigames</span>
              <h2>Dados e slots</h2>
            </div>
          </div>
          <form className="game-form-grid" onSubmit={playDice}>
            <label className="field">
              Tipo de aposta
              <select value={diceType} onChange={(event) => setDiceType(event.target.value)}>
                <option value="even">Par</option>
                <option value="odd">Ímpar</option>
                <option value="high">Alto (4-6)</option>
                <option value="low">Baixo (1-3)</option>
              </select>
            </label>
            <label className="field">
              Fichas
              <input value={diceAmount} onChange={(event) => setDiceAmount(event.target.value)} inputMode="numeric" />
            </label>
            <div className="game-actions">
              <button className="btn" type="submit"><Dices aria-hidden="true" /> Jogar dado</button>
              <button className="btn ghost" type="button" onClick={() => void playSlots()}>
                Girar slots · {minigames.data?.slots.cost ?? 1} ficha
              </button>
            </div>
          </form>
        </section>

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

        <section
          className="card game-module game-economy"
          id="game-panel-economy"
          role="tabpanel"
          aria-labelledby="game-tab-economy"
          hidden={activeGame !== 'economy'}
        >
          <div className="game-module-heading">
            <span className="game-module-icon"><Sword aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">Arena de combate</span>
              <h2>Economia</h2>
            </div>
            <div className="weapon-level">Arma <strong>+{economy.data?.weapon.level ?? 0}</strong></div>
          </div>
          <div className="fragment-progress">
            <span><b>{economy.data?.weapon.fragments ?? 0}</b> / 10 fragmentos</span>
            <i style={{ width: `${Math.min(100, ((economy.data?.weapon.fragments ?? 0) / 10) * 100)}%` }} />
          </div>
          <div className="monster-list">
            {(economy.data?.monsters ?? []).map((monster) => (
              <article className="monster-item" key={monster.id}>
                <Sword aria-hidden="true" />
                <span><strong>{monster.name}</strong><small>Requer arma +{monster.required_weapon_level}</small></span>
                {monster.alive ? (
                  <button className="btn ghost" type="button" onClick={() => void fight(monster.id)}>Lutar · 1 ficha</button>
                ) : (
                  <span className="respawn">Retorna em {monster.respawn_in}s</span>
                )}
              </article>
            ))}
          </div>
          <button className="btn" type="button" onClick={() => void enchant()}>
            <Sparkles aria-hidden="true" /> Encantar · 10 fragmentos
          </button>
        </section>

      </div>
    </div>
  )
}
