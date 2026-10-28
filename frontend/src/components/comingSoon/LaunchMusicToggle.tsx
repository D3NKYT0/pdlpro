import { Volume2, VolumeX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IconButton } from '../ui/Button'

/** Liga/desliga a trilha da Coming Soon; só aparece quando o tema declara a música. */
export function LaunchMusicToggle({ playing, onToggle, className = '' }: { playing: boolean; onToggle: () => void; className?: string }) {
  const { t } = useTranslation('public')
  const label = playing ? t('comingSoon.musicOff') : t('comingSoon.musicOn')
  return (
    <IconButton
      label={label}
      variant="secondary"
      size="sm"
      className={`launch-music-toggle ${className}`}
      aria-pressed={playing}
      onClick={onToggle}
    >
      {playing ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
    </IconButton>
  )
}
