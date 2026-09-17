import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../ui/Modal'
import { Field } from '../../ui/Field'
import { Select } from '../../ui/Select'
import { Button } from '../../ui/Button'
import type { ApiModerationCharacter, ApiModerationTown, ModerationAction } from '../../../services/api'

export function ModerationActionModal({
  action,
  character,
  towns,
  busy,
  onClose,
  onConfirm,
}: {
  action: ModerationAction | null
  character: ApiModerationCharacter | null
  towns: ApiModerationTown[]
  busy: boolean
  onClose: () => void
  onConfirm: (payload: { reason: string; minutes: number; town: string }) => void
}) {
  const { t } = useTranslation('admin')
  const { t: tPanel } = useTranslation('panel')
  const [reason, setReason] = useState('')
  const [minutes, setMinutes] = useState('0')
  const [town, setTown] = useState(towns[0]?.id ?? 'giran')
  const open = Boolean(action && character)
  const needsReason = action === 'jail' || action === 'ban'
  const townOptions = towns.map((item) => ({
    value: item.id,
    label: tPanel(`character.towns.${item.id}`, { defaultValue: item.id }),
  }))

  if (!open || !action || !character) return null

  return (
    <Modal
      open={open}
      title={t(`moderation.confirmTitle.${action}`, { name: character.name })}
      onClose={onClose}
    >
      <form
        className="admin-moderation-form"
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm({ reason: reason.trim(), minutes: Number(minutes) || 0, town })
        }}
      >
        <p>{t(`moderation.confirmText.${action}`)}</p>
        {needsReason || action === 'kick' || action === 'teleport' ? (
          <Field label={t('moderation.reasonLabel')} hint={needsReason ? t('moderation.reasonRequired') : t('moderation.reasonOptional')}>
            <textarea
              aria-label={t('moderation.reasonLabel')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={255}
              required={needsReason}
              minLength={needsReason ? 3 : undefined}
            />
          </Field>
        ) : null}
        {action === 'jail' ? (
          <Field label={t('moderation.minutesLabel')} hint={t('moderation.minutesHint')}>
            <input
              type="number"
              min={0}
              max={43200}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </Field>
        ) : null}
        {action === 'teleport' && townOptions.length > 0 ? (
          <Field label={t('moderation.townLabel')}>
            <Select value={town} options={townOptions} onChange={setTown} aria-label={t('moderation.townLabel')} />
          </Field>
        ) : null}
        <div className="admin-moderation-form-actions">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            {t('moderation.cancel')}
          </Button>
          <Button type="submit" variant={action === 'ban' ? 'danger' : 'primary'} busy={busy} busyLabel={t('moderation.applying')}>
            {t(`moderation.actions.${action}`)}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
