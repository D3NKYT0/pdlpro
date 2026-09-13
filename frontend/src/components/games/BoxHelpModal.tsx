import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const TOPICS = [
  ['helpHunt', 'helpHuntText'],
  ['helpBuy', 'helpBuyText'],
  ['helpOpen', 'helpOpenText'],
  ['helpReset', 'helpResetText'],
] as const

export function BoxHelpModal({
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
      title={t('games.boxes.helpTitle')}
      onClose={onClose}
    >
      <div className="game-box-help">
        <p>{t('games.boxes.helpLead')}</p>
        <dl>
          {TOPICS.map(([title, text]) => (
            <div key={title}>
              <dt>{t(`games.boxes.${title}`)}</dt>
              <dd>{t(`games.boxes.${text}`)}</dd>
            </div>
          ))}
        </dl>
        <Button type="button" onClick={onClose}>{t('games.boxes.helpDone')}</Button>
      </div>
    </Modal>
  )
}
