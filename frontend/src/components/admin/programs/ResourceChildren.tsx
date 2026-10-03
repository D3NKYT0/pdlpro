import { useTranslation } from 'react-i18next'
import type { Resource } from '../../../services/api'
import { Toggle } from '../../ui/Toggle'

/** Exibe subcategorias recursivas e preserva a preferência local ao desligar um ancestral. */
export function ResourceChildren({ rows, parent, updating, onToggle, ancestorsEnabled = true }: {
  rows: Resource[]
  parent: Resource
  updating: string | null
  onToggle: (row: Resource, enabled: boolean) => void
  ancestorsEnabled?: boolean
}) {
  const { t, i18n } = useTranslation('admin')
  const children = rows.filter(row => row.parent_code === parent.code)
  if (!children.length) return null
  const active = ancestorsEnabled && parent.enabled
  const name = (row: Resource) => t(`resources.items.${row.code}.name`, { defaultValue: row.name })
  return <fieldset className="admin-resource-children" data-theme-part="resource-children">
    <legend>{t('resources.microResources')}</legend>
    {!active && <p>{t('resources.parentDisabled')}</p>}
    {children.sort((a, b) => name(a).localeCompare(name(b), i18n.resolvedLanguage || i18n.language)).map(row => (
      <div key={row.id}>
        <Toggle label={t(row.enabled ? 'resources.disable' : 'resources.enable', { name: name(row) })}
          checked={row.enabled} busy={updating === row.id} disabled={updating !== null}
          onChange={event => onToggle(row, event.target.checked)} />
        <p>{t(`resources.items.${row.code}.description`, { defaultValue: row.description })}</p>
        <ResourceChildren rows={rows} parent={row} updating={updating} onToggle={onToggle} ancestorsEnabled={active} />
      </div>
    ))}
  </fieldset>
}
