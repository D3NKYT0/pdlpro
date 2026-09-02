import { Card } from '../../components/ui/Card'
import { apiErrorMessage } from '../../lib/errors'
import { Field } from '../../components/ui/Field'
import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Gauge, LockKeyhole, ServerCog, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi } from '../../services/api'
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
      toast.error(apiErrorMessage(error, 'Não foi possível salvar'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker="Servidor" title="Painel e servidor" description="Nome, rates e aviso de coming soon exibidos no site." />
      <form className="admin-server-form" onSubmit={onSubmit}>
        <Card className="admin-config-section">
          <header><span><ServerCog /></span><div><span className="panel-eyebrow">Identidade</span><h2>Informações do servidor</h2><p>Dados principais exibidos na página inicial.</p></div></header>
          <div className="account-form-fields">
            <Field>Nome<input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field>Slogan<input value={slogan} onChange={(e) => setSlogan(e.target.value)} /></Field>
          </div>
          <Field>Descrição<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></Field>
          <div className="account-form-fields">
            <Field>Chronicle<input value={chronicle} onChange={(e) => setChronicle(e.target.value)} /></Field>
            <Field>Nível máximo<input type="number" min="1" value={maxLevel} onChange={(e) => setMaxLevel(e.target.value)} /></Field>
          </div>
        </Card>

        <div className="admin-server-columns">
          <Card className="admin-config-section">
            <header><span><Gauge /></span><div><span className="panel-eyebrow">Progressão</span><h2>Rates do servidor</h2><p>Multiplicadores de experiência e itens.</p></div></header>
            <div className="admin-server-rate-grid">
              <Field>XP<input value={xp} onChange={(e) => setXp(e.target.value)} /></Field>
              <Field>SP<input value={sp} onChange={(e) => setSp(e.target.value)} /></Field>
              <Field>Adena<input value={adena} onChange={(e) => setAdena(e.target.value)} /></Field>
              <Field>Drop<input value={drop} onChange={(e) => setDrop(e.target.value)} /></Field>
              <Field>Spoil<input value={spoil} onChange={(e) => setSpoil(e.target.value)} /></Field>
            </div>
          </Card>

          <Card className="admin-config-section">
            <header><span><Sparkles /></span><div><span className="panel-eyebrow">Equipamentos</span><h2>Encantamento</h2><p>Limites usados nas informações públicas.</p></div></header>
            <div className="account-form-fields">
              <Field>Enchant seguro<input value={safe} onChange={(e) => setSafe(e.target.value)} /></Field>
              <Field>Enchant máximo<input value={maxEnchant} onChange={(e) => setMaxEnchant(e.target.value)} /></Field>
            </div>
          </Card>
        </div>

        <Card className="admin-config-section">
          <header><span><FileText /></span><div><span className="panel-eyebrow">Conteúdo público</span><h2>Recursos e notas</h2><p>Textos complementares apresentados aos jogadores.</p></div></header>
          <Field>Recursos <small>Um recurso por linha</small><textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} /></Field>
          <div className="account-form-fields">
            <Field>Nota de PvP<textarea value={pvp} onChange={(e) => setPvp(e.target.value)} rows={3} /></Field>
            <Field>Nota inicial<textarea value={start} onChange={(e) => setStart(e.target.value)} rows={3} /></Field>
          </div>
        </Card>

        <Card className="admin-config-section admin-access-section">
          <header><span><LockKeyhole /></span><div><span className="panel-eyebrow">Controle de acesso</span><h2>Publicação do servidor</h2><p>Defina quem pode entrar enquanto o projeto está em preparação.</p></div></header>
          <div className="admin-toggle-list">
            <label className="admin-toggle">
              <input type="checkbox" checked={comingSoon} onChange={(e) => setComingSoon(e.target.checked)} />
              <span className="admin-toggle-control" aria-hidden="true"><i /></span>
              <span><strong>Ativar Coming Soon</strong><small>Exibe a página de lançamento para visitantes.</small></span>
              <b>{comingSoon ? 'Ativo' : 'Inativo'}</b>
            </label>
            <label className={`admin-toggle${!comingSoon ? ' is-disabled' : ''}`}>
              <input type="checkbox" checked={staffOnly} disabled={!comingSoon} onChange={(e) => setStaffOnly(e.target.checked)} />
              <span className="admin-toggle-control" aria-hidden="true"><i /></span>
              <span><strong>Permitir login apenas para staff</strong><small>Bloqueia jogadores comuns durante o Coming Soon.</small></span>
              <b>{staffOnly && comingSoon ? 'Ativo' : 'Inativo'}</b>
            </label>
          </div>
        </Card>

        <Card as="div" className="admin-server-actions"><span><strong>Configuração do servidor</strong><small>Revise os campos antes de publicar as alterações.</small></span><AdminSaveBar saving={saving} /></Card>
      </form>
    </div>
  )
}
