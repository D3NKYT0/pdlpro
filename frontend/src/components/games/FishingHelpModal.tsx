import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const TOPICS = [
  ['helpCast', 'helpCastText'],
  ['helpBait', 'helpBaitText'],
  ['helpRod', 'helpRodText'],
  ['helpCollection', 'helpCollectionText'],
] as const

export function FishingHelpModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation('panel')
  return (
    <Modal
      className="game-box-help-modal"
      open={open}
      title={t('games.fishing.helpTitle')}
      onClose={onClose}
    >
      <div className="game-box-help">
        <p>{t('games.fishing.helpLead')}</p>
        <dl>
          {TOPICS.map(([title, text]) => (
            <div key={title}>
              <dt>{t(`games.fishing.${title}`)}</dt>
              <dd>{t(`games.fishing.${text}`)}</dd>
            </div>
          ))}
        </dl>
        <Button type="button" onClick={onClose}>{t('games.fishing.helpDone')}</Button>
      </div>
    </Modal>
  )
}
