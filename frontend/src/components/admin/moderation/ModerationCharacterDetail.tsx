import { useTranslation } from 'react-i18next'
import { Ban, DoorOpen, MapPin, ShieldOff, Unlock, UserX } from 'lucide-react'
import { Button } from '../../ui/Button'
import { formatDate, formatDuration } from '../../rankings/rankingsFormat'
import { getClassName } from '../../../lib/lineage'
import type { ApiModerationCharacter, ModerationAction } from '../../../services/api'

export function ModerationCharacterDetail({
  character,
  busy,
  onAction,
}: {
  character: ApiModerationCharacter
  busy: boolean
  onAction: (action: ModerationAction) => void
}) {
  const { t } = useTranslation('admin')
  const owner = character.panel_username || character.linked_user_id || '—'
  return (
    <section className="admin-moderation-sheet">
      <header className="admin-accounts-result-head">
        <div>
          <span className="panel-eyebrow">{t('moderation.detailEyebrow')}</span>
          <h2>{character.name}</h2>
          <p>
            {getClassName(character.class_id)} · {t('moderation.level', { level: character.level })}
          </p>
        </div>
        <b className={`account-status-pill ${character.online ? 'is-active' : ''}`}>
          {character.online ? t('moderation.online') : t('moderation.offline')}
        </b>
      </header>

      <div className="admin-accounts-facts">
        <article>
          <small>{t('moderation.fields.login')}</small>
          <strong>{character.login}</strong>
        </article>
        <article>
          <small>{t('moderation.fields.email')}</small>
          <strong title={character.email || undefined}>{character.email || '—'}</strong>
        </article>
        <article>
          <small>{t('moderation.fields.panel')}</small>
          <strong>{owner}</strong>
        </article>
        <article>
          <small>{t('moderation.fields.clan')}</small>
          <strong>{character.clan_name || '—'}</strong>
        </article>
        <article>
          <small>{t('moderation.fields.lastAccess')}</small>
          <strong>{formatDate(character.last_access)}</strong>
        </article>
        <article>
          <small>{t('moderation.fields.onlineTime')}</small>
          <strong>{formatDuration(character.online_time)}</strong>
        </article>
        <article>
          <small>{t('moderation.fields.pvpPk')}</small>
          <strong>{character.pvp} / {character.pk}</strong>
        </article>
        <article>
          <small>{t('moderation.fields.flags')}</small>
          <strong>
            {character.banned ? t('moderation.banned') : t('moderation.notBanned')}
            {' · '}
            {character.jailed ? t('moderation.jailed') : t('moderation.notJailed')}
          </strong>
        </article>
      </div>

      {character.online ? <p className="muted">{t('moderation.onlineHint')}</p> : null}
      {character.jailed && character.jail_reason ? (
        <p className="muted">{t('moderation.jailHint', { reason: character.jail_reason, until: character.jail_until ? formatDate(character.jail_until) : t('moderation.indefinite') })}</p>
      ) : null}

      <div className="admin-moderation-actions">
        <Button size="sm" disabled={busy} onClick={() => onAction('kick')}><UserX aria-hidden="true" />{t('moderation.actions.kick')}</Button>
        {character.jailed ? (
          <Button size="sm" disabled={busy} onClick={() => onAction('unjail')}><Unlock aria-hidden="true" />{t('moderation.actions.unjail')}</Button>
        ) : (
          <Button size="sm" variant="warning" disabled={busy} onClick={() => onAction('jail')}><DoorOpen aria-hidden="true" />{t('moderation.actions.jail')}</Button>
        )}
        {character.banned ? (
          <Button size="sm" disabled={busy} onClick={() => onAction('unban')}><ShieldOff aria-hidden="true" />{t('moderation.actions.unban')}</Button>
        ) : (
          <Button size="sm" variant="danger" disabled={busy} onClick={() => onAction('ban')}><Ban aria-hidden="true" />{t('moderation.actions.ban')}</Button>
        )}
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction('teleport')}><MapPin aria-hidden="true" />{t('moderation.actions.teleport')}</Button>
      </div>

      {(character.logs ?? []).length > 0 ? (
        <ol className="admin-moderation-log">
          {(character.logs ?? []).map((entry, index) => (
            <li key={`${entry.created_at}-${index}`}>
              <strong>{t(`moderation.actions.${entry.action}`, { defaultValue: entry.action })}</strong>
              <span>{entry.actor_username} · {formatDate(entry.created_at)}</span>
              {entry.reason ? <small>{entry.reason}</small> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">{t('moderation.noLogs')}</p>
      )}
    </section>
  )
}
