import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Clock3,
  Crosshair,
  Skull,
  Sparkles,
  Swords,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Select } from '../ui/Select'
import { gamesApi } from '../../services/api'
import { formatNumber } from '../../lib/formatters'
import { CharacterAvatar } from '../character/CharacterAvatar'
import { formatDuration } from '../rankings/rankingsFormat'
import { Empty, ErrorNotice, Loading, RewardList } from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'

const HUNT_METRIC_ICONS: Record<string, LucideIcon> = {
  pvp: Swords,
  pk: Skull,
  online_time: Clock3,
  level: Sparkles,
}

function percentOf(value: number, total: number) {
  return Math.min(100, Math.max(0, (value / Math.max(1, total)) * 100))
}

function huntValue(metric: string, value: number) {
  return metric === 'online_time' ? formatDuration(value) : formatNumber(value)
}

export function HuntSection() {
  const { t } = useTranslation('panel')
  const [selected, setSelected] = useState('')
  const charactersKey = selected
  const query = useQuery({
    queryKey: ['hunt', charactersKey],
    queryFn: () => {
      if (!selected) return gamesApi.hunt()
      const [login, charId] = selected.split(':')
      return gamesApi.hunt(login, Number(charId))
    },
  })
  const action = useProgramAction()
  const data = query.data
  const options = useMemo(
    () => (data?.characters ?? []).map((row) => ({
      value: `${row.login}:${row.char_id}`,
      label: t('rewards.hunt.characterOption', {
        name: row.name,
        login: row.login,
        level: row.level,
      }),
    })),
    [data?.characters, t],
  )
  const currentValue = selected || (data?.character ? `${data.character.login}:${data.character.char_id}` : '')
  const quests = data?.quests ?? []
  const claimedCount = quests.filter((quest) => quest.claimed).length
  const readyCount = quests.filter((quest) => !quest.claimed && quest.current >= quest.target).length
  const overallPercent = quests.length
    ? Math.round(
        quests.reduce(
          (total, quest) => total + percentOf(Math.min(quest.current, quest.target), quest.target),
          0,
        ) / quests.length,
      )
    : 0

  return (
    <div className="daily-layout hunt-layout">
      <ErrorNotice error={query.error || action.error} />
      {query.isPending ? <Loading /> : null}
      {data ? (
        <>
          <Card className="battle-pass-card daily-hero hunt-hero">
            <header className="daily-hero-banner hunt-hero-banner">
              <div className="pass-season-copy">
                <span className="panel-eyebrow">{t('rewards.hunt.eyebrow')}</span>
                <h2>{t('rewards.hunt.title')}</h2>
                <p>{t('rewards.hunt.description')}</p>
              </div>
              <div className="daily-day-seal">
                {data.character ? (
                  <>
                    <span>{t('rewards.hunt.metrics.level')}</span>
                    <strong>{data.character.level}</strong>
                  </>
                ) : (
                  <Swords aria-hidden="true" />
                )}
              </div>
            </header>

            {options.length ? (
              <div className="hunt-character">
                {data.character ? (
                  <CharacterAvatar
                    name={data.character.name}
                    classId={data.character.class_id}
                    sex={data.character.sex}
                    size="md"
                  />
                ) : null}
                <Field label={t('rewards.hunt.character')}>
                  <Select
                    aria-label={t('rewards.hunt.character')}
                    value={currentValue}
                    options={options}
                    onChange={setSelected}
                  />
                </Field>
                {data.character ? (
                  <span className={`pass-chip hunt-presence${data.character.online ? ' is-online' : ''}`}>
                    {data.character.online ? t('rewards.hunt.online') : t('rewards.hunt.offline')}
                  </span>
                ) : null}
              </div>
            ) : (
              <Empty icon={<Swords aria-hidden="true" />}>{t('rewards.hunt.emptyAccounts')}</Empty>
            )}

            {data.character ? (
              <div className="battle-pass-overview">
                <div>
                  <Swords aria-hidden="true" />
                  <span>{t('rewards.hunt.metrics.pvp')}</span>
                  <strong>{formatNumber(data.character.pvp)}</strong>
                </div>
                <div>
                  <Skull aria-hidden="true" />
                  <span>{t('rewards.hunt.metrics.pk')}</span>
                  <strong>{formatNumber(data.character.pk)}</strong>
                </div>
                <div>
                  <Clock3 aria-hidden="true" />
                  <span>{t('rewards.hunt.metrics.online_time')}</span>
                  <strong>{formatDuration(data.character.online_time)}</strong>
                </div>
                <div>
                  <Check aria-hidden="true" />
                  <span>{t('rewards.hunt.questsDone')}</span>
                  <strong>{claimedCount}/{quests.length}</strong>
                </div>
              </div>
            ) : null}

            {quests.length > 0 ? (
              <div className="battle-pass-progress">
                <div className="progress-labels">
                  <span>
                    <Crosshair aria-hidden="true" />
                    {readyCount
                      ? t('rewards.hunt.readyCount', { count: readyCount })
                      : t('rewards.hunt.overallProgress')}
                  </span>
                  <span>{overallPercent}%</span>
                </div>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-label={t('rewards.hunt.overallProgress')}
                  aria-valuenow={overallPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: `${overallPercent}%` }} />
                </div>
              </div>
            ) : null}
          </Card>

          {data.character && quests.length === 0 ? (
            <Card className="rewards-empty-card">
              <Empty icon={<Crosshair aria-hidden="true" />}>{t('rewards.hunt.emptyQuests')}</Empty>
            </Card>
          ) : null}

          {quests.length ? (
            <div className="pass-quest-grid">
              {quests.map((quest) => {
                const current = Math.min(quest.current, quest.target)
                const complete = quest.current >= quest.target
                const MetricIcon = HUNT_METRIC_ICONS[quest.metric] ?? Crosshair
                const status = quest.claimed ? 'claimed' : complete ? 'ready' : 'progress'
                return (
                  <Card
                    as="article"
                    className={`pass-quest hunt-quest ${quest.claimed ? 'is-claimed' : complete ? 'is-complete' : ''}`}
                    key={quest.id}
                  >
                    <div className="pass-quest-head">
                      <span className="pass-quest-icon"><MetricIcon aria-hidden="true" /></span>
                      <div>
                        <span className="panel-eyebrow">{t(`rewards.hunt.metrics.${quest.metric}`)}</span>
                        <h3>{quest.name}</h3>
                      </div>
                      <span className="pass-chip">
                        {t(`rewards.hunt.status.${status}`)}
                      </span>
                    </div>
                    <p className="muted">{quest.description}</p>
                    <div className="pass-quest-progress">
                      <div className="progress-labels">
                        <span>
                          {t(`rewards.hunt.period.${quest.period}`, { defaultValue: quest.period })}
                          {' · '}
                          {t('rewards.hunt.progress', {
                            current: huntValue(quest.metric, current),
                            target: huntValue(quest.metric, quest.target),
                          })}
                        </span>
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
                    <div className="hunt-quest-foot">
                      <RewardList rewards={quest.rewards} />
                      {quest.claimed ? (
                        <b className="pass-done">
                          <Check aria-hidden="true" />
                          {t('rewards.hunt.questClaimed')}
                        </b>
                      ) : (
                        <Button
                          size="sm"
                          disabled={action.busy || !complete || !data.character}
                          onClick={() =>
                            void action.run(
                              () => gamesApi.claimHunt(
                                quest.id,
                                data.character?.login,
                                data.character?.char_id,
                              ),
                              t('rewards.hunt.claimToast'),
                              [['hunt', charactersKey]],
                            )
                          }
                        >
                          {t('rewards.hunt.claim')}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
