import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../components/i18n/LanguageSwitcher'
import { InfoSections } from '../components/info/InfoSections'
import { DiscordIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, YouTubeIcon } from '../components/BrandIcons'
import { Button, ButtonLink } from '../components/ui/Button'
import { serverApi } from '../services/api'
import type { ApiServerInfo } from '../services/types'
import { themeImage, themeVideo } from '../theme/assets'

type CountdownValue = { days: string; hours: string; mins: string; secs: string; finished: boolean }

function countdownValue(target: string | null | undefined): CountdownValue {
  if (!target) {
    return { days: '--', hours: '--', mins: '--', secs: '--', finished: false }
  }
  const remaining = Math.max(0, Date.parse(target) - Date.now())
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

function useLaunchCountdown(target: string | null | undefined) {
  const [value, setValue] = useState(() => countdownValue(target))
  useEffect(() => {
    setValue(countdownValue(target))
    if (!target) return undefined
    const timer = window.setInterval(() => setValue(countdownValue(target)), 1000)
    return () => window.clearInterval(timer)
  }, [target])
  return value
}

function useSecondTick(secs: string, enabled: boolean) {
  const previous = useRef(secs)
  const [ticking, setTicking] = useState(false)

  useEffect(() => {
    if (!enabled || previous.current === secs) return undefined
    previous.current = secs
    setTicking(true)
    const timer = window.setTimeout(() => setTicking(false), 320)
    return () => window.clearTimeout(timer)
  }, [secs, enabled])

  return ticking
}

const UNIT_KEYS = ['days', 'hours', 'mins', 'secs'] as const

const LAUNCH_CHAMPIONS = [
  { id: 'phoenix-knight', file: 'coming-soon/phoenix-knight.png', side: 'left-back' },
  { id: 'abyss-walker', file: 'coming-soon/abyss-walker.png', side: 'left-front' },
  { id: 'spell-singer', file: 'coming-soon/spell-singer.png', side: 'right-front' },
  { id: 'temple-knight', file: 'coming-soon/temple-knight.png', side: 'right-back' },
] as const

const ASSAULT_CHAMPIONS = [
  { id: 'assault-vanguard', file: 'coming-soon/assault-vanguard.png', side: 'left-front' },
  { id: 'assault-raider', file: 'coming-soon/assault-raider.png', side: 'left-back' },
  { id: 'assault-mage', file: 'coming-soon/assault-mage.png', side: 'right-front' },
  { id: 'assault-warden', file: 'coming-soon/assault-warden.png', side: 'right-back' },
] as const

const GENERIC_TITLES = new Set(['em breve', 'coming soon', 'próximamente', 'proximamente'])
const RATE_FACT_KEYS = ['xp', 'sp', 'adena', 'drop', 'spoil'] as const
const ENTER_PATH = '/login'
const CHAMPION_ART_VERSION = '4'
const LAUNCH_CINEMATIC = 'coming-soon/video.mp4'
const CINEMATIC_FALLBACK_MS = 45_000

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

function useLaunchCinematic() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const started = useRef(false)
  const finished = useRef(false)
  const [playing, setPlaying] = useState(false)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    started.current = true
    navigate(ENTER_PATH)
  }, [navigate])

  const begin = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (isModifiedClick(event)) return
      event.preventDefault()
      if (started.current || finished.current) return
      if (prefersReducedMotion()) {
        finish()
        return
      }
      started.current = true
      setPlaying(true)
      const video = videoRef.current
      if (!video) {
        finish()
        return
      }
      try {
        video.currentTime = 0
      } catch {
        /* o elemento pode ainda não ter mídia */
      }
      void (async () => {
        try {
          video.muted = true
          await video.play()
        } catch {
          finish()
        }
      })()
    },
    [finish],
  )

  useEffect(() => {
    if (!playing) return undefined
    const video = videoRef.current
    const durationMs =
      video && Number.isFinite(video.duration) && video.duration > 0
        ? Math.ceil(video.duration * 1000) + 1500
        : CINEMATIC_FALLBACK_MS
    const timer = window.setTimeout(finish, durationMs)
    return () => window.clearTimeout(timer)
  }, [playing, finish])

  useEffect(() => {
    if (!playing) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing, finish])

  return { playing, videoRef, begin, finish }
}

function sameText(left: string, right: string) {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase()
}

