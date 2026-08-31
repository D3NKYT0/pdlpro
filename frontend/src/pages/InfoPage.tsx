import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { serverApi } from '../services/api'

const rateLabels: Record<string, string> = {
  xp: 'XP',
  sp: 'SP',
  adena: 'Adena',
  drop: 'Drop',
  spoil: 'Spoil',
}

export function InfoPage() {
  const { hash } = useLocation()
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  const data = info.data

  useEffect(() => {
    const id = hash.replace('#', '')
    if (!id || !data) return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, data])

  return (
    <div className="info-page">
      <div className="container">
        <header className="info-header">
          <span>Servidor</span>
          <h1>Informações</h1>
          <p>A ficha clássica do servidor: crônica, rates e o que muda no gameplay.</p>
        </header>

        <section className="info-card" id="geral">
          <h2>Geral</h2>
          <dl className="info-facts">
            <div>
              <dt>Nome</dt>
              <dd>{data?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Crônica</dt>
              <dd>{data?.chronicle ?? '—'}</dd>
            </div>
            <div>
              <dt>Nível máximo</dt>
              <dd>{data?.max_level ?? '—'}</dd>
            </div>
          </dl>
          {data?.description ? <p className="info-lead">{data.description}</p> : null}
        </section>

        <section className="info-card" id="rates">
          <h2>Rates</h2>
          <div className="info-rates">
            {Object.entries(rateLabels).map(([key, label]) => (
              <article key={key}>
                <strong>{data?.rates[key] ?? '—'}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="info-card" id="enchant">
          <h2>Encantamento</h2>
          <dl className="info-facts">
            <div>
              <dt>Safe</dt>
              <dd>{data?.enchant.safe ?? '—'}</dd>
            </div>
            <div>
              <dt>Máximo</dt>
              <dd>{data?.enchant.max ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="info-card" id="features">
          <h2>Recursos</h2>
          <ul className="info-features">
            {(data?.features ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="info-card" id="pvp">
          <h2>PvP e castelos</h2>
          <p>{data?.notes.pvp}</p>
        </section>

        <section className="info-card" id="comecar">
          <h2>Como começar</h2>
          <p>{data?.notes.start}</p>
          <p className="info-actions">
            <Link className="cta-btn primary" to="/register">
              Criar conta
            </Link>
            <Link className="cta-btn secondary" to="/downloads">
              Baixar jogo
            </Link>
            <Link className="cta-btn secondary" to="/wiki">
              Abrir wiki
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
