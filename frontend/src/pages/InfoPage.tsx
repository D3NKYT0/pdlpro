import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { serverApi } from '../services/api'
import { themeImage } from '../theme/assets'

const rateLabels: Record<string, string> = {
  xp: 'XP',
  sp: 'SP',
  adena: 'Adena',
  drop: 'Drop',
  spoil: 'Spoil',
}

const sections = [
  { id: 'geral', label: 'Geral' },
  { id: 'rates', label: 'Rates' },
  { id: 'enchant', label: 'Encantamento' },
  { id: 'features', label: 'Recursos' },
  { id: 'pvp', label: 'PvP' },
  { id: 'comecar', label: 'Começar' },
]

export function InfoPage() {
  const { hash } = useLocation()
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const data = info.data
  const active = hash.replace('#', '') || 'geral'

  useEffect(() => {
    const id = hash.replace('#', '')
    if (!id || !data) return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, data])

  return (
    <div className="info-page">
      <header className="info-hero">
        <div className="title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            Servidor
          </span>
          <h1>Informações</h1>
          <p>A ficha clássica: crônica, rates e o que muda no gameplay.</p>
        </div>
      </header>

      <nav className="info-nav container" aria-label="Seções">
        {sections.map((item) => (
          <a key={item.id} href={`#${item.id}`} className={active === item.id ? 'is-active' : undefined}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="container">
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
            <section className="info-section" id="geral">
              <h2>Geral</h2>
              <div className="info-plaque">
                <div>
                  <strong>{data?.name ?? '—'}</strong>
                  <span>Nome</span>
                </div>
                <div>
                  <strong>{data?.chronicle ?? '—'}</strong>
                  <span>Crônica</span>
                </div>
                <div>
                  <strong>{data?.max_level ?? '—'}</strong>
                  <span>Nível máximo</span>
                </div>
                <div>
                  <strong className={status.data?.game_online ? 'is-online' : 'is-offline'}>
                    <i className="fas fa-circle" />
                    {status.data?.game_online ? 'Online' : 'Offline'}
                  </strong>
                  <span>Servidor</span>
                </div>
              </div>
              {data?.description ? <p className="info-lead">{data.description}</p> : null}
            </section>

            <section className="info-section" id="rates">
              <h2>Rates</h2>
              <div className="info-rate-grid">
                {Object.entries(rateLabels).map(([key, label]) => (
                  <article className="info-tile" key={key}>
                    <div>
                      <strong>{data?.rates[key] ?? '—'}</strong>
                      <span>{label}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="info-section" id="enchant">
              <h2>Encantamento</h2>
              <div className="info-enchant">
                <article className="info-tile">
                  <div>
                    <strong>{data?.enchant.safe ?? '—'}</strong>
                    <span>Safe</span>
                  </div>
                </article>
                <article className="info-tile">
                  <div>
                    <strong>{data?.enchant.max ?? '—'}</strong>
                    <span>Máximo</span>
                  </div>
                </article>
              </div>
            </section>

            <section className="info-section" id="features">
              <h2>Recursos</h2>
              {(data?.features ?? []).length ? (
                <ul className="info-features">
                  {(data?.features ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="info-lead">Nenhum recurso listado no momento.</p>
              )}
            </section>

            <div className="info-split">
              <section className="info-panel" id="pvp">
                <h2>PvP e castelos</h2>
                <p>{data?.notes.pvp || 'Combate livre nas zonas de PvP. Castelos seguem o calendário de siege.'}</p>
              </section>
              <section className="info-panel" id="comecar">
                <h2>Como começar</h2>
                <p>{data?.notes.start || 'Crie a conta mestra, baixe o cliente e vincule o login Lineage no painel.'}</p>
              </section>
            </div>

            <div className="info-cta">
              <span>
                <img src={themeImage('icons/text.png')} alt="" />
                Entre no reino
              </span>
              <p>Crie a conta mestra, baixe o cliente e consulte a wiki quando precisar.</p>
              <div className="info-cta-links">
                <Link to="/downloads">Baixar Jogo</Link>
                <Link to="/register">Criar Conta</Link>
              </div>
              <Link className="info-wiki-link" to="/wiki">
                Abrir wiki
                <img src={themeImage('icons/more.png')} alt="" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
