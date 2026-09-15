import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Check,
  Crown,
  Flag,
  Gift,
  History,
  LockKeyhole,
  Repeat2,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Tabs } from '../ui/Tabs'
import { Toggle } from '../ui/Toggle'
import { gamesApi } from '../../services/api'
import { formatDateTime } from '../../lib/formatters'
import {
  Empty,
  ErrorNotice,
  Loading,
  RewardHistoryList,
  RewardList,
} from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'
import { ItemIcon } from '../ItemIcon'

const BATTLE_PASS_KEYS = [['battle-pass'], ['battle-details']] as const

type PassTab = 'quests' | 'levels' | 'exchanges' | 'milestones' | 'history'

const PASS_TABS: Array<{ id: PassTab; icon: LucideIcon }> = [
  { id: 'quests', icon: Target },
  { id: 'levels', icon: Gift },
  { id: 'exchanges', icon: Repeat2 },
  { id: 'milestones', icon: Flag },
  { id: 'history', icon: History },
]

function percentOf(value: number, total: number) {
  return Math.min(100, Math.max(0, (value / Math.max(1, total)) * 100))
}

export function BattlePassSection() {
  const { t } = useTranslation('panel')
  const pass = useQuery({
    queryKey: ['battle-pass'],
    queryFn: gamesApi.battlePass,
  })
  const details = useQuery({
    queryKey: ['battle-details'],
    queryFn: gamesApi.battleDetails,
  })
  const action = useProgramAction()
  const [tab, setTab] = useState<PassTab>('quests')
  const data = details.data
  const season = pass.data?.season
  const levels = pass.data?.levels ?? []
  const xp = pass.data?.xp ?? 0
  const seasonGoal = levels.length ? levels[levels.length - 1].required_xp : 0
  const nextLevel = levels.find((level) => level.required_xp > xp)
  const rewardsTotal = levels.reduce((total, level) => total + level.rewards.length, 0)
  const rewardsClaimed = levels.reduce(
    (total, level) => total + level.rewards.filter((reward) => reward.claimed).length,
    0,
  )
  return (
    <div className="pass-layout">
      <ErrorNotice error={pass.error || details.error || action.error} />
      {(pass.isPending || details.isPending) && <Loading />}
      {pass.data && !season ? (
        <Card className="battle-pass-card pass-season-empty">
          <Empty icon={<Crown aria-hidden="true" />}>{t('rewards.battlePass.emptySeason')}</Empty>
          <div className="pass-history">
            <div className="progress-module-heading">
              <span><History aria-hidden="true" /></span>
              <div>
                <span className="panel-eyebrow">{t('rewards.battlePass.historyEyebrow')}</span>
                <h2>{t('rewards.battlePass.historyTitle')}</h2>
              </div>
            </div>
            <RewardHistoryList history={data?.history || []} />
          </div>
        </Card>
      ) : (
        season && (
          <>
            <Card className="battle-pass-card pass-season">
              <header className="pass-season-banner">
                <div className="pass-season-copy">
                  <span className="panel-eyebrow">{t('rewards.battlePass.seasonEyebrow')}</span>
                  <h2>{season.name}</h2>
                  <p>{t('rewards.battlePass.endsAt', { date: formatDateTime(season.ends_at, 'short') })}</p>
                  {pass.data?.has_premium ? (
                    <span className="premium-active">
                      <Sparkles aria-hidden="true" />
                      {t('rewards.battlePass.premiumActive')}
                    </span>
                  ) : (
                    <Button
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          gamesApi.buyBattlePassPremium,
                          t('rewards.battlePass.premiumToast'),
                          BATTLE_PASS_KEYS,
                        )
                      }
                    >
                      <Crown aria-hidden="true" />
                      {t('rewards.battlePass.premiumBuy', { price: season.premium_price })}
                    </Button>
                  )}
                </div>
                <div className="pass-level-seal">
                  <span>{t('rewards.battlePass.level')}</span>
                  <strong>{pass.data?.current_level}</strong>
                </div>
              </header>

              <div className="battle-pass-overview">
                <div>
                  <Zap aria-hidden="true" />
                  <span>{t('rewards.battlePass.xp')}</span>
                  <strong>{t('rewards.battlePass.xpValue', { xp })}</strong>
                </div>
                <div>
                  <Target aria-hidden="true" />
                  <span>{t('rewards.battlePass.questsDone')}</span>
                  <strong>{data?.statistics.quests || 0}</strong>
                </div>
                <div>
                  <Gift aria-hidden="true" />
                  <span>{t('rewards.battlePass.rewardsClaimed')}</span>
                  <strong>{rewardsClaimed}/{rewardsTotal}</strong>
                </div>
              </div>

              <div className="battle-pass-progress">
                <div className="progress-labels">
                  <span>
                    <Zap aria-hidden="true" />
                    {t('rewards.battlePass.seasonProgress')}
                  </span>
                  <span>
                    {nextLevel
                      ? t('rewards.battlePass.nextLevel', { level: nextLevel.level })
                      : t('rewards.battlePass.maxLevel')}
                  </span>
                </div>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-label={t('rewards.battlePass.seasonProgress')}
                  aria-valuenow={xp}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(seasonGoal, xp)}
                >
                  <i style={{ width: `${percentOf(xp, seasonGoal)}%` }} />
                </div>
              </div>

              <Toggle
                className="pass-auto-claim"
                label={t('rewards.battlePass.autoClaim')}
                checked={data?.auto_claim || false}
                disabled={action.busy}
                onChange={(event) =>
                  void action.run(
                    () => gamesApi.battleAction('auto-claim', undefined, event.target.checked),
                    t('rewards.battlePass.autoClaimToast'),
                    BATTLE_PASS_KEYS,
                  )
                }
              />
            </Card>

            <Tabs
              id="pass"
              label={t('rewards.battlePass.tabsLabel')}
              className="game-tabs pass-tabs"
              value={tab}
              onChange={setTab}
              items={PASS_TABS.map(({ id, icon: Icon }) => ({
                id,
                label: t(`rewards.battlePass.tabs.${id}`),
                icon: <Icon aria-hidden="true" />,
              }))}
            />

            <div
              className="pass-tab-content"
              id={`pass-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`pass-tab-${tab}`}
            >
              {tab === 'quests' &&
                (data?.quests.length ? (
                  <div className="pass-quest-grid">
                    {data.quests.map((quest) => {
                      const current = Math.min(quest.current, quest.target)
                      const complete = quest.current >= quest.target
                      return (
                        <Card
                          as="article"
                          className={`pass-quest ${quest.claimed ? 'is-claimed' : complete ? 'is-complete' : ''}`}
                          key={quest.id}
                        >
                          <div className="pass-quest-head">
                            <span className="pass-quest-icon"><Target aria-hidden="true" /></span>
                            <div>
                              <span className="panel-eyebrow">
                                {t(`rewards.battlePass.period.${quest.period}`, {
                                  defaultValue: quest.period,
                                })}
                              </span>
                              <h3>{quest.name}</h3>
                            </div>
                            <span className="pass-chip">
                              <Zap aria-hidden="true" />
                              {t('rewards.battlePass.questXp', { xp: quest.xp })}
                            </span>
                          </div>
                          <p className="muted">{quest.description}</p>
                          <div className="pass-quest-progress">
                            <div className="progress-labels">
                              <span>{t('rewards.battlePass.questCount', { current, target: quest.target })}</span>
                              <span>{Math.round(percentOf(current, quest.target))}%</span>
                            </div>
                            <div
                              className="progress-bar"
                              role="progressbar"
                              aria-label={quest.name}
                              aria-valuenow={current}
                              aria-valuemin={0}
                              aria-valuemax={quest.target}
                            >
                              <i style={{ width: `${percentOf(current, quest.target)}%` }} />
                            </div>
                          </div>
                          {quest.claimed ? (
                            <b className="pass-done">
                              <Check aria-hidden="true" />
                              {t('rewards.battlePass.questClaimed')}
                            </b>
                          ) : (
                            <Button
                              size="sm"
                              disabled={action.busy || !complete}
                              onClick={() =>
                                void action.run(
                                  () => gamesApi.battleAction('quest', quest.id),
                                  t('rewards.battlePass.questToast'),
                                  BATTLE_PASS_KEYS,
                                )
                              }
                            >
                              {t('rewards.battlePass.questClaim')}
                            </Button>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="rewards-empty-card">
                    <Empty icon={<Target aria-hidden="true" />}>{t('rewards.battlePass.questsEmpty')}</Empty>
                  </Card>
                ))}

              {tab === 'levels' &&
                (levels.length ? (
                  <Card className="battle-pass-card pass-track-card">
                    <div className="pass-track-legend">
                      <span>{t('rewards.battlePass.levelLegend')}</span>
                      <span>
                        <Gift aria-hidden="true" />
                        {t('rewards.battlePass.freeTrack')}
                      </span>
                      <span>
                        <Crown aria-hidden="true" />
                        {t('rewards.battlePass.premiumTrack')}
                      </span>
                    </div>
                    <div className="pass-reward-track">
                      {levels.map((level) => {
                        const lanes = [
                          {
                            key: 'free' as const,
                            className: 'free-lane',
                            rewards: level.rewards.filter((reward) => !reward.is_premium),
                            empty: t('rewards.battlePass.noFreeReward'),
                          },
                          {
                            key: 'premium' as const,
                            className: 'premium-lane',
                            rewards: level.rewards.filter((reward) => reward.is_premium),
                            empty: t('rewards.battlePass.noPremiumReward'),
                          },
                        ]
                        return (
                          <article
                            className={`pass-tier ${level.unlocked ? 'unlocked' : 'locked'}${level.level === pass.data?.current_level ? ' is-current' : ''}`}
                            key={level.level}
                          >
                            <div className="pass-tier-level">
                              <span>
                                {level.unlocked ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
                              </span>
                              <strong>{t('rewards.battlePass.levelTitle', { level: level.level })}</strong>
                              <small>{t('rewards.battlePass.levelRequirement', { xp: level.required_xp })}</small>
                            </div>
                            {lanes.map((lane) => (
                              <div className={`pass-tier-lane ${lane.className}`} key={lane.key}>
                                {lane.rewards.map((reward) => {
                                  const locked = !level.unlocked || reward.locked_premium
                                  return (
                                    <div
                                      className={`pass-reward ${reward.claimed ? 'claimed' : locked ? 'locked' : 'available'}`}
                                      key={reward.id}
                                    >
                                      <ItemIcon itemId={reward.item_id} name={reward.item_name} size={24} />
                                      <span>
                                        <strong>
                                          {t('progress.rewardQuantity', {
                                            name: reward.item_name,
                                            quantity: reward.quantity,
                                          })}
                                        </strong>
                                        <small>{reward.description}</small>
                                      </span>
                                      {reward.claimed ? (
                                        <b>
                                          <Check aria-hidden="true" />
                                          {t('rewards.battlePass.rewardClaimed')}
                                        </b>
                                      ) : locked ? (
                                        <b>
                                          <LockKeyhole aria-hidden="true" />
                                          {reward.locked_premium
                                            ? t('rewards.battlePass.requiresPremium')
                                            : t('rewards.battlePass.levelLocked')}
                                        </b>
                                      ) : (
                                        <Button
                                          size="sm"
                                          disabled={action.busy}
                                          onClick={() =>
                                            void action.run(
                                              () => gamesApi.claimBattlePass(reward.id),
                                              t('rewards.battlePass.rewardToast'),
                                              BATTLE_PASS_KEYS,
                                            )
                                          }
                                        >
                                          {t('rewards.battlePass.claim')}
                                        </Button>
                                      )}
                                    </div>
                                  )
                                })}
                                {lane.rewards.length ? null : (
                                  <span className="no-pass-reward">{lane.empty}</span>
                                )}
                              </div>
                            ))}
                          </article>
                        )
                      })}
                    </div>
                  </Card>
                ) : (
                  <Card className="rewards-empty-card">
                    <Empty icon={<Gift aria-hidden="true" />}>{t('rewards.battlePass.levelsEmpty')}</Empty>
                  </Card>
                ))}

              {tab === 'exchanges' &&
                (data?.exchanges.length ? (
                  <div className="pass-quest-grid">
                    {data.exchanges.map((exchange) => {
                      const missing = exchange.owned < exchange.required_quantity
                      const soldOut = !!exchange.limit && exchange.used >= exchange.limit
                      return (
                        <Card as="article" className="pass-quest pass-exchange" key={exchange.id}>
                          <div className="pass-quest-head">
                            <span className="pass-quest-icon"><Repeat2 aria-hidden="true" /></span>
                            <div>
                              <span className="panel-eyebrow">
                                {t('rewards.battlePass.exchangeLimit', {
                                  used: exchange.used,
                                  limit: exchange.limit || t('rewards.battlePass.exchangeUnlimited'),
                                })}
                              </span>
                              <h3>{exchange.name}</h3>
                            </div>
                          </div>
                          <div className="pass-exchange-flow">
                            <div className="pass-exchange-side">
                              <span className="panel-eyebrow">{t('rewards.battlePass.exchangeGive')}</span>
                              <div className="pass-exchange-cost">
                                <ItemIcon itemId={exchange.required_item_id} size={28} />
                                <span>
                                  <strong>
                                    {t('progress.rewardQuantity', {
                                      name: `#${exchange.required_item_id}`,
                                      quantity: exchange.required_quantity,
                                    })}
                                  </strong>
                                  <small className={missing ? 'pass-missing' : undefined}>
                                    {t('rewards.battlePass.exchangeStock', {
                                      owned: exchange.owned,
                                      required: exchange.required_quantity,
                                    })}
                                  </small>
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="pass-exchange-arrow" aria-hidden="true" />
                            <div className="pass-exchange-side">
                              <span className="panel-eyebrow">{t('rewards.battlePass.exchangeGet')}</span>
                              <RewardList rewards={exchange.rewards} />
                            </div>
                          </div>
                          <small className="muted">
                            {t('rewards.battlePass.exchangeDescription', {
                              quantity: exchange.required_quantity,
                              itemId: exchange.required_item_id,
                              enchant: exchange.required_enchant,
                            })}
                          </small>
                          <Button
                            size="sm"
                            disabled={action.busy || missing || soldOut}
                            onClick={() =>
                              void action.run(
                                () => gamesApi.battleAction('exchange', exchange.id),
                                t('rewards.battlePass.exchangeToast'),
                                BATTLE_PASS_KEYS,
                              )
                            }
                          >
                            {t('rewards.battlePass.exchangeAction')}
                          </Button>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="rewards-empty-card">
                    <Empty icon={<Repeat2 aria-hidden="true" />}>{t('rewards.battlePass.exchangesEmpty')}</Empty>
                  </Card>
                ))}

              {tab === 'milestones' &&
                (data?.milestones.length ? (
                  <div className="pass-quest-grid">
                    {data.milestones.map((milestone) => {
                      const reached = xp >= milestone.required_xp
                      return (
                        <Card
                          as="article"
                          className={`pass-quest ${milestone.claimed ? 'is-claimed' : reached ? 'is-complete' : ''}`}
                          key={milestone.id}
                        >
                          <div className="pass-quest-head">
                            <span className="pass-quest-icon"><Flag aria-hidden="true" /></span>
                            <div>
                              <span className="panel-eyebrow">
                                {t('rewards.battlePass.milestoneGoal', { xp: milestone.required_xp })}
                              </span>
                              <h3>{milestone.name}</h3>
                            </div>
                          </div>
                          <div className="pass-quest-progress">
                            <div className="progress-labels">
                              <span>
                                {t('rewards.battlePass.milestoneProgress', {
                                  current: Math.min(xp, milestone.required_xp),
                                  target: milestone.required_xp,
                                })}
                              </span>
                              <span>{Math.round(percentOf(xp, milestone.required_xp))}%</span>
                            </div>
                            <div
                              className="progress-bar"
                              role="progressbar"
                              aria-label={milestone.name}
                              aria-valuenow={Math.min(xp, milestone.required_xp)}
                              aria-valuemin={0}
                              aria-valuemax={milestone.required_xp}
                            >
                              <i style={{ width: `${percentOf(xp, milestone.required_xp)}%` }} />
                            </div>
                          </div>
                          <RewardList rewards={milestone.rewards} />
                          {milestone.claimed ? (
                            <b className="pass-done">
                              <Check aria-hidden="true" />
                              {t('rewards.battlePass.milestoneClaimed')}
                            </b>
                          ) : (
                            <Button
                              size="sm"
                              disabled={action.busy || !reached}
                              onClick={() =>
                                void action.run(
                                  () => gamesApi.battleAction('milestone', milestone.id),
                                  t('rewards.battlePass.milestoneToast'),
                                  BATTLE_PASS_KEYS,
                                )
                              }
                            >
                              {t('rewards.battlePass.milestoneClaim')}
                            </Button>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="rewards-empty-card">
                    <Empty icon={<Flag aria-hidden="true" />}>{t('rewards.battlePass.milestonesEmpty')}</Empty>
                  </Card>
                ))}

              {tab === 'history' && (
                <Card className="battle-pass-card pass-history">
                  <div className="progress-module-heading">
                    <span><History aria-hidden="true" /></span>
                    <div>
                      <span className="panel-eyebrow">{t('rewards.battlePass.historyEyebrow')}</span>
                      <h2>{t('rewards.battlePass.historyTitle')}</h2>
                    </div>
                  </div>
                  <div className="battle-pass-overview">
                    <div>
                      <span>{t('rewards.battlePass.statsRewards')}</span>
                      <strong>{data?.statistics.rewards || 0}</strong>
                    </div>
                    <div>
                      <span>{t('rewards.battlePass.statsExchanges')}</span>
                      <strong>{data?.statistics.exchanges || 0}</strong>
                    </div>
                  </div>
                  <RewardHistoryList history={data?.history || []} />
                </Card>
              )}
            </div>
          </>
        )
      )}
    </div>
  )
}
