import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { Check, PackageOpen, Palette, ShieldCheck, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { Field } from '../../components/ui/Field'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { themeApi, type ApiTheme } from '../../services/api'
import { AdminHeader } from './AdminChrome'

const RULE_KEYS = ['schema', 'files', 'accepted', 'blocked', 'renderer', 'activation'] as const

export function AdminThemesPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const themes = useQuery({ queryKey: ['staff-themes'], queryFn: themeApi.list })
  const action = useFeedbackAction()
  const [packageFile, setPackageFile] = useState<File | null>(null)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['staff-themes'] })
  }

  async function install(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!packageFile) return
    const input = event.currentTarget.elements.namedItem('package') as HTMLInputElement | null
    const result = await action.run(async () => {
      await themeApi.install(packageFile)
      await refresh()
    }, t('themes.installError'))
    if (result.ok) {
      setPackageFile(null)
      if (input) input.value = ''
      toast.success(t('themes.installed'))
    }
  }

  async function activate(theme: ApiTheme) {
    const result = await action.run(async () => {
      await themeApi.activate(theme)
      await refresh()
    }, t('themes.activateError'))
    if (result.ok) {
      toast.success(theme.builtin ? t('themes.defaultRestored') : t('themes.activated', { name: theme.name }))
      window.dispatchEvent(new Event('pdl-theme-refresh'))
    }
  }

  async function remove(theme: ApiTheme) {
    if (!window.confirm(t('themes.confirmRemove', { name: theme.name, version: theme.version }))) return
    const result = await action.run(async () => {
      await themeApi.remove(theme)
      await refresh()
    }, t('themes.removeError'))
    if (result.ok) toast.success(t('themes.removed'))
  }

  return (
    <div className="account-page theme-admin-page">
      <AdminHeader kicker={t('themes.kicker')} title={t('themes.title')} description={t('themes.description')} />

      <Card className="admin-config-section theme-installer">
        <header>
          <span><Upload aria-hidden="true" /></span>
          <div><span className="panel-eyebrow">{t('themes.installEyebrow')}</span><h2>{t('themes.installTitle')}</h2><p>{t('themes.installDescription')}</p></div>
        </header>
        <div className="theme-installer-layout">
          <form className="theme-installer-form" onSubmit={install}>
            <Field label={t('themes.fileLabel')} hint={t('themes.fileHint')}>
              <input name="package" type="file" accept=".zip,application/zip" required disabled={action.pending} onChange={(event) => setPackageFile(event.target.files?.[0] ?? null)} />
            </Field>
            <Button type="submit" busy={action.pending} busyLabel={t('themes.installBusy')} disabled={!packageFile}>
              <PackageOpen aria-hidden="true" /> {t('themes.installAction')}
            </Button>
            <p className="theme-security-note"><ShieldCheck aria-hidden="true" /> {t('themes.securityNote')}</p>
          </form>
          <aside className="theme-compat" aria-labelledby="theme-compat-title">
            <span className="panel-eyebrow">{t('themes.contract')}</span>
            <h3 id="theme-compat-title">{t('themes.compatibleTitle')}</h3>
            <p>{t('themes.compatibleDescription')}</p>
            <ul>
              {RULE_KEYS.map((rule) => (
                <li key={rule}>
                  <Trans t={t} i18nKey={`themes.rules.${rule}`} components={{ s: <strong />, c: <code /> }} />
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Card>

      <section aria-labelledby="installed-themes-title">
        <div className="account-section-heading theme-list-heading">
          <div><span className="panel-eyebrow">{t('themes.catalogEyebrow')}</span><h2 id="installed-themes-title">{t('themes.catalogTitle')}</h2></div>
          <span>{t('themes.catalogCount', { total: themes.data?.length ?? 0 })}</span>
        </div>
        {themes.isPending && <LoadingState>{t('themes.loading')}</LoadingState>}
        {themes.isError && <ErrorNotice error={themes.error} onRetry={() => void themes.refetch()} />}
        {themes.data && <div className="theme-package-grid">
          {themes.data.map((theme) => <Card as="article" className={`theme-package${theme.active ? ' is-active' : ''}`} key={theme.package_id ?? 'default'}>
            <div className="theme-package-icon"><Palette aria-hidden="true" /></div>
            <div className="theme-package-copy">
              <span className="panel-eyebrow">{theme.builtin ? t('themes.builtinBadge') : t('themes.packageBadge', { id: theme.id, version: theme.version })}</span>
              <h3>{theme.name}</h3>
              <p>{theme.description || t('themes.fallbackDescription')}</p>
              <small>{t('themes.byAuthor', { author: theme.author || t('themes.unknownAuthor') })}</small>
            </div>
            <div className="theme-package-actions">
              {theme.active ? <span className="theme-active-badge"><Check aria-hidden="true" /> {t('themes.activeBadge')}</span> : <Button size="sm" busy={action.pending} onClick={() => void activate(theme)}>{t('themes.activate')}</Button>}
              {!theme.builtin && !theme.active && <Button size="sm" variant="danger" busy={action.pending} onClick={() => void remove(theme)}><Trash2 aria-hidden="true" /> {t('themes.remove')}</Button>}
            </div>
          </Card>)}
        </div>}
      </section>
    </div>
  )
}
