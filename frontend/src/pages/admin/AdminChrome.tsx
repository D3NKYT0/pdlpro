import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function AdminHeader({ kicker, title, description }: { kicker: string; title: string; description?: string }) {
  return (
    <header className="card account-hero">
      <div>
        <Link className="character-back" to="/painel/admin">
          <ArrowLeft aria-hidden="true" />
          Central
        </Link>
        <span className="panel-eyebrow">{kicker}</span>
        <h1>{title}</h1>
        {description ? <p className="muted">{description}</p> : null}
      </div>
    </header>
  )
}

export function AdminSaveBar({ saving, label = 'Salvar' }: { saving: boolean; label?: string }) {
  return (
    <button className="btn" type="submit" disabled={saving}>
      {saving ? 'Salvando...' : label}
    </button>
  )
}
