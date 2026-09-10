import { useTranslation } from 'react-i18next'

/** Página de fumaça da extensão de exemplo (`/ext/example/ping`). */
export function ExamplePingPage() {
  const { t } = useTranslation('common')
  return (
    <main className="page">
      <h1>{t('extensionExample.pingTitle')}</h1>
      <p className="muted">{t('extensionExample.pingBody')}</p>
    </main>
  )
}
