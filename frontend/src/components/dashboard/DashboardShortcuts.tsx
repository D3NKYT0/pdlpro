import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'

export function DashboardShortcuts({
  items,
}: {
  items: Array<{ to: string; key: string; icon: LucideIcon }>
}) {
  const { t } = useTranslation('panel')

  return (
    <>
      <section className="panel-section-heading">
        <div>
          <span className="panel-eyebrow">{t('dashboard.quickAccessEyebrow')}</span>
          <h2>{t('dashboard.quickAccessTitle')}</h2>
        </div>
      </section>
      <section className="grid cols-3 panel-shortcuts">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link className="card shortcut-card" data-art={item.key} key={item.to} to={item.to}>
              <span className="shortcut-icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="shortcut-copy">
                <h3>{t(`dashboard.shortcuts.${item.key}.label`)}</h3>
                <p className="muted">{t(`dashboard.shortcuts.${item.key}.text`)}</p>
              </span>
              <ArrowUpRight className="shortcut-arrow" aria-hidden="true" />
            </Link>
          )
        })}
      </section>
    </>
  )
}
