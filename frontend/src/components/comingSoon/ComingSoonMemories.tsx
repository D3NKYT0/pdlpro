import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pause, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useResourceControls } from '../../contexts/ResourceControlsContext'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { InfoGuide } from '../info/InfoGuide'
import { InfoSections } from '../info/InfoSections'
import { BannerModal } from '../public/BannerModal'
import { Button, ButtonLink } from '../ui/Button'
import { serverApi } from '../../services/api'
import type { ApiServerInfo } from '../../services/api'
import { formatLaunchDate } from '../../lib/formatters'
import { comingSoonMusic, infoGuideStyle, type ComingSoonMemoriesStyle } from '../../lib/pageStyles'
import { themeAsset } from '../../theme/assets'
import { useTheme } from '../../theme/ThemeProvider'
import {
  launchSocialLinks,
  resolveHeroSlogan,
  resolveHeroSubtitle,
  resolveHeroTitle,
  UNIT_KEYS,
  useLaunchCountdown,
} from './launch'
import { LaunchMusicToggle } from './LaunchMusicToggle'
import { LaunchParticles } from './LaunchParticles'
import { useLaunchMusic } from './useLaunchMusic'
import { useSceneCarousel } from './useSceneCarousel'

const INFO_ANCHOR = 'launch-geral'

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Estilo `memories` da Coming Soon: conteúdo à esquerda (data, contagem, ações e
 * redes) e galeria de cenas do tema à direita. Cenas vêm de `pages.comingSoon`;
 * legendas, alt e nomes das miniaturas de `public:comingSoonMemories.scenes.<id>`.
 */
