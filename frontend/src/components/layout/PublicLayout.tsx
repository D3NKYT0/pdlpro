import { Link, Outlet } from 'react-router-dom'
import { themeImage } from '../../theme/assets'
import { useDefaultTheme } from '../../theme/useDefaultTheme'
import { SiteNav } from './SiteNav'

export function PublicLayout() {
  useDefaultTheme()

  return (
    <>
      <SiteNav />

      <div className="main-content">
        <Outlet />
      </div>

      <footer>
        <div className="language">
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>
              <img src={themeImage('icons/world.png')} alt="" />
              &nbsp;&nbsp;&nbsp;Português
            </span>
            <span>
              <img className="cursor" src={themeImage('icons/downcursor.png')} alt="" />
            </span>
          </span>
          <ul className="language-dropdown">
            <li>
              <span>Português</span>
            </li>
          </ul>
        </div>

        <div className="copyright container">
          <div className="c-link">
            <Link to="/agreement">Acordo do Usuário</Link>
            <Link to="/terms">Termos de Serviço</Link>
            <Link to="/privacy">Política de Privacidade</Link>
          </div>
          <div className="c-text">
            <img src={themeImage('logo.png')} alt="Logo do Lineage2" />
            <p>© {new Date().getFullYear()} PDL PRO</p>
            <span style={{ display: 'block', textAlign: 'center' }}>Feito com ❤️ por aventureiros para aventureiros.</span>
          </div>
        </div>
      </footer>
    </>
  )
}

export function PublicContent() {
  return <Outlet />
}
