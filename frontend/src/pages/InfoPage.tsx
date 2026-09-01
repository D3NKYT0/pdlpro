import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BookOpen,
  Check,
  Coins,
  Crown,
  Download,
  Gem,
  PackageOpen,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Swords,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { serverApi } from '../services/api'

const rateCards: Array<{ key: string; label: string; detail: string; icon: LucideIcon }> = [
  { key: 'xp', label: 'Experiência', detail: 'Progressão de nível', icon: Zap },
  { key: 'sp', label: 'Skill Points', detail: 'Evolução de habilidades', icon: Sparkles },
  { key: 'adena', label: 'Adena', detail: 'Economia do servidor', icon: Coins },
  { key: 'drop', label: 'Drop', detail: 'Itens dos monstros', icon: PackageOpen },
  { key: 'spoil', label: 'Spoil', detail: 'Coleta de materiais', icon: Gem },
]

const sections: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'geral', label: 'Visão geral', icon: Server },
  { id: 'rates', label: 'Rates', icon: Activity },
  { id: 'enchant', label: 'Encantamento', icon: ShieldCheck },
  { id: 'features', label: 'Recursos', icon: Sparkles },
  { id: 'pvp', label: 'PvP', icon: Swords },
  { id: 'comecar', label: 'Começar', icon: Rocket },
]

