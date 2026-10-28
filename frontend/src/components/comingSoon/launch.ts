import { useEffect, useState } from 'react'
import { DiscordIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, YouTubeIcon } from '../BrandIcons'
import type { ApiServerInfo } from '../../services/api'

/** Peças da abertura (Coming Soon) compartilhadas pelos estilos clássico e `memories`. */

export type CountdownValue = { days: string; hours: string; mins: string; secs: string; finished: boolean }

export const UNIT_KEYS = ['days', 'hours', 'mins', 'secs'] as const

/** Recalcula a diferença a cada chamada; nunca fica negativo. */
export function countdownValue(target: string | null | undefined, now = Date.now()): CountdownValue {
  if (!target) {
    return { days: '--', hours: '--', mins: '--', secs: '--', finished: false }
  }
  const remaining = Math.max(0, Date.parse(target) - now)
  const total = Math.floor(remaining / 1000)
  const pad = (value: number) => String(Math.max(0, value)).padStart(2, '0')
  return {
    days: pad(Math.floor(total / 86400)),
    hours: pad(Math.floor((total % 86400) / 3600)),
    mins: pad(Math.floor((total % 3600) / 60)),
    secs: pad(total % 60),
    finished: remaining <= 0,
  }
}

export function useLaunchCountdown(target: string | null | undefined) {
  const [value, setValue] = useState(() => countdownValue(target))
  useEffect(() => {
    setValue(countdownValue(target))
    if (!target) return undefined
    const timer = window.setInterval(() => setValue(countdownValue(target)), 1000)
    return () => window.clearInterval(timer)
  }, [target])
  return value
}

const GENERIC_TITLES = new Set(['em breve', 'coming soon', 'próximamente', 'proximamente'])

function sameText(left: string, right: string) {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase()
}

export function resolveHeroTitle(info: ApiServerInfo, waitingKicker: string) {
  const configured = info.coming_soon_title?.trim() || ''
  const brand = info.name?.trim() || 'PDL PRO'
  if (!configured) return brand
  const normalized = configured.toLocaleLowerCase()
  if (GENERIC_TITLES.has(normalized) || normalized === waitingKicker.toLocaleLowerCase()) return brand
  return configured
}

export function resolveHeroSlogan(info: ApiServerInfo, title: string) {
  const slogan = info.slogan?.trim() || ''
  if (!slogan || sameText(slogan, title)) return ''
  return slogan
}

export function resolveHeroSubtitle(info: ApiServerInfo, title: string, slogan: string, fallback: string) {
  const candidates = [info.coming_soon_subtitle?.trim() || '', info.description?.trim() || '', fallback]
  return candidates.find((text) => text && !sameText(text, title) && !sameText(text, slogan)) || ''
}

/** Redes sociais configuradas no servidor, na ordem fixa da abertura. */
export function launchSocialLinks(info: ApiServerInfo, t: (key: string) => string) {
  return [
    { id: 'whatsapp', href: info.whatsapp_url?.trim(), label: t('comingSoon.socialWhatsapp'), Icon: WhatsAppIcon },
    { id: 'facebook', href: info.facebook_url?.trim(), label: t('comingSoon.socialFacebook'), Icon: FacebookIcon },
    { id: 'instagram', href: info.instagram_url?.trim(), label: t('comingSoon.socialInstagram'), Icon: InstagramIcon },
    { id: 'youtube', href: info.youtube_url?.trim(), label: t('comingSoon.socialYoutube'), Icon: YouTubeIcon },
    { id: 'discord', href: info.discord_url?.trim(), label: t('comingSoon.socialDiscord'), Icon: DiscordIcon },
  ].filter((item): item is typeof item & { href: string } => Boolean(item.href))
}
