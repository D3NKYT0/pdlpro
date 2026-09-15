import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'

/** Bloco de fumaça no dashboard do painel (`panel.dashboard`). */
export function ExampleDashboardSlot() {
  const { t } = useTranslation('ext.example')
  return (
    <Card as="aside" data-extension-slot="panel.dashboard">
      <p className="muted">{t('slot.dashboard')}</p>
      <Link to="/ext/example/ping">{t('nav.ping')}</Link>
    </Card>
  )
}