export function InfoPage() {
  const { hash } = useLocation()
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const data = info.data
  const [activeSection, setActiveSection] = useState(hash.replace('#', '') || 'geral')
  const statusLabel = status.isLoading ? 'Verificando' : status.data?.game_online ? 'Online' : 'Offline'
  const statusClass = status.isLoading ? 'is-checking' : status.data?.game_online ? 'is-online' : 'is-offline'

  useEffect(() => {
    const id = hash.replace('#', '')
    if (!id || !data) return
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, data])

  useEffect(() => {
    if (!data) return

    let animationFrame = 0

    const updateActiveSection = () => {
      const marker = window.scrollY + Math.min(window.innerHeight * 0.32, 280)
      let currentSection = sections[0].id

      sections.forEach(({ id }) => {
        const element = document.getElementById(id)
        if (!element) return

        const elementTop = element.getBoundingClientRect().top + window.scrollY
        if (elementTop <= marker) currentSection = id
      })

      setActiveSection((current) => (current === currentSection ? current : currentSection))
    }

    const handleScroll = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(updateActiveSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [data])

  return (
    <div className="info-page">
      <header className="info-hero">
        <div className="info-hero-glow" aria-hidden="true" />
        <div className="container info-hero-inner">
          <div className="info-hero-copy">
            <span className="info-eyebrow">
              <Crown aria-hidden="true" />
              Guia oficial do servidor
            </span>
            <h1>
              Conheça o <em>reino</em>
            </h1>
            <p>Rates, progressão e regras essenciais reunidos em uma visão clara antes de começar sua jornada.</p>
            <div className="info-hero-actions">
              <Link className="info-action info-action-primary" to="/downloads">
                <Download aria-hidden="true" />
                Baixar o jogo
              </Link>
              <Link className="info-action info-action-secondary" to="/register">
                <UserPlus aria-hidden="true" />
                Criar conta
              </Link>
            </div>
          </div>

          <aside className="info-hero-card" aria-label="Resumo do servidor">
            <div className="info-server-mark">
              <Server aria-hidden="true" />
            </div>
            <div className="info-server-heading">
              <span>Servidor principal</span>
              <strong>{data?.name ?? 'PDL PRO'}</strong>
            </div>
            <div className={`info-live-status ${statusClass}`}>
              <i aria-hidden="true" />
              {statusLabel}
            </div>
            <dl className="info-hero-metrics">
              <div>
                <dt>Crônica</dt>
                <dd>{data?.chronicle ?? '—'}</dd>
              </div>
              <div>
                <dt>Nível máximo</dt>
                <dd>{data?.max_level ?? '—'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <nav className="info-nav container" aria-label="Seções">
        {sections.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className={activeSection === id ? 'is-active' : undefined}
            aria-current={activeSection === id ? 'location' : undefined}
          >
            <Icon aria-hidden="true" />
            {label}
          </a>
        ))}
      </nav>

      <main className="container info-content">
        {info.isLoading ? (
          <div className="info-empty">
            <span className="info-diamond" aria-hidden="true" />
            <p>Consultando a ficha do servidor...</p>
          </div>
        ) : info.isError ? (
          <div className="info-empty">
            <span className="info-diamond" aria-hidden="true" />
            <p>Não foi possível carregar as informações agora.</p>
          </div>
        ) : (
          <>
            <section className="info-section info-overview" id="geral">
              <div className="info-section-heading">
                <span>01</span>
                <div>
                  <small>O essencial</small>
                  <h2>Visão geral</h2>
                </div>
              </div>
              <div className="info-overview-grid">
                <article className="info-story-card">
                  <span className="info-card-kicker">Um clássico vivo</span>
                  <h3>{data?.name ?? 'PDL PRO'}</h3>
                  <p>{data?.description || 'Uma experiência Lineage II criada para valorizar cada conquista e cada rivalidade.'}</p>
                  <div className="info-story-line">
                    <span />
                    Crônica {data?.chronicle ?? '—'}
                  </div>
                </article>

                <div className="info-plaque">
                  <div>
                    <Server aria-hidden="true" />
                    <span>Servidor</span>
                    <strong>{data?.name ?? '—'}</strong>
                  </div>
                  <div>
                    <BookOpen aria-hidden="true" />
                    <span>Crônica</span>
                    <strong>{data?.chronicle ?? '—'}</strong>
                  </div>
                  <div>
                    <Crown aria-hidden="true" />
                    <span>Nível máximo</span>
                    <strong>{data?.max_level ?? '—'}</strong>
                  </div>
                  <div>
                    <Activity aria-hidden="true" />
                    <span>Status</span>
                    <strong className={statusClass}>{statusLabel}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="info-section" id="rates">
              <div className="info-section-heading">
                <span>02</span>
                <div>
                  <small>Ritmo da jornada</small>
                  <h2>Rates do servidor</h2>
                </div>
              </div>
              <div className="info-rate-grid">
                {rateCards.map(({ key, label, detail, icon: Icon }) => (
                  <article className="info-rate-card" key={key}>
                    <div className="info-card-icon">
                      <Icon aria-hidden="true" />
                    </div>
                    <span>{label}</span>
                    <strong>{data?.rates[key] ?? '—'}</strong>
                    <small>{detail}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="info-section" id="enchant">
              <div className="info-section-heading">
                <span>03</span>
                <div>
                  <small>Fortaleça seu equipamento</small>
                  <h2>Encantamento</h2>
                </div>
              </div>
              <div className="info-enchant">
                <article>
                  <div className="info-enchant-icon">
                    <ShieldCheck aria-hidden="true" />
                  </div>
                  <div>
                    <span>Encantamento seguro</span>
                    <p>Até este valor, seu equipamento evolui sem risco.</p>
                  </div>
                  <strong>{data?.enchant.safe ?? '—'}</strong>
                </article>
                <article>
                  <div className="info-enchant-icon">
                    <Sparkles aria-hidden="true" />
                  </div>
                  <div>
                    <span>Limite máximo</span>
                    <p>O ápice de poder permitido para cada equipamento.</p>
                  </div>
                  <strong>{data?.enchant.max ?? '—'}</strong>
                </article>
              </div>
            </section>

            <section className="info-section" id="features">
              <div className="info-section-heading">
                <span>04</span>
                <div>
                  <small>O que espera por você</small>
                  <h2>Recursos do reino</h2>
                </div>
              </div>
              {(data?.features ?? []).length ? (
                <ul className="info-features">
                  {(data?.features ?? []).map((item, index) => (
                    <li key={item}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <Check aria-hidden="true" />
                      <strong>{item}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="info-lead">Nenhum recurso listado no momento.</p>
              )}
            </section>

            <div className="info-split">
              <section className="info-panel" id="pvp">
                <div className="info-panel-icon">
                  <Swords aria-hidden="true" />
                </div>
                <small>Conquiste seu nome</small>
                <h2>PvP e castelos</h2>
                <p>{data?.notes.pvp || 'Combate livre nas zonas de PvP. Castelos seguem o calendário de siege.'}</p>
                <span className="info-panel-number">05</span>
              </section>
              <section className="info-panel" id="comecar">
                <div className="info-panel-icon">
                  <Rocket aria-hidden="true" />
                </div>
                <small>Prepare sua jornada</small>
                <h2>Como começar</h2>
                <p>{data?.notes.start || 'Crie a conta mestra, baixe o cliente e vincule o login Lineage no painel.'}</p>
                <span className="info-panel-number">06</span>
              </section>
            </div>

            <section className="info-cta">
              <div>
                <span className="info-eyebrow">
                  <Crown aria-hidden="true" />
                  Sua lenda começa agora
                </span>
                <h2>Pronto para entrar no reino?</h2>
                <p>Crie sua conta, prepare o cliente e consulte a wiki sempre que precisar.</p>
              </div>
              <div className="info-cta-actions">
                <Link className="info-action info-action-primary" to="/register">
                  <UserPlus aria-hidden="true" />
                  Criar conta
                </Link>
                <Link className="info-action info-action-secondary" to="/downloads">
                  <Download aria-hidden="true" />
                  Baixar jogo
                </Link>
                <Link className="info-wiki-link" to="/wiki">
                  <BookOpen aria-hidden="true" />
                  Abrir wiki
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
