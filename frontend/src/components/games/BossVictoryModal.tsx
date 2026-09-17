import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ItemIcon } from '../ItemIcon'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatCompactQuantity } from '../../lib/formatters'
import { BOSS_STRIKE_MAX } from './bossDuel'
import { MonsterPortrait, WeaponArt } from './GameVisuals'

const FIREWORKS = 16
const SPARKS = 22
const MOTES = 10

export type BossVictoryRun = {
  name: string
  weaponLevel: number
  fragments: number
  strikes: number
  rounds: number
  prize: { item_id: number; item_name: string; quantity: number }
}

export function BossVictoryModal({
  open,
  run,
  onClose,
}: {
  open: boolean
  run: BossVictoryRun | null
  onClose: () => void
}) {
  const { t } = useTranslation('panel')
  if (!run) return null
  return (
    <Modal
      className="game-boss-victory-modal"
      open={open}
      title={t('games.economy.bossVictoryTitle')}
      onClose={onClose}
    >
      <div className="boss-victory-field" aria-hidden="true">
        <i className="boss-victory-wash" />
        <i className="boss-victory-veil" />
        <i className="boss-victory-rays" />
        {Array.from({ length: FIREWORKS }, (_, index) => (
          <i
            key={`fw-${index}`}
            className="boss-victory-firework"
            style={
              {
                '--x': `${8 + ((index * 17) % 84)}%`,
                '--d': `${(index % 8) * 180}ms`,
                '--s': `${0.7 + (index % 4) * 0.18}`,
              } as CSSProperties
            }
          />
        ))}
        {Array.from({ length: SPARKS }, (_, index) => (
          <i
            key={`spark-${index}`}
            className="boss-victory-spark"
            style={{ '--spark-a': `${index * (360 / SPARKS)}deg`, '--spark-d': `${(index % 6) * 50}ms` } as CSSProperties}
          />
        ))}
        {Array.from({ length: MOTES }, (_, index) => (
          <i
            key={`mote-${index}`}
            className="boss-victory-mote"
            style={
              {
                '--x': `${12 + ((index * 13) % 76)}%`,
                '--d': `${(index % 7) * 160}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="boss-victory-stage">
        <p className="boss-victory-kicker">{t('games.economy.bossVictoryLead', { boss: run.name, level: run.weaponLevel })}</p>
        <div className="boss-victory-heroes">
          <span className="boss-victory-hero is-weapon">
            <WeaponArt level={run.weaponLevel} />
            <small>{t('games.economy.bossVictoryWeapon', { level: run.weaponLevel })}</small>
          </span>
          <MonsterPortrait id="boss" name={run.name} size="hero" />
        </div>
        <p className="boss-victory-prize">
          <ItemIcon itemId={run.prize.item_id} name={run.prize.item_name} size={40} />
          <strong>
            {t('games.economy.bossVictoryPrize', {
              quantity: formatCompactQuantity(run.prize.quantity),
              item: run.prize.item_name,
            })}
          </strong>
        </p>
        <dl className="boss-victory-stats">
          <div>
            <dt>{t('games.economy.bossVictoryWeaponLabel')}</dt>
            <dd>+{run.weaponLevel}</dd>
          </div>
          <div>
            <dt>{t('games.economy.bossVictoryFragmentsLabel')}</dt>
            <dd>{t('games.economy.bossVictoryFragments', { count: run.fragments })}</dd>
          </div>
          <div>
            <dt>{t('games.economy.bossVictoryStrikesLabel')}</dt>
            <dd>{t('games.economy.bossVictoryStrikes', { hits: run.strikes, max: BOSS_STRIKE_MAX })}</dd>
          </div>
          <div>
            <dt>{t('games.economy.bossVictoryRoundsLabel')}</dt>
            <dd>{t('games.economy.rounds', { count: run.rounds })}</dd>
          </div>
        </dl>
        <div className="boss-victory-actions">
          <Button type="button" variant="success" onClick={onClose}>
            {t('games.economy.bossVictoryContinue')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
