import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Crosshair, Swords } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { gamesApi } from '../../services/api'
import { ErrorNotice, Loading, RewardList } from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'

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
      label: `${row.name} · ${row.login}`,
    })),
    [data?.characters],
  )
  const currentValue = selected || (data?.character ? `${data.character.login}:${data.character.char_id}` : '')

  return (
    <div className="daily-layout">
      <ErrorNotice error={query.error || action.error} />
      {query.isPending ? <Loading /> : null}
      {data ? (
        <>
          <Card className="battle-pass-card daily-hero">
            <header className="daily-hero-banner">
              <div className="pass-season-copy">
                <span className="panel-eyebrow">{t('rewards.hunt.eyebrow')}</span>
                <h2>{t('rewards.hunt.title')}</h2>
                <p>{t('rewards.hunt.description')}</p>
              </div>
              <span className="daily-day-seal">
                <Swords aria-hidden="true" />
              </span>
            </header>
            {options.length ? (
              <Field label={t('rewards.hunt.character')}>
                <select
                  value={currentValue}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <p className="muted">{t('rewards.hunt.emptyAccounts')}</p>
            )}
          </Card>

          {data.character && data.quests.length === 0 ? (
            <p className="muted">{t('rewards.hunt.emptyQuests')}</p>
          ) : null}

          <div className="battle-pass-grid">
            {data.quests.map((quest) => (
              <Card key={quest.id} className="battle-pass-card">
                <span className="panel-eyebrow">{t(`rewards.hunt.metrics.${quest.metric}`)}</span>
                <h3>{quest.name}</h3>
                <p className="muted">{quest.description}</p>
                <p
                  role="progressbar"
                  aria-label={quest.name}
                  aria-valuenow={quest.current}
                  aria-valuemin={0}
                  aria-valuemax={quest.target}
                >
                  <Crosshair aria-hidden="true" />
                  {' '}
                  {t('rewards.hunt.progress', { current: quest.current, target: quest.target })}
                </p>
                <RewardList rewards={quest.rewards} />
                <Button
                  disabled={action.busy || quest.claimed || quest.current < quest.target || !data.character}
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
                  {quest.claimed ? t('rewards.hunt.claimed') : t('rewards.hunt.claim')}
                </Button>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
