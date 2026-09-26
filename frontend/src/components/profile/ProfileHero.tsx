import { BadgeCheck, Camera, CircleUserRound, Coins, Mail, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../lib/formatters'
import type { ApiGamerProfile, ApiUser } from '../../services/api'
import { ButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'

export function ProfileHero({
  user,
  displayName,
  bio,
  avatarPreview,
  onPickAvatar,
  progress,
}: {
  user: ApiUser | null
  displayName: string
  bio: string
  avatarPreview?: string | null
  onPickAvatar: () => void
  progress?: ApiGamerProfile
}) {
  const { t } = useTranslation('panel')
  const fullName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : ''
  const name = displayName || fullName || user?.email?.split('@')[0] || ''
  const story = bio.trim() || user?.bio?.trim() || ''
  const unlocked = progress?.unlocked_count ?? progress?.achievements?.filter((row) => row.unlocked).length ?? 0
  const totalAchievements = progress?.total_achievements ?? progress?.achievements?.length ?? 0

  return (
    <Card as="header" className="user-profile-hero">
      <div className="user-profile-hero-main">
        <button className="user-profile-avatar" type="button" onClick={onPickAvatar} aria-label={t('profile.changeAvatar')}>
          {avatarPreview ? (
            <img src={avatarPreview} alt={t('profile.avatarAlt', { username: user?.username || name })} />
          ) : (
            <CircleUserRound aria-hidden="true" />
          )}
          <span>
            <Camera aria-hidden="true" />
          </span>
        </button>
        <div className="user-profile-hero-copy">
          <span className="panel-eyebrow">{t('profile.eyebrow')}</span>
          <h1>{name}</h1>
          <p className="user-profile-hero-meta">
            <span>{user?.email}</span>
            <b>{t('profile.welcomeBack')}</b>
          </p>
          {story ? <p className="user-profile-hero-bio">{story}</p> : null}
          <div className="user-profile-hero-actions">
            <div className={`user-profile-verified ${user?.is_email_verified ? 'is-verified' : ''}`}>
              {user?.is_email_verified ? <BadgeCheck aria-hidden="true" /> : <Mail aria-hidden="true" />}
              <span>{user?.is_email_verified ? t('profile.verifiedAccount') : t('profile.emailPending')}</span>
            </div>
            <ButtonLink to="/panel/security" variant="ghost">
              <ShieldCheck aria-hidden="true" /> {t('profile.openSecurity')}
            </ButtonLink>
          </div>
        </div>
      </div>
      <ul className="user-profile-hero-facts" aria-label={t('profile.heroFactsAria')}>
        <li>
          <Trophy aria-hidden="true" />
          <span>{t('profile.level')}</span>
          <strong>{progress?.level ?? 1}</strong>
        </li>
        <li>
          <Sparkles aria-hidden="true" />
          <span>{t('profile.achievements')}</span>
          <strong>{unlocked}/{totalAchievements || 0}</strong>
        </li>
        <li>
          <Coins aria-hidden="true" />
          <span>{t('profile.chips')}</span>
          <strong>{formatNumber(user?.fichas ?? 0)}</strong>
        </li>
      </ul>
    </Card>
  )
}
