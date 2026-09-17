import { useTranslation } from 'react-i18next'
import { characterAvatarSrc } from './characterPortrait'

const SIZES = {
  sm: { width: 36, height: 48 },
  md: { width: 56, height: 76 },
  lg: { width: 84, height: 112 },
  xl: { width: 108, height: 144 },
} as const

export type CharacterAvatarSize = keyof typeof SIZES

export function CharacterAvatar({
  name,
  race,
  sex,
  classId,
  size = 'md',
  alt,
  className,
}: {
  name?: string
  race?: string
  sex?: number
  classId?: number
  size?: CharacterAvatarSize
  alt?: string
  className?: string
}) {
  const { t } = useTranslation('common')
  const box = SIZES[size]
  const classes = ['character-avatar', `character-avatar-${size}`, className].filter(Boolean).join(' ')
  return (
    <img
      className={classes}
      src={characterAvatarSrc({ race, sex, classId })}
      alt={alt ?? (name ? t('characterAvatar.named', { name }) : t('characterAvatar.unnamed'))}
      width={box.width}
      height={box.height}
    />
  )
}
