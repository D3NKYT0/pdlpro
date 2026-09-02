import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function AdminHeader({ kicker, title, description }: { kicker: string; title: string; description?: string }) {
  return (
    <PageHeader className="account-hero" eyebrow={kicker} title={title} description={description} leading={
        <Link className="character-back" to="/painel/admin">
          <ArrowLeft aria-hidden="true" />
          Central
        </Link>
    } />
  )
}

export function AdminSaveBar({ saving, label = 'Salvar' }: { saving: boolean; label?: string }) {
  return (
    <Button type="submit" busy={saving} busyLabel="Salvando...">
      {label}
    </Button>
  )
}
