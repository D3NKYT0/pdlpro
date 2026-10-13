import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'

/** Confirma exclusão, bloqueia repetição e mantém a falha pública da API. */
export function DeleteRecordButton({ name, onDelete, disabled = false }: {
  name: string
  onDelete: () => Promise<unknown>
  disabled?: boolean
}) {
  const { t } = useTranslation('admin')
  const action = useFeedbackAction()
  async function remove() {
    if (action.pending || !window.confirm(t('deletion.confirm', { name }))) return
    const result = await action.run(onDelete, t('deletion.error'))
    if (result.ok) toast.success(t('deletion.success'))
  }
  return <Button type="button" size="sm" variant="danger" disabled={disabled}
    busy={action.pending} aria-label={t('deletion.label', { name })} onClick={() => void remove()}>
    <Trash2 aria-hidden="true" /> {t('chrome.delete')}
  </Button>
}
