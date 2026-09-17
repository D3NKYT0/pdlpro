import { useTranslation } from 'react-i18next'
import type { ApiModerationCharacter } from '../../../services/api'
import { getClassName } from '../../../lib/lineage'

export function ModerationCharacterList({
  rows,
  selectedId,
  onSelect,
}: {
  rows: ApiModerationCharacter[]
  selectedId: number | null
  onSelect: (row: ApiModerationCharacter) => void
}) {
  const { t } = useTranslation('admin')
  if (rows.length === 0) return null
  return (
    <table className="table">
      <thead>
        <tr>
          <th>{t('moderation.columns.character')}</th>
          <th>{t('moderation.columns.login')}</th>
          <th>{t('moderation.columns.email')}</th>
          <th>{t('moderation.columns.level')}</th>
          <th>{t('moderation.columns.status')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.char_id}
            className={row.char_id === selectedId ? 'is-selected' : undefined}
            aria-selected={row.char_id === selectedId}
          >
            <td>
              <button type="button" className="admin-moderation-row" onClick={() => onSelect(row)}>
                <strong>{row.name}</strong>
                <small>{getClassName(row.class_id)}</small>
              </button>
            </td>
            <td>{row.login}</td>
            <td>{row.email || '—'}</td>
            <td>{row.level}</td>
            <td>
              <span className={`badge ${row.online ? '' : 'off'}`}>
                {row.online ? t('moderation.online') : t('moderation.offline')}
              </span>
              {row.banned ? <span className="badge is-warn">{t('moderation.banned')}</span> : null}
              {row.jailed ? <span className="badge is-warn">{t('moderation.jailed')}</span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
