import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, staffApi, type ApiStaffService } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

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
      <form className="card admin-form" onSubmit={onSubmit}>
        {rows.map((row, index) => (
          <div className="admin-service-row" key={row.code}>
            <strong>{row.name}</strong>
            <span className="muted">{row.code}</span>
            <label className="field">
              Preço
              <input
                value={row.price}
                onChange={(event) => {
                  const next = [...rows]
                  next[index] = { ...row, price: event.target.value }
                  setRows(next)
                }}
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={row.active}
                onChange={(event) => {
                  const next = [...rows]
                  next[index] = { ...row, active: event.target.checked }
                  setRows(next)
                }}
              />
              Ativo
            </label>
          </div>
        ))}
        <AdminSaveBar saving={saving} />
      </form>
    </div>
  )
}
