import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { themeImage } from '../../theme/assets'
import { programsApi } from '../../services/domain/programs.service'
import { PdlSymbol } from '../PdlSymbol'

const exploreLinks = [
  { to: '/', label: 'Início' },
  { to: '/informacoes', label: 'Informações' },
  { to: '/rankings', label: 'Rankings', resource: 'rankings' },
  { to: '/wiki', label: 'Wiki', resource: 'wiki' },
  { to: '/news', label: 'Notícias', resource: 'news' },
]

const accountLinks = [
  { to: '/login', label: 'Entrar' },
  { to: '/painel', label: 'Painel' },
  { to: '/roadmap', label: 'Roadmap', resource: 'roadmap' },
  { to: '/faq', label: 'Perguntas frequentes', resource: 'faq' },
]

const legalLinks = [
  { to: '/agreement', label: 'Acordo do Usuário' },
  { to: '/terms', label: 'Termos de Serviço' },
  { to: '/privacy', label: 'Política de Privacidade' },
]

export function SiteFooter() {
  const year = new Date().getFullYear()
  const discord = import.meta.env.VITE_DISCORD_URL as string | undefined
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
  const visible = (resource?: string) =>
    !resource || !resources.data?.some((r) => r.code === resource && !r.enabled)
  const downloadsEnabled = visible('downloads')

  return (
    <footer className="site-footer">
      <div className="site-footer-shell container">
        <div className="site-footer-brand">
          <Link className="site-footer-brand-link" to="/" aria-label="PDL PRO — Início">
            <PdlSymbol className="site-footer-mark" />
            <span className="site-footer-brand-copy">
              <strong>PDL PRO</strong>
              <small>Lineage</small>
            </span>
          </Link>
          <p>Progressão, siege e glória no reino de Aden — um servidor Lineage feito para quem joga de verdade.</p>
          <div className="site-footer-actions">
            {downloadsEnabled ? (
              <Link className="site-footer-download" to="/downloads">
                Download
              </Link>
            ) : null}
            <Link className="site-footer-account" to="/register">
              Criar conta
            </Link>
            {discord ? (
              <a className="site-footer-community" href={discord} target="_blank" rel="noreferrer">
                Comunidade
              </a>
            ) : null}
          </div>
        </div>

        <div className="site-footer-col" role="navigation" aria-label="Explorar o site">
          <h2>Explorar</h2>
          <ul>
            {exploreLinks.filter((item) => visible(item.resource)).map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer-col" role="navigation" aria-label="Conta e suporte">
          <h2>Conta</h2>
          <ul>
            {accountLinks.filter((item) => visible(item.resource)).map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer-col" role="navigation" aria-label="Documentos legais">
          <h2>Legal</h2>
          <ul>
            {legalLinks.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer-bar">
        <div className="site-footer-bar-inner container">
          <p>© {year} PDL PRO. Todos os direitos reservados.</p>
          <span className="site-footer-locale" title="Idioma do site">
            <img src={themeImage('icons/world.png')} alt="" aria-hidden="true" />
            Português
          </span>
        </div>
      </div>
    </footer>
  )
}
