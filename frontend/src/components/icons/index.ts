/**
 * Ilustrações esmaltadas do painel. Telas importam daqui; o kit compartilhado
 * vive em `enamel.tsx` e as artes novas em `enamelIcons.tsx`. As conquistas
 * reutilizam o mesmo kit em `achievements/AchievementIcons`.
 */
export type { EnamelIconProps, Tone } from './enamel'
export { Glyph, INK, Ramp, Shadow, Sparkle, TONES, useGlyphIds } from './enamel'
export {
  BannerFlagIcon,
  CartIcon,
  ENAMEL_ICONS,
  ExchangeIcon,
  PackageBoxIcon,
  ShieldOkIcon,
  type EnamelIconKey,
} from './enamelIcons'
export { GiftBoxIcon } from '../achievements/AchievementIcons'
