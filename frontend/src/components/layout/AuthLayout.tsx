import { useEffect } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { themeImage } from '../../theme/assets'
import { useDefaultTheme } from '../../theme/useDefaultTheme'

export function AuthLayout() {
  useDefaultTheme()

  useEffect(() => {
    document.documentElement.classList.add('pdl-auth')
    return () => document.documentElement.classList.remove('pdl-auth')
  }, [])

  return (
    <div className="auth-screen">
      <Link className="auth-logo" to="/" aria-label="Voltar ao início">
        <img className="letters" src={themeImage('logo.png')} alt="PDL" />
        <img className="circle" src={themeImage('logo-circle.png')} alt="" />
      </Link>
      <Outlet />
      <footer className="auth-footer">
        <div>
          <Link to="/">← Voltar para o início</Link>
        </div>
        <div>
          <Link to="/agreement">Acordo</Link>
          <Link to="/terms">Termos</Link>
          <Link to="/privacy">Privacidade</Link>
        </div>
      </footer>
    </div>
  )
}
