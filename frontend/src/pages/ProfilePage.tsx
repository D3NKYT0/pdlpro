import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  BadgeCheck,
  Camera,
  CircleUserRound,
  Coins,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AchievementGrid } from '../components/AchievementGrid'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const MAX_BIO_LENGTH = 500

export function ProfilePage() {
  const { t } = useTranslation('panel')
  const { user, refreshUser } = useAuth()
  const progress = useQuery({ queryKey: ['progress'], queryFn: authApi.progress })
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDisplayName(user?.display_name ?? '')
    setBio(user?.bio ?? '')
  }, [user?.display_name, user?.bio])

  const avatarPreview = useMemo(() => (avatar ? URL.createObjectURL(avatar) : user?.avatar_url), [avatar, user?.avatar_url])

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const completedFields = [Boolean(user?.avatar_url || avatar), Boolean(displayName.trim()), Boolean(bio.trim())].filter(Boolean).length
  const completeness = Math.round((completedFields / 3) * 100)
  const unlockedCount = progress.data?.unlocked_count ?? progress.data?.achievements?.filter((row) => row.unlocked).length ?? 0
  const totalAchievements = progress.data?.total_achievements ?? progress.data?.achievements?.length ?? 0

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.avatarNotImage'))
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t('profile.avatarTooLarge'))
      return
    }
    setAvatar(file)
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const data = new FormData()
      data.append('display_name', displayName.trim())
      data.append('bio', bio.trim())
      if (avatar) data.append('avatar', avatar)
      await authApi.updateMe(data)
      await refreshUser()
      setAvatar(null)
      toast.success(t('profile.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('profile.saveError')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="user-profile-page">
      <Card className="user-profile-hero">
        <div className="user-profile-cover" />
        <div className="user-profile-identity">
          <button className="user-profile-avatar" type="button" onClick={() => fileInput.current?.click()} aria-label={t('profile.changeAvatar')}>
            {avatarPreview ? <img src={avatarPreview} alt={t('profile.avatarAlt', { username: user?.username })} /> : <CircleUserRound aria-hidden="true" />}
            <span><Camera aria-hidden="true" /></span>
          </button>
          <div>
            <span className="panel-eyebrow">{t('profile.eyebrow')}</span>
            <h1>{displayName || user?.username}</h1>
            <p>@{user?.username}</p>
          </div>
          <div className={`user-profile-verified ${user?.is_email_verified ? 'is-verified' : ''}`}>
            {user?.is_email_verified ? <BadgeCheck aria-hidden="true" /> : <Mail aria-hidden="true" />}
            <span>{user?.is_email_verified ? t('profile.verifiedAccount') : t('profile.emailPending')}</span>
          </div>
        </div>
      </Card>

      <div className="user-profile-layout">
        <div className="user-profile-main">
          <Card className="user-profile-completeness">
            <div className="user-profile-section-title">
              <span><Sparkles aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">{t('profile.personalization')}</span><h2>{t('profile.completenessTitle')}</h2></div>
              <strong>{completeness}%</strong>
            </div>
            <div className="progress-bar"><i style={{ width: `${completeness}%` }} /></div>
            <p className="muted">{t('profile.completenessHint')}</p>
          </Card>

          <Card className="user-profile-form-card">
            <div className="user-profile-section-title">
              <span><UserRound aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">{t('profile.publicInfo')}</span><h2>{t('profile.editTitle')}</h2></div>
            </div>
            <form onSubmit={saveProfile}>
              <input ref={fileInput} type="file" accept="image/*" hidden onChange={chooseAvatar} />
              <Field>
                {t('profile.displayName')}
                <input value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} placeholder={user?.username} />
                <small>{t('profile.displayNameHint')}</small>
              </Field>
              <Field>
                {t('profile.bio')}
                <textarea value={bio} maxLength={MAX_BIO_LENGTH} rows={5} onChange={(event) => setBio(event.target.value)} placeholder={t('profile.bioPlaceholder')} />
                <small>{t('profile.bioCounter', { length: bio.length, max: MAX_BIO_LENGTH })}</small>
              </Field>
              <Button type="submit" disabled={saving}>
                <Save aria-hidden="true" /> {saving ? t('profile.saving') : t('profile.save')}
              </Button>
            </form>
          </Card>
        </div>

        <aside className="user-profile-sidebar">
          <Card className="user-profile-stats">
            <div className="user-profile-section-title compact">
              <span><Trophy aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">{t('profile.journey')}</span><h2>{t('profile.summary')}</h2></div>
            </div>
            <div className="user-profile-stat-list">
              <div><Trophy aria-hidden="true" /><span><small>{t('profile.level')}</small><strong>{progress.data?.level ?? 1}</strong></span></div>
              <div><Sparkles aria-hidden="true" /><span><small>{t('profile.achievements')}</small><strong>{unlockedCount}/{totalAchievements || 0}</strong></span></div>
              <div><Coins aria-hidden="true" /><span><small>{t('profile.chips')}</small><strong>{user?.fichas ?? 0}</strong></span></div>
            </div>
          </Card>

          <Card className="user-profile-account">
            <div className="user-profile-section-title compact">
              <span><ShieldCheck aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">{t('profile.accountData')}</span><h2>{t('profile.identification')}</h2></div>
            </div>
            <dl>
              <div><dt>{t('profile.username')}</dt><dd>{user?.username}</dd></div>
              <div><dt>{t('profile.email')}</dt><dd>{user?.email}</dd></div>
              <div><dt>{t('profile.role')}</dt><dd>{user?.role === 'player' ? t('profile.rolePlayer') : user?.role}</dd></div>
              <div><dt>{t('profile.security')}</dt><dd>{user?.is_2fa_enabled ? t('profile.twoFactorOn') : t('profile.twoFactorOff')}</dd></div>
            </dl>
          </Card>
        </aside>
      </div>

      <AchievementGrid achievements={progress.data?.achievements ?? []} />
    </div>
  )
}
