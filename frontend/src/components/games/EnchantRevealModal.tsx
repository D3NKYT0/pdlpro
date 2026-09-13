import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { enchantRevealKind } from './enchantReveal'
import { WeaponArt } from './GameVisuals'

const WIN_SPARKS = 14
const WIN_MOTES = 8
const LOSS_EMBERS = 10
const PEAK_ORBS = 5

export function EnchantRevealModal({
  open,
  attempting,
  success,
  from,
  toward,
  level,
  onClose,
}: {
  open: boolean
  attempting: boolean
  success: boolean
  from: number
  toward: number
  level: number
  onClose: () => void
}) {
  const { t } = useTranslation('panel')
  const kind = enchantRevealKind({ attempting, success, from, level })
  const shownToward = kind === 'peak' ? 10 : toward
  const title = kind === 'attempting'
    ? t('games.economy.enchantAttempting')
    : kind === 'peak'
      ? t('games.economy.enchantRevealPeak')
      : kind === 'win'
        ? t('games.economy.enchantRevealWin')
        : t('games.economy.enchantRevealLoss')
  const kicker = kind === 'attempting'
    ? t('games.economy.enchantAttemptingHint', { from, toward: shownToward })
    : kind === 'loss'
      ? t('games.economy.enchantRevealTried', { from, toward: shownToward })
      : t('games.economy.enchantRevealStep', { from, toward: shownToward })
  const outcome = kind === 'attempting'
    ? t('games.economy.enchantAttemptingWait')
    : kind === 'peak'
      ? t('games.economy.enchantPeak', { goal: shownToward })
      : kind === 'win'
        ? t('games.economy.enchantRevealUp', { level })
        : t('games.economy.enchantRevealStay', { level: from })
  const tone = kind === 'peak' ? 'is-win is-peak' : `is-${kind}`
  return (
    <Modal
      className={`game-enchant-reveal-modal ${tone}`}
      open={open}
      title={title}
      onClose={attempting ? () => undefined : onClose}
    >
      <div className="enchant-reveal-field" aria-hidden="true">
        <i className="enchant-reveal-wash" />
        <i className="enchant-reveal-veil" />
        <i className="enchant-reveal-rays" />
        <i className="enchant-reveal-ring" />
        <i className="enchant-reveal-spark" />
        {kind === 'win' || kind === 'peak' ? (
          <span className="enchant-reveal-burst">
            <i className="enchant-reveal-flash" />
            {Array.from({ length: WIN_SPARKS }, (_, index) => (
              <i
                key={`spark-${index}`}
                className="enchant-reveal-burst-spark"
                style={{ '--spark-a': `${index * (360 / WIN_SPARKS)}deg`, '--spark-d': `${(index % 5) * 40}ms` } as CSSProperties}
              />
            ))}
            {Array.from({ length: WIN_MOTES }, (_, index) => (
              <i
                key={`mote-${index}`}
                className="enchant-reveal-mote"
                style={
                  {
                    '--x': `${10 + ((index * 11) % 80)}%`,
                    '--s': `${0.55 + (index % 4) * 0.16}`,
                    '--d': `${(index % 8) * 140}ms`,
                  } as CSSProperties
                }
              />
            ))}
            {kind === 'peak'
              ? Array.from({ length: PEAK_ORBS }, (_, index) => (
                  <i
                    key={`orb-${index}`}
                    className="enchant-reveal-orb"
                    style={{ '--p': index, '--d': `${index * 280}ms` } as CSSProperties}
                  />
                ))
              : null}
          </span>
        ) : null}
        {kind === 'loss' ? (
          <span className="enchant-reveal-ash">
            <i className="enchant-reveal-crack" />
            {Array.from({ length: LOSS_EMBERS }, (_, index) => (
              <i
                key={`ember-${index}`}
                className="enchant-reveal-ember"
                style={
                  {
                    '--x': `${8 + ((index * 13) % 84)}%`,
                    '--s': `${0.5 + (index % 4) * 0.18}`,
                    '--d': `${(index % 7) * 120}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
      </div>
      <div className="enchant-reveal-stage">
        <p className="enchant-reveal-kicker">{kicker}</p>
        <span className="enchant-reveal-swords">
          <i className="enchant-reveal-halo" />
          <WeaponArt className="is-from" level={from} />
          <WeaponArt className="is-toward" level={shownToward} />
          <i className="enchant-reveal-pedestal" />
        </span>
        <strong className="enchant-reveal-level">
          <span className="is-from">+{from}</span>
          <span className="is-toward">+{shownToward}</span>
        </strong>
        <p className="enchant-reveal-outcome">{outcome}</p>
        {attempting ? null : (
          <div className="enchant-reveal-actions">
            <Button type="button" variant={kind === 'loss' ? 'danger' : 'success'} onClick={onClose}>
              {t('games.economy.enchantRevealContinue')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