export function ComingSoonMemories({ info, style }: { info: ApiServerInfo; style: ComingSoonMemoriesStyle }) {
  const { t } = useTranslation('public')
  const theme = useTheme()
  const guide = infoGuideStyle(theme)
  const musicAsset = comingSoonMusic(theme)
  const music = useLaunchMusic(musicAsset ? themeAsset(musicAsset) : null)
  const { scenes } = style
  const title = resolveHeroTitle(info, t('comingSoon.kickerWaiting'))
  const slogan = resolveHeroSlogan(info, title)
  const subtitle = resolveHeroSubtitle(info, title, slogan, t('comingSoon.subtitleFallback'))
  const countdown = useLaunchCountdown(info.coming_soon_at)
  const finished = countdown.finished && Boolean(info.coming_soon_at)
  const showInfo = Boolean(info.coming_soon_show_info)
  const socialLinks = launchSocialLinks(info, t)
  const carousel = useSceneCarousel(scenes.length, undefined, style.autoplay)
  const active = scenes[carousel.index]
  const launch = formatLaunchDate(info.coming_soon_at, style.timeZone)
  const displayOn = useResourceControls()
  const status = useQuery({
    queryKey: ['server-status'],
    queryFn: serverApi.status,
    enabled: showInfo && !guide && displayOn('server-status'),
  })
  const statusLabel = status.isLoading
    ? t('info.statusChecking')
    : status.data?.game_online
      ? t('info.statusOnline')
      : t('info.statusOffline')
  const statusClass = status.isLoading ? 'is-checking' : status.data?.game_online ? 'is-online' : 'is-offline'
  const sceneKey = (id: string) => `comingSoonMemories.scenes.${id}`
  const unitLabels = {
    days: t('comingSoon.unitDays'),
    hours: t('comingSoon.unitHours'),
    mins: t('comingSoon.unitMins'),
    secs: t('comingSoon.unitSecs'),
  } as const

  const nextAsset = scenes[carousel.next]?.asset
  useEffect(() => {
    if (!nextAsset) return
    const image = new Image()
    image.src = themeAsset(nextAsset)
    void image.decode?.().catch(() => undefined)
  }, [nextAsset])

  return (
    <div
      className={`launch-memories${finished ? ' is-open' : ''}${style.background ? ' has-backdrop' : ''}`}
      data-theme-surface="public"
      data-theme-page="coming-soon"
      data-theme-style="memories"
    >
      {style.background ? (
        <div
          className="launch-memories__backdrop"
          aria-hidden="true"
          style={{ backgroundImage: `url(${JSON.stringify(themeAsset(style.background))})` }}
        />
      ) : null}
      <div className="launch-memories__sparks" aria-hidden="true">
        <LaunchParticles count={finished ? 96 : 68} />
      </div>
      {/* A abertura ocupa a tela inteira; as informações começam abaixo da dobra. */}
      <div className="launch-memories__viewport">
        <header className="launch-memories__topbar">
          <span className="launch-memories__brand">
            {t('comingSoonMemories.brand', { defaultValue: info.name?.trim() || t('brand', { ns: 'common' }) })}
          </span>
          <div className="launch-memories__topbar-actions">
            {music.enabled ? <LaunchMusicToggle playing={music.playing} onToggle={music.toggle} /> : null}
            <LanguageSwitcher className="language-switcher launch-gate__language" id="coming-soon-language" />
          </div>
        </header>

        <main className="launch-memories__stage">
          <div className="launch-memories__copy">
            <p className="launch-memories__kicker">
              {finished ? t('comingSoon.kickerOpen') : t('comingSoonMemories.kicker')}
            </p>
            <h1 className="launch-memories__title">{title}</h1>
            {info.chronicle ? <p className="launch-memories__chronicle">{info.chronicle}</p> : null}
            <p className="launch-memories__tagline">
              {finished ? t('comingSoon.subtitleOpen') : t('comingSoonMemories.tagline', { defaultValue: subtitle })}
            </p>

            {launch ? (
              <div className="launch-memories__opening">
                <span className="launch-memories__opening-label">{t('comingSoonMemories.openingLabel')}</span>
                <time className="launch-memories__opening-date" dateTime={info.coming_soon_at ?? undefined}>
                  {launch.date}
                </time>
                <span className="launch-memories__opening-time">
                  {t('comingSoonMemories.timeLine', { time: launch.time, zone: launch.zone })}
                </span>
              </div>
            ) : null}

            {finished ? (
              <p className="launch-memories__ready" role="status">{t('comingSoon.momentArrived')}</p>
            ) : (
              <div
                className="launch-memories__countdown"
                role="group"
                aria-label={launch ? t('comingSoonMemories.countdownGroup', { date: launch.date }) : t('comingSoon.countdownLabel')}
              >
                {UNIT_KEYS.map((key) => (
                  <div key={key} className="launch-memories__unit" aria-hidden="true">
                    <span className="launch-memories__value">{countdown[key]}</span>
                    <span className="launch-memories__label">{unitLabels[key]}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="launch-memories__actions">
              <ButtonLink to="/login">{t('nav.signIn')}</ButtonLink>
              <ButtonLink to="/downloads" variant="secondary">{t('nav.download')}</ButtonLink>
            </div>

            {socialLinks.length > 0 ? (
              <div className="launch-gate__socials launch-memories__socials" role="navigation" aria-label={t('comingSoon.socialsLabel')}>
                {socialLinks.map(({ id, href, label, Icon }) => (
                  <a key={id} className="launch-gate__social" href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
                    <Icon />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <section
            className="launch-memories__gallery"
            aria-label={t('comingSoonMemories.galleryLabel')}
            aria-roledescription="carousel"
            {...carousel.pointerHandlers}
          >
            <div className="launch-memories__frame">
              {scenes.map((scene, index) => (
                <img
                  key={scene.id}
                  className={`launch-memories__scene${index === carousel.index ? ' is-active' : ''}`}
                  src={themeAsset(scene.asset)}
                  alt={index === carousel.index ? t(`${sceneKey(scene.id)}.alt`, { defaultValue: '' }) : ''}
                  aria-hidden={index === carousel.index ? undefined : true}
                  style={scene.focus ? { objectPosition: scene.focus } : undefined}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  width={1880}
                  height={1000}
                />
              ))}
            </div>

            <div className="launch-memories__caption">
              <div>
                <p className="launch-memories__category">{t(`${sceneKey(active.id)}.category`, { defaultValue: '' })}</p>
                <p className="launch-memories__phrase">{t(`${sceneKey(active.id)}.caption`, { defaultValue: '' })}</p>
              </div>
              {scenes.length > 1 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="launch-memories__toggle"
                  aria-label={carousel.paused ? t('comingSoonMemories.playLabel') : t('comingSoonMemories.pauseLabel')}
                  onClick={carousel.togglePaused}
                >
                  {carousel.paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                  <span>{carousel.paused ? t('comingSoonMemories.play') : t('comingSoonMemories.pause')}</span>
                </Button>
              ) : null}
            </div>

            {scenes.length > 1 ? (
              <div className="launch-memories__thumbs" role="group" aria-label={t('comingSoonMemories.thumbsLabel')}>
                {scenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    type="button"
                    className={`launch-memories__thumb${index === carousel.index ? ' is-active' : ''}`}
                    data-scene={scene.id}
                    aria-pressed={index === carousel.index}
                    aria-label={t(`${sceneKey(scene.id)}.thumb`, {
                      defaultValue: t('comingSoonMemories.sceneFallback', { index: index + 1 }),
                    })}
                    onClick={() => carousel.select(index)}
                  >
                    <img
                      src={themeAsset(scene.asset)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={scene.focus ? { objectPosition: scene.focus } : undefined}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </main>

        {showInfo ? (
          <a
            className="launch-memories__scroll"
            href={`#${INFO_ANCHOR}`}
            aria-label={t('comingSoonMemories.scrollToInfoLabel')}
            onClick={(event) => {
              const target = document.getElementById(INFO_ANCHOR)
              if (!target) return
              event.preventDefault()
              target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
            }}
          >
            <span>{t('comingSoonMemories.scrollToInfo')}</span>
            <span aria-hidden="true">↓</span>
          </a>
        ) : null}
      </div>

      {showInfo ? (
        <section className="launch-gate__info launch-memories__info info-page" aria-label={t('comingSoon.infoSectionsLabel')}>
          {guide ? (
            <InfoGuide style={guide} data={info} idPrefix="launch-" embedded />
          ) : (
            <div className="container info-content launch-gate__info-inner">
              <InfoSections data={info} statusLabel={statusLabel} statusClass={statusClass} idPrefix="launch-" />
            </div>
          )}
        </section>
      ) : null}
      <BannerModal location="coming_soon" onInteract={music.enabled ? music.start : undefined} />
    </div>
  )
}
