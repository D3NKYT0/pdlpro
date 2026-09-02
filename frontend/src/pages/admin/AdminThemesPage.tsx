import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, PackageOpen, Palette, ShieldCheck, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { Field } from '../../components/ui/Field'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { themeApi, type ApiTheme } from '../../services/api'
import { AdminHeader } from './AdminChrome'

export function AdminThemesPage() {
  const queryClient = useQueryClient()
  const themes = useQuery({ queryKey: ['staff-themes'], queryFn: themeApi.list })
  const action = useFeedbackAction()
  const [packageFile, setPackageFile] = useState<File | null>(null)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['staff-themes'] })
  }

  async function install(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!packageFile) return
    const input = event.currentTarget.elements.namedItem('package') as HTMLInputElement | null
    const result = await action.run(async () => {
      await themeApi.install(packageFile)
      await refresh()
    }, 'Não foi possível instalar o tema.')
    if (result.ok) {
      setPackageFile(null)
      if (input) input.value = ''
      toast.success('Tema validado e instalado')
    }
  }

  async function activate(theme: ApiTheme) {
    const result = await action.run(async () => {
      await themeApi.activate(theme)
      await refresh()
    }, 'Não foi possível ativar o tema.')
    if (result.ok) {
      toast.success(theme.builtin ? 'Tema default restaurado' : `${theme.name} ativado`)
      window.dispatchEvent(new Event('pdl-theme-refresh'))
    }
  }

  async function remove(theme: ApiTheme) {
    if (!window.confirm(`Remover ${theme.name} ${theme.version}?`)) return
    const result = await action.run(async () => {
      await themeApi.remove(theme)
      await refresh()
    }, 'Não foi possível remover o tema.')
    if (result.ok) toast.success('Pacote removido')
  }

  return (
    <div className="account-page theme-admin-page">
      <AdminHeader kicker="Aparência" title="Temas do PDL" description="Instale pacotes validados e aplique uma identidade visual em todo o frontend." />

      <Card className="admin-config-section theme-installer">
        <header>
          <span><Upload aria-hidden="true" /></span>
          <div><span className="panel-eyebrow">Pacote PDL 2.0</span><h2>Instalar tema</h2><p>O ZIP aceita CSS, imagens e fontes locais; scripts e templates executáveis são bloqueados.</p></div>
        </header>
        <form onSubmit={install}>
          <Field label="Arquivo do tema" hint="Use um .zip compatível com o schema PDL 2.0, com até 32 MB.">
            <input name="package" type="file" accept=".zip,application/zip" required disabled={action.pending} onChange={(event) => setPackageFile(event.target.files?.[0] ?? null)} />
          </Field>
          <Button type="submit" busy={action.pending} busyLabel="Validando e instalando…" disabled={!packageFile}>
            <PackageOpen aria-hidden="true" /> Instalar pacote
          </Button>
        </form>
        <p className="theme-security-note"><ShieldCheck aria-hidden="true" /> Instalação e ativação são exclusivas de superadministradores e preservam o tema default.</p>
      </Card>

      <section aria-labelledby="installed-themes-title">
        <div className="account-section-heading theme-list-heading">
          <div><span className="panel-eyebrow">Catálogo</span><h2 id="installed-themes-title">Temas disponíveis</h2></div>
          <span>{themes.data?.length ?? 0} temas</span>
        </div>
        {themes.isPending && <LoadingState>Carregando temas…</LoadingState>}
        {themes.isError && <ErrorNotice error={themes.error} onRetry={() => void themes.refetch()} />}
        {themes.data && <div className="theme-package-grid">
          {themes.data.map((theme) => <Card as="article" className={`theme-package${theme.active ? ' is-active' : ''}`} key={theme.package_id ?? 'default'}>
            <div className="theme-package-icon"><Palette aria-hidden="true" /></div>
            <div className="theme-package-copy">
              <span className="panel-eyebrow">{theme.builtin ? 'Protegido · interno' : `${theme.id} · v${theme.version}`}</span>
              <h3>{theme.name}</h3>
              <p>{theme.description || 'Pacote visual para o PDL 2.0.'}</p>
              <small>por {theme.author || 'Autor não informado'}</small>
            </div>
            <div className="theme-package-actions">
              {theme.active ? <span className="theme-active-badge"><Check aria-hidden="true" /> Ativo</span> : <Button size="sm" busy={action.pending} onClick={() => void activate(theme)}>Ativar</Button>}
              {!theme.builtin && !theme.active && <Button size="sm" variant="danger" busy={action.pending} onClick={() => void remove(theme)}><Trash2 aria-hidden="true" /> Remover</Button>}
            </div>
          </Card>)}
        </div>}
      </section>
    </div>
  )
}
