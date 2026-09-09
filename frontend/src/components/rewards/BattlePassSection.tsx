import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Crown } from 'lucide-react'
import { gamesApi } from '../../services/api'
import { formatDateTime } from '../../lib/formatters'
import {
  Empty,
  ErrorNotice,
  Loading,
  Meter,
  RewardHistoryList,
  RewardList,
} from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'

const BATTLE_PASS_KEYS = [['battle-pass'], ['battle-details']] as const

const PASS_TABS = ['quests', 'levels', 'exchanges', 'milestones', 'history'] as const

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
  const [tab, setTab] = useState<string>('quests')
  const data = details.data
  return (
    <>
      <ErrorNotice error={pass.error || details.error || action.error} />
      {(pass.isPending || details.isPending) && <Loading />}
      {pass.data && !pass.data.season ? (
        <Card className="program-section">
          <Empty>{t('rewards.battlePass.emptySeason')}</Empty>
          <h2>{t('rewards.battlePass.historyTitle')}</h2>
          <RewardHistoryList history={data?.history || []} />
        </Card>
      ) : (
        pass.data?.season && (
          <>
            <Card className="program-section">
              <div className="program-section-heading">
                <div>
                  <span className="panel-eyebrow">{t('rewards.battlePass.seasonEyebrow')}</span>
                  <h2>{pass.data.season.name}</h2>
                </div>
                <Crown color="var(--gold)" size={30} />
              </div>
              <div className="program-grid">
                <div className="program-stat">
                  <small>{t('rewards.battlePass.level')}</small>
                  <strong>{pass.data.current_level}</strong>
                </div>
                <div className="program-stat">
                  <small>{t('rewards.battlePass.xp')}</small>
                  <strong>{t('rewards.battlePass.xpValue', { xp: pass.data.xp })}</strong>
                </div>
                <div className="program-stat">
                  <small>{t('rewards.battlePass.questsDone')}</small>
                  <strong>{data?.statistics.quests || 0}</strong>
                </div>
              </div>
              <div className="program-section-heading">
                <small className="muted">
                  {t('rewards.battlePass.endsAt', { date: formatDateTime(pass.data.season.ends_at, 'short') })}
                </small>
                <div className="program-actions">
                  {pass.data.has_premium ? (
                    <span className="program-status status-approved">
                      {t('rewards.battlePass.premiumActive')}
                    </span>
                  ) : (
                    <Button
                      type="submit"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          gamesApi.buyBattlePassPremium,
                          t('rewards.battlePass.premiumToast'),
                          BATTLE_PASS_KEYS,
                        )
                      }
                    >
                      <Crown size={17} />
                      {t('rewards.battlePass.premiumBuy', { price: pass.data.season.premium_price })}
                    </Button>
                  )}
                </div>
              </div>
              <label className="program-check program-actions">
                <input
                  type="checkbox"
                  checked={data?.auto_claim || false}
                  disabled={action.busy}
                  onChange={(e) =>
                    void action.run(
                      () =>
                        gamesApi.battleAction(
                          'auto-claim',
                          undefined,
                          e.target.checked,
                        ),
                      t('rewards.battlePass.autoClaimToast'),
                      BATTLE_PASS_KEYS,
                    )
                  }
                />
                {t('rewards.battlePass.autoClaim')}
              </label>
            </Card>
            <div className="program-tabs">
              {PASS_TABS.map((id) => (
                <button
                  key={id}
                  className={tab === id ? 'active' : ''}
                  onClick={() => setTab(id)}
                >
                  {t(`rewards.battlePass.tabs.${id}`)}
                </button>
              ))}
            </div>
            {tab === 'quests' && (
              <div className="program-grid">
                {data?.quests.map((q) => (
                  <Card as="article" className="program-section" key={q.id}>
                    <div className="program-section-heading">
                      <h3>{q.name}</h3>
                      <span className="program-status">
                        {q.period === 'daily'
                          ? t('rewards.battlePass.period.daily')
                          : q.period === 'weekly'
                            ? t('rewards.battlePass.period.weekly')
                            : t('rewards.battlePass.period.season')}
                      </span>
                    </div>
                    <p className="muted">{q.description}</p>
                    <Meter
                      value={Math.min(q.current, q.target)}
                      max={q.target}
                    />
                    <small className="muted">
                      {t('rewards.battlePass.questProgress', {
                        current: Math.min(q.current, q.target),
                        target: q.target,
                        xp: q.xp,
                      })}
                    </small>
                    <Button
                      type="submit"
                      disabled={
                        action.busy || q.claimed || q.current < q.target
                      }
                      onClick={() =>
                        void action.run(
                          () => gamesApi.battleAction('quest', q.id),
                          t('rewards.battlePass.questToast'),
                          BATTLE_PASS_KEYS,
                        )
                      }
                    >
                      {q.claimed
                        ? t('rewards.battlePass.questClaimed')
                        : t('rewards.battlePass.questClaim')}
                    </Button>
                  </Card>
                ))}
                {data?.quests.length === 0 && (
                  <Empty>{t('rewards.battlePass.questsEmpty')}</Empty>
                )}
              </div>
            )}
            {tab === 'levels' && (
              <div className="program-grid">
                {pass.data.levels.map((level) => (
                  <Card className="program-section" key={level.level}>
                    <h3>{t('rewards.battlePass.levelTitle', { level: level.level })}</h3>
                    <small className="muted">
                      {t('rewards.battlePass.levelRequirement', { xp: level.required_xp })}
                    </small>
                    {level.rewards.map((r) => (
                      <article className="program-item" key={r.id}>
                        <RewardList
                          rewards={[
                            {
                              kind: 'item',
                              name: r.item_name,
                              item_id: r.item_id,
                              quantity: r.quantity,
                            },
                          ]}
                        />
                        <small className="muted">
                          {r.is_premium
                            ? t('rewards.battlePass.premium')
                            : t('rewards.battlePass.free')}
                        </small>
                        <Button
                          type="submit"
                          className="ghost"
                          disabled={
                            action.busy ||
                            r.claimed ||
                            !level.unlocked ||
                            r.locked_premium
                          }
                          onClick={() =>
                            void action.run(
                              () => gamesApi.claimBattlePass(r.id),
                              t('rewards.battlePass.rewardToast'),
                              BATTLE_PASS_KEYS,
                            )
                          }
                        >
                          {r.claimed
                            ? t('rewards.battlePass.rewardClaimed')
                            : !level.unlocked
                              ? t('rewards.battlePass.levelLocked')
                              : r.locked_premium
                                ? t('rewards.battlePass.requiresPremium')
                                : t('rewards.battlePass.claim')}
                        </Button>
                      </article>
                    ))}
                  </Card>
                ))}
              </div>
            )}
            {tab === 'exchanges' && (
              <div className="program-grid">
                {data?.exchanges.map((e) => (
                  <Card as="article" className="program-section" key={e.id}>
                    <h3>{e.name}</h3>
                    <p className="muted">
                      {t('rewards.battlePass.exchangeDescription', {
                        quantity: e.required_quantity,
                        itemId: e.required_item_id,
                        enchant: e.required_enchant,
                      })}
                    </p>
                    <small className="muted">
                      {t('rewards.battlePass.exchangeOwned', {
                        owned: e.owned,
                        used: e.used,
                        limit: e.limit || t('rewards.battlePass.exchangeUnlimited'),
                      })}
                    </small>
                    <RewardList rewards={e.rewards} />
                    <Button
                      type="submit"
                      disabled={
                        action.busy ||
                        e.owned < e.required_quantity ||
                        (!!e.limit && e.used >= e.limit)
                      }
                      onClick={() =>
                        void action.run(
                          () => gamesApi.battleAction('exchange', e.id),
                          t('rewards.battlePass.exchangeToast'),
                          BATTLE_PASS_KEYS,
                        )
                      }
                    >
                      {t('rewards.battlePass.exchangeAction')}
                    </Button>
                  </Card>
                ))}
                {data?.exchanges.length === 0 && (
                  <Empty>{t('rewards.battlePass.exchangesEmpty')}</Empty>
                )}
              </div>
            )}
            {tab === 'milestones' && (
              <div className="program-grid">
                {data?.milestones.map((m) => (
                  <Card as="article" className="program-section" key={m.id}>
                    <h3>{m.name}</h3>
                    <Meter value={pass.data?.xp || 0} max={m.required_xp} />
                    <small className="muted">
                      {t('rewards.battlePass.milestoneGoal', { xp: m.required_xp })}
                    </small>
                    <RewardList rewards={m.rewards} />
                    <Button
                      type="submit"
                      disabled={
                        action.busy ||
                        m.claimed ||
                        (pass.data?.xp || 0) < m.required_xp
                      }
                      onClick={() =>
                        void action.run(
                          () => gamesApi.battleAction('milestone', m.id),
                          t('rewards.battlePass.milestoneToast'),
                          BATTLE_PASS_KEYS,
                        )
                      }
                    >
                      {m.claimed
                        ? t('rewards.battlePass.milestoneClaimed')
                        : t('rewards.battlePass.milestoneClaim')}
                    </Button>
                  </Card>
                ))}
                {data?.milestones.length === 0 && (
                  <Empty>{t('rewards.battlePass.milestonesEmpty')}</Empty>
                )}
              </div>
            )}
            {tab === 'history' && (
              <Card className="program-section">
                <h2>{t('rewards.battlePass.historyTitle')}</h2>
                <div className="program-grid">
                  <div className="program-stat">
                    <small>{t('rewards.battlePass.statsRewards')}</small>
                    <strong>{data?.statistics.rewards || 0}</strong>
                  </div>
                  <div className="program-stat">
                    <small>{t('rewards.battlePass.statsExchanges')}</small>
                    <strong>{data?.statistics.exchanges || 0}</strong>
                  </div>
                </div>
                <RewardHistoryList history={data?.history || []} />
              </Card>
            )}
          </>
        )
      )}
    </>
  )
}
