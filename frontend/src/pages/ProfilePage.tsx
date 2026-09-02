import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
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

export function ProfilePage() {
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
      toast.error('Escolha um arquivo de imagem.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('O avatar deve ter no máximo 5 MB.')
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
      toast.success('Perfil atualizado com sucesso.')
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível atualizar o perfil.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="user-profile-page">
      <Card className="user-profile-hero">
        <div className="user-profile-cover" />
        <div className="user-profile-identity">
          <button className="user-profile-avatar" type="button" onClick={() => fileInput.current?.click()} aria-label="Alterar avatar">
            {avatarPreview ? <img src={avatarPreview} alt={`Avatar de ${user?.username}`} /> : <CircleUserRound aria-hidden="true" />}
            <span><Camera aria-hidden="true" /></span>
          </button>
          <div>
            <span className="panel-eyebrow">Perfil do jogador</span>
            <h1>{displayName || user?.username}</h1>
            <p>@{user?.username}</p>
          </div>
          <div className={`user-profile-verified ${user?.is_email_verified ? 'is-verified' : ''}`}>
            {user?.is_email_verified ? <BadgeCheck aria-hidden="true" /> : <Mail aria-hidden="true" />}
            <span>{user?.is_email_verified ? 'Conta verificada' : 'E-mail pendente'}</span>
          </div>
        </div>
      </Card>

      <div className="user-profile-layout">
        <div className="user-profile-main">
          <Card className="user-profile-completeness">
            <div className="user-profile-section-title">
              <span><Sparkles aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">Personalização</span><h2>Progresso do perfil</h2></div>
              <strong>{completeness}%</strong>
            </div>
            <div className="progress-bar"><i style={{ width: `${completeness}%` }} /></div>
            <p className="muted">Adicione avatar, nome de exibição e biografia para completar seu perfil.</p>
          </Card>

          <Card className="user-profile-form-card">
            <div className="user-profile-section-title">
              <span><UserRound aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">Informações públicas</span><h2>Editar perfil</h2></div>
            </div>
            <form onSubmit={saveProfile}>
              <input ref={fileInput} type="file" accept="image/*" hidden onChange={chooseAvatar} />
              <Field>
                Nome de exibição
                <input value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} placeholder={user?.username} />
                <small>É assim que seu nome aparece no painel.</small>
              </Field>
              <Field>
                Biografia
                <textarea value={bio} maxLength={500} rows={5} onChange={(event) => setBio(event.target.value)} placeholder="Conte um pouco sobre sua jornada no servidor..." />
                <small>{bio.length}/500 caracteres</small>
              </Field>
              <Button type="submit" disabled={saving}>
                <Save aria-hidden="true" /> {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </form>
          </Card>
        </div>

        <aside className="user-profile-sidebar">
          <Card className="user-profile-stats">
            <div className="user-profile-section-title compact">
              <span><Trophy aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">Sua jornada</span><h2>Resumo</h2></div>
            </div>
            <div className="user-profile-stat-list">
              <div><Trophy aria-hidden="true" /><span><small>Nível</small><strong>{progress.data?.level ?? 1}</strong></span></div>
              <div><Sparkles aria-hidden="true" /><span><small>Conquistas</small><strong>{unlockedCount}/{totalAchievements || 0}</strong></span></div>
              <div><Coins aria-hidden="true" /><span><small>Fichas</small><strong>{user?.fichas ?? 0}</strong></span></div>
            </div>
          </Card>

          <Card className="user-profile-account">
            <div className="user-profile-section-title compact">
              <span><ShieldCheck aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">Dados da conta</span><h2>Identificação</h2></div>
            </div>
            <dl>
              <div><dt>Usuário</dt><dd>{user?.username}</dd></div>
              <div><dt>E-mail</dt><dd>{user?.email}</dd></div>
              <div><dt>Função</dt><dd>{user?.role === 'player' ? 'Jogador' : user?.role}</dd></div>
              <div><dt>Segurança</dt><dd>{user?.is_2fa_enabled ? '2FA ativo' : '2FA inativo'}</dd></div>
            </dl>
          </Card>
        </aside>
      </div>

      <AchievementGrid achievements={progress.data?.achievements ?? []} />
    </div>
  )
}
