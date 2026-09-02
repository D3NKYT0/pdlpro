import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, PackagePlus, Search, Pencil, Save, Plus, ShieldCheck, Info, Power, FileJson } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminHeader } from './AdminChrome'
import { useAuth } from '../../contexts/AuthContext'
import { customItemsApi as api, type CustomItem } from '../../services/domain/customItems.service'
import { isApiError } from '../../services/infra/http'
import './custom-items.css'

const empty = { item_id: '', name: '', category: 'COMUM', grade: 'NG', tradeable: true, active: true, metadata: '{}' }
function errorText(error: unknown) {
  if (isApiError(error)) {
    const details = Object.entries(error.details || {}).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · ')
    return details || error.message
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
}
export function AdminCustomItemsPage() {
  const { user } = useAuth()
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<CustomItem | null>(null)
  const [form, setForm] = useState(empty)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [fileKey, setFileKey] = useState(0)
  const list = useQuery({ queryKey: ['staff-custom-items', user?.id, filter, page], queryFn: () => api.list(filter, page), retry: false })
  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const reset = () => { setEditing(null); setForm(empty); setFile(null); setFileKey(key => key + 1) }
  const edit = (row: CustomItem) => {
    setEditing(row); setForm({ ...row, item_id: String(row.item_id), metadata: JSON.stringify(row.metadata, null, 2) })
    setFile(null); setFileKey(key => key + 1)
  }
  const save = useMutation({ mutationFn: () => {
    let metadata: unknown
    try { metadata = JSON.parse(form.metadata) } catch { throw new Error('Os metadados precisam ser um JSON válido.') }
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('Use um objeto JSON nos metadados, como {"raridade": "raro"}.')
    if (!editing && !file) throw new Error('Selecione uma imagem para cadastrar o item.')
    return api.save({ ...form, metadata: metadata as Record<string, unknown>, image: file }, editing?.id)
  }, onSuccess: () => { toast.success(editing ? 'Item atualizado no catálogo' : 'Item adicionado ao catálogo'); reset(); void client.invalidateQueries() } })
  const activate = useMutation({ mutationFn: (row: CustomItem) => api.activate(row.id, !row.active), onSuccess: row => {
    if (editing?.id === row.id) edit(row)
    toast.success(row.active ? 'Item ativado' : 'Item desativado, dados preservados')
    void client.invalidateQueries()
  }, onError: error => toast.error(errorText(error)) })
  const canEdit = editing ? list.data?.permissions.change : list.data?.permissions.add
  const busy = save.isPending || activate.isPending
  return <div className="account-page custom-items-page">
    <AdminHeader kicker="Catálogo único" title="Itens customizados" description="Novos itens com identidade própria, integrados ao catálogo utilizado em todo o painel." />
    <div className="custom-items-notice"><ShieldCheck size={19} /><p>Dados no banco do PDL e imagens em media. Este cadastro não cria itens no servidor L2; o mesmo ID precisa estar configurado no jogo.</p></div>
    <div className="custom-items-layout">
      <section className="card custom-items-list">
        <header><div><span className="panel-eyebrow">Seus itens</span><h2>Catálogo custom</h2></div><span className="custom-count">{list.data?.count ?? '—'} itens</span></header>
        <form className="custom-search" onSubmit={e => { e.preventDefault(); setFilter(search); setPage(1) }}><label><Search size={16} /><input aria-label="Buscar custom por nome ou ID" placeholder="Nome ou ID do item" value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /></label><button className="btn">Buscar</button></form>
        {list.isPending && <p className="muted" role="status">Carregando itens…</p>}
        {list.isError && <div role="alert" className="custom-error">{errorText(list.error)} <button type="button" onClick={() => void list.refetch()}>Tentar novamente</button></div>}
        {list.data?.results.length === 0 && <div className="custom-empty"><PackagePlus size={34} /><h3>{filter ? 'Nenhum item encontrado' : 'Seu próximo item começa aqui'}</h3><p>{filter ? 'Tente outro nome ou ID.' : 'Cadastre nome, ID, imagem e metadados. O novo item aparecerá nas buscas do painel.'}</p></div>}
        <div className="custom-item-cards">{list.data?.results.map(row => <article key={row.id} className={editing?.id === row.id ? 'is-selected' : ''}>
          <div className="custom-card-heading">{row.icon_url && <img src={row.icon_url} alt={row.name} width={48} height={48} />}<div><strong>{row.name}</strong><small>#{row.item_id} · {list.data.categories.find(type => type.value === row.category)?.label || row.category} · {row.grade}</small></div><span className={`custom-status${row.active ? ' active' : ''}`}>{row.active ? 'Ativo' : 'Inativo'}</span></div>
          {row.conflicts_with_xml && <p className="custom-error">Este ID também existe no XML. O XML tem prioridade no catálogo.</p>}
          <div className="custom-card-footer"><small>{row.tradeable ? 'Negociável' : 'Não negociável'} · {Object.keys(row.metadata).length} metadados extras</small>{list.data.permissions.change && <div><button type="button" disabled={busy} onClick={() => { save.reset(); edit(row) }}><Pencil size={14} />Editar</button><button type="button" disabled={busy} onClick={() => activate.mutate(row)}><Power size={14} />{row.active ? 'Desativar' : 'Ativar'}</button></div>}</div>
        </article>)}</div>
        {list.data && list.data.pages > 1 && <nav className="custom-pagination"><button className="btn" disabled={list.data.page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span>{list.data.page} / {list.data.pages}</span><button className="btn" disabled={list.data.page >= list.data.pages} onClick={() => setPage(value => value + 1)}>Próxima</button></nav>}
      </section>
      {canEdit ? <form className="card custom-item-editor" onSubmit={e => { e.preventDefault(); save.mutate() }}>
        <header><span className="custom-editor-icon">{editing ? <Pencil size={22} /> : <Plus size={24} />}</span><div><span className="panel-eyebrow">{editing ? 'Editar cadastro' : 'Adicionar ao catálogo'}</span><h2>{editing ? editing.name : 'Novo item custom'}</h2></div></header>
        <fieldset disabled={busy}>
          <label className="custom-upload"><span className="custom-preview">{preview || editing?.icon_url ? <img src={preview || editing?.icon_url || ''} alt="Prévia do item" /> : <ImagePlus size={32} />}</span><span><strong>{editing ? 'Atualizar imagem' : 'Imagem do item'}</strong><small>PNG, JPEG ou WebP · até 2 MB · até 1024 × 1024</small><input key={fileKey} type="file" accept="image/png,image/jpeg,image/webp" required={!editing} onChange={e => {
            const next = e.target.files?.[0] ?? null
            if (next && next.size > 2 * 1024 * 1024) { toast.error('A imagem deve ter até 2 MB.'); e.target.value = ''; setFile(null); return }
            setFile(next)
          }} /></span></label>
          <div className="custom-fields"><label className="field">ID no jogo<input type="number" min={1} max={2147483647} required readOnly={!!editing} value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} /><small>{editing ? 'O ID é permanente para preservar referências.' : 'Use um ID livre, ainda ausente no XML.'}</small></label><label className="field">Nome<input required maxLength={255} placeholder="Ex.: Medalha do Imperador" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field">Tipo<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{list.data?.categories.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label className="field">Grau<select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>{list.data?.grades.map(grade => <option key={grade.value} value={grade.value}>{grade.label}</option>)}</select></label></div>
          <div className="custom-switches"><label><input type="checkbox" checked={form.tradeable} onChange={e => setForm({ ...form, tradeable: e.target.checked })} />Negociável</label><label><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Disponível no catálogo</label></div>
          <label className="field custom-json"><span><FileJson size={15} /> Metadados adicionais (JSON)</span><textarea rows={5} value={form.metadata} spellCheck={false} onChange={e => setForm({ ...form, metadata: e.target.value })} /><small>Ex.: {JSON.stringify({ raridade: 'raro', descricao: 'Moeda do evento' })}. Até 16 KB. Estes dados são públicos: não inclua senhas ou segredos.</small></label>
        </fieldset>
        {save.isError && <p role="alert" className="custom-error">{errorText(save.error)}</p>}
        <footer><span><Info size={14} /> Desativar preserva o cadastro e a imagem.</span><div>{editing && <button type="button" className="custom-cancel" disabled={busy} onClick={() => { reset(); save.reset() }}>Cancelar</button>}<button className="btn" disabled={busy}><Save size={16} />{save.isPending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar item'}</button></div></footer>
      </form> : list.data && <aside className="card custom-empty"><PackagePlus size={32} /><p>{list.data.permissions.change ? 'Selecione um item para editar.' : 'Seu acesso permite apenas consultar os itens customizados.'}</p></aside>}
    </div>
  </div>
}
