import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, staffApi } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

export function AdminServerPage() {
  const queryClient = useQueryClient()
  const panel = useQuery({ queryKey: ['staff-panel'], queryFn: staffApi.panel })
  const [name, setName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [description, setDescription] = useState('')
  const [chronicle, setChronicle] = useState('')
  const [xp, setXp] = useState('x1')
  const [sp, setSp] = useState('x1')
  const [adena, setAdena] = useState('x1')
  const [drop, setDrop] = useState('x1')
  const [spoil, setSpoil] = useState('x1')
  const [safe, setSafe] = useState('+3')
  const [maxEnchant, setMaxEnchant] = useState('+16')
  const [maxLevel, setMaxLevel] = useState('80')
  const [features, setFeatures] = useState('')
  const [pvp, setPvp] = useState('')
  const [start, setStart] = useState('')
  const [comingSoon, setComingSoon] = useState(false)
  const [staffOnly, setStaffOnly] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const data = panel.data
    if (!data) return
    setName(data.name)
    setSlogan(data.slogan)
    setDescription(data.description)
    setChronicle(data.chronicle)
    setXp(data.rates.xp || 'x1')
    setSp(data.rates.sp || 'x1')
    setAdena(data.rates.adena || 'x1')
    setDrop(data.rates.drop || 'x1')
    setSpoil(data.rates.spoil || 'x1')
    setSafe(data.enchant.safe || '+3')
    setMaxEnchant(data.enchant.max || '+16')
    setMaxLevel(String(data.max_level))
    setFeatures((data.features ?? []).join('\n'))
    setPvp(data.notes.pvp || '')
    setStart(data.notes.start || '')
    setComingSoon(data.coming_soon)
    setStaffOnly(data.staff_only_login)
  }, [panel.data])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await staffApi.savePanel({
        name,
        slogan,
        description,
        chronicle,
        rates: { xp, sp, adena, drop, spoil },
        enchant: { safe, max: maxEnchant },
        max_level: Number(maxLevel),
        features: features.split('\n').map((line) => line.trim()).filter(Boolean),
        notes: { pvp, start },
        coming_soon: comingSoon,
        staff_only_login: staffOnly,
      })
      toast.success('Configuração do servidor salva')
      await queryClient.invalidateQueries({ queryKey: ['staff-panel'] })
      await queryClient.invalidateQueries({ queryKey: ['server-info'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker="Servidor" title="Painel e servidor" description="Nome, rates e aviso de coming soon exibidos no site." />
      <form className="card admin-form" onSubmit={onSubmit}>
        <div className="account-form-fields">
          <label className="field">Nome<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field">Slogan<input value={slogan} onChange={(e) => setSlogan(e.target.value)} /></label>
        </div>
        <label className="field">Descrição<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></label>
        <div className="account-form-fields">
          <label className="field">Chronicle<input value={chronicle} onChange={(e) => setChronicle(e.target.value)} /></label>
          <label className="field">Nível máximo<input value={maxLevel} onChange={(e) => setMaxLevel(e.target.value)} /></label>
        </div>
        <div className="admin-rate-grid">
          <label className="field">XP<input value={xp} onChange={(e) => setXp(e.target.value)} /></label>
          <label className="field">SP<input value={sp} onChange={(e) => setSp(e.target.value)} /></label>
          <label className="field">Adena<input value={adena} onChange={(e) => setAdena(e.target.value)} /></label>
          <label className="field">Drop<input value={drop} onChange={(e) => setDrop(e.target.value)} /></label>
          <label className="field">Spoil<input value={spoil} onChange={(e) => setSpoil(e.target.value)} /></label>
          <label className="field">Enchant safe<input value={safe} onChange={(e) => setSafe(e.target.value)} /></label>
          <label className="field">Enchant máx.<input value={maxEnchant} onChange={(e) => setMaxEnchant(e.target.value)} /></label>
        </div>
        <label className="field">Recursos (um por linha)<textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} /></label>
        <label className="field">Nota de PvP<textarea value={pvp} onChange={(e) => setPvp(e.target.value)} rows={2} /></label>
        <label className="field">Nota inicial<textarea value={start} onChange={(e) => setStart(e.target.value)} rows={2} /></label>
        <label className="admin-check">
          <input type="checkbox" checked={comingSoon} onChange={(e) => setComingSoon(e.target.checked)} />
          Ativar Coming Soon
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={staffOnly} onChange={(e) => setStaffOnly(e.target.checked)} />
          Login só para staff enquanto o Coming Soon estiver ativo
        </label>
        <AdminSaveBar saving={saving} />
      </form>
    </div>
  )
}
