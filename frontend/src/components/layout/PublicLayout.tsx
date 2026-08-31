import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { themeImage } from '../../theme/assets'
import { useDefaultTheme } from '../../theme/useDefaultTheme'
import { SiteNav } from './SiteNav'

export function PublicLayout() {
  const [loading, setLoading] = useState(true)

  useDefaultTheme()

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 700)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <div className={`loading${loading ? '' : ' scale'}`} style={loading ? undefined : { display: 'none' }}>
        <div className="l-logo">
          <div className="letters">
            <img src={themeImage('logo.png')} alt="Logo do Lineage2" />
          </div>
          <div className="circle">
            <img src={themeImage('logo-circle.png')} alt="" />
          </div>
        </div>
      </div>

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
