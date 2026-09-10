import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AdminHeader({ kicker, title, description }: { kicker: string; title: string; description?: string }) {
  const { t } = useTranslation('admin')
  return (
    <PageHeader className="account-hero" eyebrow={kicker} title={title} description={description} leading={
        <Link className="character-back" to="/panel/admin">
          <ArrowLeft aria-hidden="true" />
          {t('chrome.back')}
        </Link>
    } />
  )
}

export function AdminSaveBar({ saving, label }: { saving: boolean; label?: string }) {
  const { t } = useTranslation('admin')
  return (
    <Button type="submit" busy={saving} busyLabel={t('chrome.saving')}>
      {label ?? t('chrome.save')}
    </Button>
  )
}