function LaunchParticles({ count = 68 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const band = index % 3
        const left =
          band === 0
            ? 38 + ((index * 13) % 24)
            : band === 1
              ? 28 + ((index * 17) % 44)
              : (index * 37) % 100
        return {
          id: index,
          left: `${left}%`,
          delay: `${(index % 14) * 0.4}s`,
          duration: `${6 + (index % 8)}s`,
          size: `${3 + (index % 5)}px`,
          drift: `${((index % 7) - 3) * 22}px`,
          bright: band === 0,
        }
      }),
    [count],
  )

  return (
    <div className="launch-gate__particles" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`launch-gate__spark${particle.bright ? ' is-bright' : ''}`}
          style={{
            left: particle.left,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            ['--spark-drift' as string]: particle.drift,
          }}
        />
      ))}
    </div>
  )
}

function resolveHeroTitle(info: ApiServerInfo, waitingKicker: string) {
  const configured = info.coming_soon_title?.trim() || ''
  const brand = info.name?.trim() || 'PDL'
  if (!configured) return brand
  const normalized = configured.toLocaleLowerCase()
  if (GENERIC_TITLES.has(normalized) || normalized === waitingKicker.toLocaleLowerCase()) return brand
  return configured
}

function resolveHeroSlogan(info: ApiServerInfo, title: string) {
  const slogan = info.slogan?.trim() || ''
  if (!slogan || sameText(slogan, title)) return ''
  return slogan
}

function resolveHeroSubtitle(info: ApiServerInfo, title: string, slogan: string, fallback: string) {
  const candidates = [info.coming_soon_subtitle?.trim() || '', info.description?.trim() || '', fallback]
  return candidates.find((text) => text && !sameText(text, title) && !sameText(text, slogan)) || ''
}

type LaunchFact = { key: string; label: string; value: string }
type LaunchFactGroup = { id: string; title: string; facts: LaunchFact[] }

function pushFact(facts: LaunchFact[], key: string, label: string, value: string) {
  const trimmed = value.trim()
  if (trimmed) facts.push({ key, label, value: trimmed })
}

function launchFactGroups(info: ApiServerInfo, label: (key: string) => string): LaunchFactGroup[] {
  const identity: LaunchFact[] = []
  pushFact(identity, 'chronicle', label('comingSoon.fact.chronicle'), info.chronicle || '')
  if (info.max_level) {
    pushFact(identity, 'maxLevel', label('comingSoon.fact.maxLevel'), String(info.max_level))
  }

  const rates: LaunchFact[] = []
  for (const key of RATE_FACT_KEYS) {
    pushFact(rates, key, label(`comingSoon.fact.${key}`), String(info.rates?.[key] || ''))
  }

  const enchant: LaunchFact[] = []
  pushFact(enchant, 'enchantSafe', label('comingSoon.fact.enchantSafe'), String(info.enchant?.safe || ''))
  pushFact(enchant, 'enchantMax', label('comingSoon.fact.enchantMax'), String(info.enchant?.max || ''))

  return [
    { id: 'identity', title: '', facts: identity },
    { id: 'rates', title: label('comingSoon.factsRates'), facts: rates },
    { id: 'enchant', title: label('comingSoon.factsEnchant'), facts: enchant },
  ].filter((group) => group.facts.length > 0)
}

function LaunchPanelChrome() {
  return (
    <>
      <span className="launch-gate__panel-glow" aria-hidden="true" />
      <span
        className="launch-gate__panel-texture"
        aria-hidden="true"
        style={{ backgroundImage: `url(${themeImage('bg/1.png')})` }}
      />
      <span className="launch-gate__panel-rim" aria-hidden="true" />
      <span className="launch-gate__panel-sheen" aria-hidden="true" />
      <span className="launch-gate__panel-corner is-tl" aria-hidden="true" />
      <span className="launch-gate__panel-corner is-tr" aria-hidden="true" />
      <span className="launch-gate__panel-corner is-bl" aria-hidden="true" />
      <span className="launch-gate__panel-corner is-br" aria-hidden="true" />
      <span className="launch-gate__panel-ornament is-top" aria-hidden="true" />
    </>
  )
}

