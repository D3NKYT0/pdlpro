import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ThemeCatalogId, ThemePresentation } from '../../services/api'
import { PdlHeroEmblem } from '../../components/PdlSymbol'
import { ThemeHeroVideo } from '../../components/ThemeHeroVideo'
import { ButtonLink } from '../../components/ui/Button'
import { LANDING_PATHS, useLandingPath } from '../../hooks/useLandingPath'
import { formatDate } from '../../lib/formatters'
import {
  CountdownGrid,
  CtaPanel,
  FeatureCards,
  NewsFeed,
  RankingBoard,
  SectionHead,
  StatsRow,
} from './atoms'
import { PUBLIC_TEMPLATES } from './catalog'
import { useTemplateHome } from './useTemplateHome'

function roman(value: number) {
  const glyphs: Array<[number, string]> = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let remaining = value
  let out = ''
  for (const [n, glyph] of glyphs) {
    while (remaining >= n) {
      out += glyph
      remaining -= n
    }
  }
  return out
}

export function CatalogHomePage({
  presentation,
  templateId,
}: {
  presentation: ThemePresentation
  templateId: ThemeCatalogId
}) {
  const home = useTemplateHome(presentation, templateId)
  const landingPath = useLandingPath()
  const template = PUBLIC_TEMPLATES[templateId]
  const { t, hero, features, ranking, cta, newsContent, stats, pillars, has } = home
  const nav = presentation.navigation.map((item) => (
    <Link key={`${item.to}-${item.label}`} to={LANDING_PATHS.includes(item.to) ? landingPath : item.to}>
      {item.label}
    </Link>
  ))

  const statsBlock = stats && has('stats') ? (
    <StatsRow
      items={stats.items}
      status={home.status.data}
      info={home.info.data}
      t={t}
      loading={home.status.isLoading || home.info.isLoading}
      error={home.status.error ?? home.info.error}
    />
  ) : null

  const rankingBlock = has('ranking') ? (
    <RankingBoard
      title={ranking.title}
      tabs={ranking.tabs}
      selectedId={home.selectedTab?.id}
      onSelect={home.setActiveTab}
      query={home.rankings}
      t={t}
      variant={templateId === 'laurelwake' ? 'podium' : templateId === 'bracket' ? 'bracket' : 'table'}
    />
  ) : null

  const newsBlock = has('news') ? (
    <NewsFeed
      title={newsContent.title}
      query={home.news}
      t={t}
      showTitle={templateId !== 'obsidian'}
      hideWhenEmpty={templateId === 'obsidian'}
      variant={templateId === 'ashenledger' || templateId === 'goldleaf' ? 'featured' : templateId === 'obsidian' ? 'ticker' : 'list'}
    />
  ) : null

  const ctaBlock = has('cta') ? (
    <CtaPanel title={cta.title} description={cta.description} actionLabel={cta.actionLabel} actionTo={cta.actionTo} />
  ) : null

  const pillarsBlock = pillars && has('pillars') ? (
    <section className="tpl-pillars">
      {pillars.title ? <h2>{pillars.title}</h2> : null}
      <div className="tpl-pillars__grid">
        {pillars.items.map((item, index) => (
          <article key={item.title}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  ) : null

  let body: ReactNode = null

  if (templateId === 'ironspine') {
    body = (
      <>
        <div className="tpl-spine">
          {has('hero') ? (
            <section className="tpl-spine__banner">
              <div className="tpl-spine__banner-copy">
                {hero.kicker && hero.kicker !== hero.title ? <p className="tpl-kicker">{hero.kicker}</p> : null}
                <h1>{hero.title}</h1>
                <p>{hero.description}</p>
              </div>
            </section>
          ) : null}
          <div className="tpl-spine__grid">
            <nav className="tpl-spine__nav" aria-label={t('nav.main')}>{nav}</nav>
            <article className="tpl-spine__well">
              {newsBlock}
              {has('features') ? <FeatureCards items={features.items} /> : null}
            </article>
            <aside className="tpl-spine__widgets">
              {statsBlock}
              {has('ranking') ? (
                <section className="tpl-spine__panel">
                  <h2 className="tpl-spine__panel-title">{ranking.title}</h2>
                  {rankingBlock}
                </section>
              ) : null}
            </aside>
          </div>
          {ctaBlock}
        </div>
      </>
    )
  } else if (templateId === 'ashenledger') {
    body = (
      <div className="tpl-ledger">
        <section className="tpl-ledger__mast">
          <p className="tpl-ledger__date">{formatDate(new Date().toISOString())}</p>
          <p className="tpl-kicker">{hero.kicker || t('templates.gazette')}</p>
          <h1>{hero.title}</h1>
          <p>{hero.description}</p>
        </section>
        <div className="tpl-ledger__columns">
          <div className="tpl-ledger__main">
            {newsBlock}
            {has('features') ? <FeatureCards items={features.items.slice(0, 3)} /> : null}
          </div>
          <aside className="tpl-ledger__rail">
            <h2 className="tpl-ledger__rail-title">{ranking.title}</h2>
            {rankingBlock}
          </aside>
        </div>
        {ctaBlock}
      </div>
    )
  } else if (templateId === 'warhorn') {
    const siegeClock = !hero.countdownAt.startsWith('2099-01-01')
    const featureTitle = features.title === hero.title ? t('templates.reports') : features.title
    body = (
      <div className="tpl-warroom">
        <section className="tpl-war">
          <p className="tpl-kicker">{hero.kicker || t('templates.warRoom')}</p>
          <h1>{hero.title}</h1>
          <p>{hero.description}</p>
          {siegeClock ? <CountdownGrid label={hero.countdownLabel} value={home.countdown} t={t} /> : null}
          <div className="tpl-war__enlist">
            <ButtonLink to={hero.actionTo}>{hero.actionLabel}</ButtonLink>
            {hero.secondaryLabel && hero.secondaryTo ? (
              <ButtonLink variant="secondary" to={hero.secondaryTo}>{hero.secondaryLabel}</ButtonLink>
            ) : null}
          </div>
        </section>
        {statsBlock}
        {has('features') ? (
          <section className="tpl-block">
            <SectionHead title={featureTitle} />
            <FeatureCards items={features.items} />
          </section>
        ) : null}
        {rankingBlock}
        {newsBlock}
        {ctaBlock}
      </div>
    )
  } else if (templateId === 'ironpatch') {
    const notes = (
      <NewsFeed title={newsContent.title} query={home.news} t={t} showTitle={false} />
    )
    const featureTitle = features.title === hero.title ? t('templates.patchNotes') : features.title
    body = (
      <div className="tpl-launcher">
        {has('hero') ? (
          <section className="tpl-launcher__hero">
            <div className="tpl-launcher__lead">
              {hero.kicker && hero.kicker !== hero.title && hero.kicker !== hero.description ? <p className="tpl-kicker">{hero.kicker}</p> : null}
              <h1>{hero.title}</h1>
              <p>{hero.description}</p>
              <ButtonLink size="lg" to={hero.actionTo}>{hero.actionLabel}</ButtonLink>
            </div>
            <aside className="tpl-launcher__notes">
              <h2>{t('templates.clientNotes')}</h2>
              {notes}
            </aside>
          </section>
        ) : null}
        {has('features') ? (
          <section className="tpl-block">
            <SectionHead title={featureTitle} />
            <FeatureCards items={features.items} />
          </section>
        ) : null}
        {has('ranking') ? (
          <section className="tpl-launcher__rank">
            <h2>{ranking.title}</h2>
            {rankingBlock}
          </section>
        ) : null}
        {has('cta') && cta.title === hero.title ? (
          <div className="tpl-launcher__bar">
            <p>{cta.description}</p>
            <ButtonLink to={cta.actionTo}>{cta.actionLabel}</ButtonLink>
          </div>
        ) : ctaBlock}
      </div>
    )
  } else if (templateId === 'laurelwake') {
    const hallKicker = ranking.subtitle && ranking.subtitle !== ranking.title && ranking.subtitle !== hero.title
      ? ranking.subtitle
      : t('templates.hall')
    const featureTitle = features.title === hero.title ? '' : features.title
    body = (
      <div className="tpl-fame">
        <section className="tpl-hall">
          <SectionHead
            kicker={hallKicker}
            title={ranking.title}
            action={<ButtonLink variant="secondary" to={ranking.actionTo}>{ranking.actionLabel}</ButtonLink>}
          />
          {rankingBlock}
        </section>
        {statsBlock}
        {newsBlock}
        {has('features') ? (
          <section className="tpl-block">
            {featureTitle ? <SectionHead title={featureTitle} /> : null}
            <FeatureCards items={features.items} />
          </section>
        ) : null}
        {has('cta') && cta.title === hero.title ? (
          <div className="tpl-fame__bar">
            <p>{cta.description}</p>
            <ButtonLink to={cta.actionTo}>{cta.actionLabel}</ButtonLink>
          </div>
        ) : ctaBlock}
      </div>
    )
  } else if (templateId === 'meridian') {
    const chapterTitle = features.title === hero.title ? t('templates.chapters') : features.title
    body = (
      <div className="tpl-codex">
        <header className="tpl-codex__open">
          <PdlHeroEmblem />
          <h1>{hero.title}</h1>
          <p>{hero.description}</p>
        </header>
        {statsBlock}
        {has('features') ? (
          <section className="tpl-block">
            <SectionHead title={chapterTitle} />
            <FeatureCards items={features.items} variant="chapters" />
          </section>
        ) : null}
        {pillarsBlock}
        {newsBlock}
        {has('ranking') ? (
          <section className="tpl-codex__rank">
            <h2>{ranking.title}</h2>
            {rankingBlock}
          </section>
        ) : null}
        {has('cta') && cta.title === hero.title ? (
          <div className="tpl-codex__bar">
            <p>{cta.description}</p>
            <ButtonLink to={cta.actionTo}>{cta.actionLabel}</ButtonLink>
          </div>
        ) : ctaBlock}
      </div>
    )
  } else if (templateId === 'twinwake') {
    const sameAct = cta.title === hero.title && cta.actionTo === hero.actionTo
    body = (
      <div className="tpl-gate">
        <section className="tpl-split">
          <article className="tpl-split__account">
            <h1>{hero.title}</h1>
            <p>{hero.description}</p>
            <ButtonLink size="lg" to={hero.actionTo}>{hero.actionLabel}</ButtonLink>
          </article>
          <article className="tpl-split__client">
            <h2>{hero.secondaryLabel || t('nav.download')}</h2>
            {cta.description && cta.description !== hero.description ? <p>{cta.description}</p> : null}
            <ButtonLink size="lg" to={hero.secondaryTo || '/downloads'}>
              {hero.secondaryLabel || t('nav.download')}
            </ButtonLink>
          </article>
        </section>
        {has('features') ? (
          <section className="tpl-block">
            {features.title !== hero.title ? <SectionHead title={features.title} /> : null}
            <FeatureCards items={features.items} />
          </section>
        ) : null}
        {newsBlock}
        {has('cta') && !sameAct ? ctaBlock : null}
      </div>
    )
  } else if (templateId === 'cartograph') {
    body = (
      <div className="tpl-atlas">
        {has('hero') ? (
          <header className="tpl-atlas__legend">
            <p className="tpl-kicker">{hero.kicker && hero.kicker !== hero.title ? hero.kicker : t('templates.realmMap')}</p>
            <h1>{hero.title}</h1>
            <p>{hero.description}</p>
          </header>
        ) : null}
        {has('features') ? <FeatureCards items={features.items} variant="regions" /> : null}
        {statsBlock}
        {newsBlock}
        {has('cta') && cta.title === hero.title ? (
          <div className="tpl-atlas__bar">
            {cta.description && cta.description !== hero.description ? <p>{cta.description}</p> : null}
            <ButtonLink to={cta.actionTo}>{cta.actionLabel}</ButtonLink>
          </div>
        ) : ctaBlock}
      </div>
    )
  } else if (templateId === 'classing') {
    const creed = (pillars?.items ?? []).filter((item) => item.title !== hero.title)
    body = (
      <div className="tpl-select">
        {has('hero') ? (
          <header className="tpl-select__prompt">
            <p className="tpl-kicker">{hero.kicker && hero.kicker !== hero.title ? hero.kicker : t('templates.choosePath')}</p>
            <h1>{hero.title}</h1>
            <p>{hero.description}</p>
          </header>
        ) : null}
        {has('features') ? <FeatureCards items={features.items} variant="paths" /> : null}
        {creed.length ? (
          <ul className="tpl-select__creed">
            {creed.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {has('cta') ? (
          <div className="tpl-select__act">
            <ButtonLink to={cta.actionTo}>{cta.actionLabel}</ButtonLink>
          </div>
        ) : null}
        {newsBlock}
      </div>
    )
  } else if (templateId === 'parchment') {
    const leaves = (pillars?.items ?? []).filter((item) => item.title !== hero.title)
    const chapters = [
      ...leaves.map((item) => ({ title: item.title, text: item.description })),
      ...(has('features') ? features.items.map((item) => ({ title: item.title, text: item.description })) : []),
    ]
    body = (
      <article className="tpl-manuscript">
        {has('hero') ? (
          <header>
            {hero.kicker && hero.kicker !== hero.title ? <p className="tpl-kicker">{hero.kicker}</p> : null}
            <h1>{hero.title}</h1>
            <p>{hero.description}</p>
          </header>
        ) : null}
        {chapters.map((item, index) => (
          <section key={item.title}>
            <span>{t('templates.chapter', { n: roman(index + 1) })}</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </section>
        ))}
        {newsBlock}
        {has('cta') ? (
          <footer className="tpl-manuscript__close">
            {cta.title !== hero.title ? <h2>{cta.title}</h2> : null}
            {cta.description && cta.description !== hero.description ? <p>{cta.description}</p> : null}
            <ButtonLink to={cta.actionTo}>{cta.actionLabel}</ButtonLink>
          </footer>
        ) : null}
      </article>
    )
  } else if (templateId === 'obsidian') {
    body = (
      <section className="tpl-void">
        <ThemeHeroVideo />
        <div className="tpl-void__stage">
          <PdlHeroEmblem />
          <h1>{hero.title}</h1>
          <p>{hero.description}</p>
          <div className="tpl-void__acts">
            <Link to={hero.actionTo}>{hero.actionLabel}</Link>
            {hero.secondaryTo ? <Link to={hero.secondaryTo}>{hero.secondaryLabel}</Link> : null}
          </div>
        </div>
        {newsBlock}
      </section>
    )
  } else if (templateId === 'hearthspire') {
    const rules = (pillars?.items ?? []).filter((item) => item.title !== hero.title)
    body = (
      <div className="tpl-tavern">
        <section className="tpl-tavern__board">
          <p className="tpl-kicker">{t('templates.board')}</p>
          {newsBlock}
          {has('cta') && cta.title === hero.title ? (
            <ButtonLink to={cta.actionTo}>{cta.actionLabel}</ButtonLink>
          ) : null}
        </section>
        {has('features') ? (
          <section className="tpl-tavern__hall">
            {features.title !== hero.title ? <h2>{features.title}</h2> : null}
            <FeatureCards items={features.items} />
          </section>
        ) : null}
        {rules.length ? (
          <section className="tpl-tavern__rules">
            <h2>{t('templates.houseRules')}</h2>
            <ul>
              {rules.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {has('ranking') ? (
          <section className="tpl-tavern__slate">
            <h2>{ranking.title}</h2>
            {rankingBlock}
          </section>
        ) : null}
        {has('cta') && cta.title !== hero.title ? ctaBlock : null}
      </div>
    )
  } else if (templateId === 'goldleaf') {
    body = (
      <div className="tpl-court">
        {has('hero') ? (
          <header className="tpl-court__crest">
            <PdlHeroEmblem />
            <p className="tpl-kicker">{hero.kicker}</p>
            <h1>{hero.title}</h1>
            <p>{hero.description}</p>
            <ButtonLink to={hero.actionTo}>{hero.actionLabel}</ButtonLink>
          </header>
        ) : null}
        <section className="tpl-court__decrees">
          <SectionHead kicker={t('templates.decrees')} title={newsContent.title} />
          {newsBlock}
        </section>
        {rankingBlock}
        {pillarsBlock}
        {ctaBlock}
      </div>
    )
  } else if (templateId === 'lampmarket') {
    body = (
      <div className="tpl-bazaar">
        {has('features') ? (
          <section className="tpl-block">
            <SectionHead kicker={features.subtitle} title={features.title} />
            <FeatureCards items={features.items} variant="stalls" />
          </section>
        ) : null}
        {ctaBlock}
        {newsBlock}
        {rankingBlock}
      </div>
    )
  } else if (templateId === 'bracket') {
    body = (
      <>
        <section className="tpl-arena">
          <SectionHead kicker={ranking.subtitle || t('templates.arenaRules')} title={ranking.title} />
          {rankingBlock}
        </section>
        {has('features') ? <FeatureCards items={features.items} /> : null}
        {has('hero') ? (
          <section className="tpl-arena__call">
            <h1>{hero.title}</h1>
            <ButtonLink to={hero.actionTo}>{hero.actionLabel}</ButtonLink>
          </section>
        ) : null}
        {ctaBlock}
        {newsBlock}
      </>
    )
  } else if (templateId === 'eventide') {
    body = (
      <>
        {has('hero') ? (
          <section className="tpl-theater">
            <ThemeHeroVideo />
            <div className="tpl-theater__copy">
              <h1>{hero.title}</h1>
              <p>{hero.description}</p>
              <ButtonLink to={hero.actionTo}>{hero.actionLabel}</ButtonLink>
            </div>
          </section>
        ) : null}
        <div className="tpl-theater__row">
          {newsBlock}
          {rankingBlock}
        </div>
        {ctaBlock}
        {has('features') ? <FeatureCards items={features.items} /> : null}
      </>
    )
  } else if (templateId === 'wayfarer') {
    const steps = features.items.slice(0, 3)
    body = (
      <>
        <header className="tpl-path__intro">
          <p className="tpl-kicker">{t('templates.startPath')}</p>
          <h1>{hero.title}</h1>
          <p>{hero.description}</p>
        </header>
        <ol className="tpl-path">
          {steps.map((item, index) => (
            <li key={item.title}>
              <span>{t('templates.step', { n: index + 1 })}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
        {has('hero') ? <ButtonLink size="lg" to={hero.actionTo}>{hero.actionLabel}</ButtonLink> : null}
        {newsBlock}
        {ctaBlock}
      </>
    )
  } else if (templateId === 'watchfire') {
    body = (
      <>
        <section className="tpl-vigil" aria-label={t('club.statsAria')}>
          <p className="tpl-kicker">{t('templates.watch')}</p>
          {statsBlock}
          {has('hero') ? <p className="tpl-vigil__line">{hero.description}</p> : null}
        </section>
        {has('hero') ? (
          <div className="tpl-vigil__cta">
            <ButtonLink to={hero.actionTo}>{hero.actionLabel}</ButtonLink>
          </div>
        ) : null}
        {rankingBlock}
        {newsBlock}
        {ctaBlock}
      </>
    )
  }

  return (
    <div
      className={`tpl-home tpl--${templateId}`}
      data-theme-page="home"
      data-theme-template={templateId}
      data-theme-composition={template.composition}
    >
      {body}
    </div>
  )
}
