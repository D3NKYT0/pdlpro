import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, MapPinOff, PencilLine, Settings2, VenusAndMars } from 'lucide-react'
import toast from 'react-hot-toast'
import { isApiError, staffApi, type ApiStaffService } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const SERVICE_META = {
  CHANGE_NICKNAME: { Icon: PencilLine, description: 'Permite alterar o nome de um personagem.' },
  CHANGE_SEX: { Icon: VenusAndMars, description: 'Altera o sexo e a aparência-base do personagem.' },
  LINK_SLOT: { Icon: Link2, description: 'Libera um novo espaço para vincular uma conta.' },
  UNSTUCK: { Icon: MapPinOff, description: 'Move um personagem travado para uma posição segura.' },
}

export function AdminServicesPage() {
  const queryClient = useQueryClient()
  const services = useQuery({ queryKey: ['staff-services'], queryFn: staffApi.services })
  const [rows, setRows] = useState<ApiStaffService[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (services.data) setRows(services.data)
  }, [services.data])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await staffApi.saveServices(rows)
      toast.success('Preços atualizados')
      await queryClient.invalidateQueries({ queryKey: ['staff-services'] })
      await queryClient.invalidateQueries({ queryKey: ['service-prices'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker="Servidor" title="Serviços" description="Preços cobrados na ficha do personagem." />
      <form className="admin-services-form" onSubmit={onSubmit}>
        <section className="card admin-services-panel">
          <header className="admin-services-heading">
            <span><Settings2 /></span>
            <div><span className="panel-eyebrow">Catálogo de ações</span><h2>Serviços do personagem</h2><p>Defina disponibilidade e valor cobrado em moedas da carteira.</p></div>
            <div className="admin-services-summary"><strong>{rows.filter((row) => row.active).length}</strong><small>ativos de {rows.length}</small></div>
          </header>

          <div className="admin-service-grid">
            {rows.map((row, index) => {
              const meta = SERVICE_META[row.code as keyof typeof SERVICE_META] ?? { Icon: Settings2, description: 'Serviço configurável do personagem.' }
              const Icon = meta.Icon
              return (
                <article className={`admin-service-card${row.active ? ' is-active' : ' is-inactive'}`} key={row.code}>
                  <header><span><Icon /></span><div><h3>{row.name}</h3><code>{row.code}</code></div><b>{row.active ? 'Ativo' : 'Inativo'}</b></header>
                  <p>{meta.description}</p>
                  <div className="admin-service-controls">
                    <label className="field admin-service-price">
                      Preço
                      <span><b>R$</b><input type="number" min="0" step="0.01" value={row.price} onChange={(event) => {
                        const next = [...rows]
                        next[index] = { ...row, price: event.target.value }
                        setRows(next)
                      }} /></span>
                    </label>
                    <label className="admin-service-switch">
                      <input type="checkbox" checked={row.active} onChange={(event) => {
                        const next = [...rows]
                        next[index] = { ...row, active: event.target.checked }
                        setRows(next)
                      }} />
                      <span className="admin-toggle-control" aria-hidden="true"><i /></span>
                      <span>Disponível</span>
                    </label>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <div className="card admin-server-actions"><span><strong>Preços e disponibilidade</strong><small>As alterações passam a valer imediatamente após salvar.</small></span><AdminSaveBar saving={saving} /></div>
      </form>
    </div>
  )
}