export function ComingSoonPage({ info }: { info: ApiServerInfo }) {
  const { t } = useTranslation('public')
  const title = resolveHeroTitle(info, t('comingSoon.kickerWaiting'))
  const slogan = resolveHeroSlogan(info, title)
  const subtitle = resolveHeroSubtitle(info, title, slogan, t('comingSoon.subtitleFallback'))
  const factGroups = launchFactGroups(info, (key) => t(key))
  const countdown = useLaunchCountdown(info.coming_soon_at)
  const finished = countdown.finished && Boolean(info.coming_soon_at)
  const showInfo = Boolean(info.coming_soon_show_info) && !finished
  const showChampions = info.coming_soon_show_champions !== false
  const splitLayout = factGroups.length > 0 && !showInfo
  const socialLinks = [
    { id: 'whatsapp', href: info.whatsapp_url?.trim(), label: t('comingSoon.socialWhatsapp'), Icon: WhatsAppIcon },
    { id: 'facebook', href: info.facebook_url?.trim(), label: t('comingSoon.socialFacebook'), Icon: FacebookIcon },
    { id: 'instagram', href: info.instagram_url?.trim(), label: t('comingSoon.socialInstagram'), Icon: InstagramIcon },
    { id: 'youtube', href: info.youtube_url?.trim(), label: t('comingSoon.socialYoutube'), Icon: YouTubeIcon },
    { id: 'discord', href: info.discord_url?.trim(), label: t('comingSoon.socialDiscord'), Icon: DiscordIcon },
  ].filter((item): item is typeof item & { href: string } => Boolean(item.href))
  const roster = finished ? ASSAULT_CHAMPIONS : LAUNCH_CHAMPIONS
  const ticking = useSecondTick(countdown.secs, !finished)
  const cinematic = useLaunchCinematic()
  const status = useQuery({
    queryKey: ['server-status'],
    queryFn: serverApi.status,
    enabled: showInfo,
  })
  const statusLabel = status.isLoading
    ? t('info.statusChecking')
    : status.data?.game_online
      ? t('info.statusOnline')
      : t('info.statusOffline')
  const statusClass = status.isLoading ? 'is-checking' : status.data?.game_online ? 'is-online' : 'is-offline'
  const unitLabels = {
    days: t('comingSoon.unitDays'),
    hours: t('comingSoon.unitHours'),
    mins: t('comingSoon.unitMins'),
    secs: t('comingSoon.unitSecs'),
  } as const

  useEffect(() => {
    if (showInfo) return undefined
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [showInfo])

  return (
    <div
      className={`launch-gate${finished ? ' is-open' : ''}${cinematic.playing ? ' is-entering' : ''}${showInfo ? ' launch-gate--scrollable' : ''}`}
      data-theme-surface="public"
      data-theme-page="coming-soon"
    >
      <div className="launch-gate__viewport">
        <div className="launch-gate__sky" aria-hidden="true">
          <img
            className={`launch-gate__bg launch-gate__bg--waiting${!finished ? ' is-active' : ''}`}
            src={themeImage('bg/coming-soon.png')}
            alt=""
          />
          <img
            className={`launch-gate__bg launch-gate__bg--open${finished ? ' is-active' : ''}`}
            src={themeImage('bg/coming-soon-open.png')}
            alt=""
          />
          <video
            ref={cinematic.videoRef}
            className={`launch-gate__bg launch-gate__bg--cinematic${cinematic.playing ? ' is-active' : ''}`}
            src={themeVideo(LAUNCH_CINEMATIC)}
            poster={themeImage(finished ? 'bg/coming-soon-open.png' : 'bg/coming-soon.png')}
            muted
            playsInline
            preload="auto"
            onEnded={cinematic.finish}
            onError={() => {
              if (cinematic.playing) cinematic.finish()
            }}
          />
          <span className="launch-gate__rays" />
          <span className="launch-gate__glow launch-gate__glow--a" />
          <span className="launch-gate__glow launch-gate__glow--b" />
          <span className="launch-gate__glow launch-gate__glow--c" />
          <span className="launch-gate__haze" />
          <span className="launch-gate__vignette" />
          <LaunchParticles count={finished ? 96 : 68} />
        </div>

        {showChampions ? (
          <div
            className={`launch-gate__roster${finished ? ' is-assault' : ''}`}
            aria-hidden="true"
            hidden={cinematic.playing}
          >
            {roster.map((champion) => (
              <img
                key={champion.id}
                className={`launch-gate__champion is-${champion.side}`}
                src={`${themeImage(champion.file)}?v=${CHAMPION_ART_VERSION}`}
                alt=""
              />
            ))}
          </div>
        ) : null}

        <div className="launch-gate__mist" aria-hidden="true" hidden={cinematic.playing}>
          <span className="launch-gate__mist-bank" />
          <span className="launch-gate__mist-bank is-soft" />
          <span className="launch-gate__mist-veil" />
        </div>

        <div className="launch-gate__locale" hidden={cinematic.playing} aria-hidden={cinematic.playing || undefined}>
          <LanguageSwitcher className="language-switcher launch-gate__language" id="coming-soon-language" />
        </div>

        {cinematic.playing ? (
          <div className="launch-gate__cinematic-ui">
            <p className="visually-hidden" role="status">
              {t('comingSoon.enteringLabel')}
            </p>
            <Button type="button" variant="secondary" size="sm" className="launch-gate__skip" onClick={cinematic.finish}>
              {t('comingSoon.skipCinematic')}
            </Button>
          </div>
        ) : null}

        <main className="launch-gate__stage" hidden={cinematic.playing} aria-hidden={cinematic.playing || undefined}>
          <div className={`launch-gate__tableau${finished ? ' is-assault' : ''}${!finished && splitLayout ? ' is-split' : ''}`}>
            {!finished && splitLayout ? (
              <aside className="launch-gate__panel launch-gate__dossier" aria-label={t('comingSoon.factsLabel')}>
                <LaunchPanelChrome />
                <p className="launch-gate__kicker">{t('comingSoon.factsTitle')}</p>
                {factGroups.map((group) => (
                  <section key={group.id} className="launch-gate__fact-group">
                    {group.title ? <h2 className="launch-gate__fact-heading">{group.title}</h2> : null}
                    <dl className="launch-gate__facts">
                      {group.facts.map((fact) => (
                        <div key={fact.key} className="launch-gate__fact">
                          <dt>{fact.label}</dt>
                          <dd>{fact.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
                <span className="launch-gate__panel-ornament is-bottom" aria-hidden="true" />
              </aside>
            ) : null}

            <div className="launch-gate__panel launch-gate__hero-panel">
              <LaunchPanelChrome />

              <p className="launch-gate__kicker">
                {finished ? t('comingSoon.kickerOpen') : t('comingSoon.kickerWaiting')}
              </p>
              <h1 className="launch-gate__title">{title}</h1>
              {slogan ? <p className="launch-gate__slogan">{slogan}</p> : null}
              <p className="launch-gate__subtitle">
                {finished ? t('comingSoon.subtitleOpen') : subtitle}
              </p>

              {finished ? (
                <div className="launch-gate__finale" role="status">
                  <span className="launch-gate__finale-ring" aria-hidden="true" />
                  <p className="launch-gate__ready">{t('comingSoon.momentArrived')}</p>
                </div>
              ) : (
                <div className="launch-gate__countdown" aria-label={t('comingSoon.countdownLabel')}>
                  {UNIT_KEYS.map((key, index) => (
                    <div key={key} className="launch-gate__unit">
                      {index > 0 ? <span className="launch-gate__sep" aria-hidden="true">:</span> : null}
                      <div className={`launch-gate__block${key === 'secs' && ticking ? ' is-tick' : ''}`}>
                        <span className="launch-gate__value">{countdown[key]}</span>
                        <span className="launch-gate__label">{unitLabels[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={`launch-gate__actions${finished ? ' is-emphasis' : ''}`}>
                <ButtonLink to={ENTER_PATH} size="lg" onClick={cinematic.begin}>
                  {t('nav.signIn')}
                </ButtonLink>
                <ButtonLink to="/downloads" variant="secondary" size="md" className="launch-gate__secondary">
                  {t('nav.download')}
                </ButtonLink>
              </div>

              <span className="launch-gate__panel-ornament is-bottom" aria-hidden="true" />
            </div>
          </div>

          {socialLinks.length > 0 ? (
            <div className="launch-gate__socials" role="navigation" aria-label={t('comingSoon.socialsLabel')}>
              {socialLinks.map(({ id, href, label, Icon }) => (
                <a key={id} className="launch-gate__social" href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
                  <Icon />
                </a>
              ))}
            </div>
          ) : null}
        </main>

        {showInfo && !cinematic.playing ? (
          <a
            className="launch-gate__scroll-cue"
            href="#launch-geral"
            onClick={(event) => {
              event.preventDefault()
              document.getElementById('launch-geral')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <span>{t('comingSoon.scrollForInfo')}</span>
            <i className="launch-gate__scroll-chevron" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {showInfo ? (
        <section className="launch-gate__info info-page" aria-label={t('comingSoon.infoSectionsLabel')}>
          <div className="container info-content launch-gate__info-inner">
            <InfoSections
              data={info}
              statusLabel={statusLabel}
              statusClass={statusClass}
              idPrefix="launch-"
            />
          </div>
        </section>
      ) : null}
    </div>
  )
}
