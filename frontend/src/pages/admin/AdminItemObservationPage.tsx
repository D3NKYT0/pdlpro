import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { isApiError } from '../../services/infra/http'
import { itemObservationApi as api, formatItemQuantity as qty, type ObservationAccess, type ObservationFilters, type ObservedItem, type ItemCategory, type ItemSnapshot } from '../../services/domain/itemObservation.service'
import { AdminHeader } from './AdminChrome'
import { useAuth } from '../../contexts/AuthContext'
import './item-observation.css'

function useObservationKey() {
  const { user } = useAuth()
  return ['staff-item-observation', user?.id]
}
const message = (error: unknown) => isApiError(error) ? error.message : 'Não foi possível concluir a operação.'
const failed = (error: unknown) => { toast.error(message(error)) }
function ErrorNotice({ error }: { error: unknown }) {
  return error ? <p className="observation-error" role="alert">{message(error)}</p> : null
}
function Pages({ page, pages, change }: { page: number; pages: number; change: (value: number) => void }) {
  return <nav className="observation-actions" aria-label="Paginação"><button className="btn" disabled={page <= 1} onClick={() => change(page - 1)}>Anterior</button><span>Página {page} de {pages}</span><button className="btn" disabled={page >= pages} onClick={() => change(page + 1)}>Próxima</button></nav>
}
function Items({ rows, favorite, busy }: { rows: ObservedItem[]; favorite?: (row: ObservedItem) => void; busy?: boolean }) {
  return <div className="observation-table"><table><thead><tr>{favorite && <th>Favorito</th>}<th>Item / ID</th><th>Categoria / local</th><th>Quantidade</th><th>Instâncias</th><th>Donos</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.item_id}-${row.location ?? ''}`}>
    {favorite && <td><button className="observation-star" aria-label={`${row.is_favorite ? 'Remover' : 'Adicionar'} favorito: ${row.item_name}`} aria-pressed={!!row.is_favorite} disabled={busy} onClick={() => favorite(row)}><Star size={18} fill={row.is_favorite ? 'currentColor' : 'none'} /></button></td>}
    <td>{row.item_name}<small>#{row.item_id}</small></td><td>{row.category_name || 'Sem categoria'}{row.location && <small>{row.location}</small>}</td><td>{qty(row.quantity)}</td><td>{qty(row.instances)}</td><td>{qty(row.unique_owners)}</td>
  </tr>)}</tbody></table>{!rows.length && <p className="muted">Nenhum item encontrado.</p>}</div>
}

const initialFilters: ObservationFilters = { search: '', minimum: '', category: '', favorites: false, sort: 'quantity', page: 1 }
function Live() {
  const KEY = useObservationKey()
  const client = useQueryClient()
  const [draft, setDraft] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const live = useQuery({ queryKey: [...KEY, 'live', filters], queryFn: () => api.live(filters), retry: false, staleTime: 15000 })
  const favorite = useMutation({ mutationFn: (row: ObservedItem) => api.favorite(row.item_id, !row.is_favorite), onSuccess: () => client.invalidateQueries({ queryKey: [...KEY, 'live'] }), onError: failed })
  const data = live.data
  return <section className="card observation-section">
    <div className="observation-actions"><h2>Itens ao vivo</h2><button className="btn" disabled={live.isFetching} onClick={() => void live.refetch()}>{live.isFetching ? 'Consultando…' : 'Atualizar'}</button></div>
    <p className="muted">Consulta somente leitura. Os filtros abaixo se aplicam à lista do jogo; os totais mostram o recorte completo.</p>
    <ErrorNotice error={live.error} />
    {data && <><p className="observation-source">Origem: {data.source}</p><div className="observation-totals">{Object.entries({ 'Quantidade no jogo': data.totals.total_quantity, 'Instâncias no jogo': data.totals.total_instances, 'Personagens': data.totals.total_characters, 'Quantidade no SITE': data.totals.site_quantity }).map(([label, value]) => <article key={label}><span>{label}</span><strong>{qty(value)}</strong></article>)}</div>
      <details><summary>Totais por localização</summary><div className="observation-table"><table><thead><tr><th>Local</th><th>Quantidade</th><th>Instâncias</th><th>Tipos</th></tr></thead><tbody>{data.locations.map(row => <tr key={row.location}><td>{row.location}</td><td>{qty(row.quantity)}</td><td>{qty(row.instances)}</td><td>{row.types}</td></tr>)}</tbody></table></div></details></>}
    <form className="observation-filters" onSubmit={event => { event.preventDefault(); setFilters({ ...draft, page: 1 }) }}>
      <label className="field">Nome ou ID<input value={draft.search} maxLength={100} onChange={e => setDraft({ ...draft, search: e.target.value })} /></label>
      <label className="field">Quantidade mínima<input inputMode="numeric" pattern="[0-9]*" value={draft.minimum} onChange={e => setDraft({ ...draft, minimum: e.target.value })} /></label>
      <label className="field">Categoria<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}><option value="">Todas</option>{data?.categories.map(row => <option key={row.id} value={row.name}>{row.name}</option>)}</select></label>
      <label className="field">Ordenação<select value={draft.sort} onChange={e => setDraft({ ...draft, sort: e.target.value as ObservationFilters['sort'] })}><option value="quantity">Quantidade</option><option value="instances">Instâncias</option><option value="unique_owners">Donos</option><option value="name">Nome</option></select></label>
      <label><input type="checkbox" checked={draft.favorites} onChange={e => setDraft({ ...draft, favorites: e.target.checked })} /> Só meus favoritos</label><button className="btn" type="submit">Filtrar</button>
    </form>
    {data && <><p className="muted">{data.count} tipos encontrados</p><Items rows={data.results} favorite={row => favorite.mutate(row)} busy={favorite.isPending} /><Pages page={data.page} pages={data.pages} change={page => setFilters({ ...filters, page })} /></>}
  </section>
}

function SnapshotDetail({ id }: { id: string }) {
  const KEY = useObservationKey()
  const [page, setPage] = useState(1)
  const detail = useQuery({ queryKey: [...KEY, 'detail', id, page], queryFn: () => api.detail(id, page), retry: false })
  return <section><h3>Detalhes do snapshot</h3><ErrorNotice error={detail.error} />{detail.isPending && <p>Carregando…</p>}{detail.data && <><p>{detail.data.snapshot.snapshot_date} — {detail.data.snapshot.notes || 'Sem observações'}</p><Items rows={detail.data.results} /><Pages page={detail.data.page} pages={detail.data.pages} change={setPage} /></>}</section>
}
function Comparison({ before, after }: { before: ItemSnapshot; after: ItemSnapshot }) {
  const KEY = useObservationKey()
  const [page, setPage] = useState(1)
  const result = useQuery({ queryKey: [...KEY, 'compare', before.id, after.id, page], queryFn: () => api.compare(before.id, after.id, page), retry: false })
  return <section><h3>Variação: {before.snapshot_date} → {after.snapshot_date}</h3><ErrorNotice error={result.error} />{result.isPending && <p>Comparando…</p>}{result.data && <><div className="observation-table"><table><thead><tr><th>Item / local</th><th>Antes</th><th>Depois</th><th>Diferença</th><th>Variação</th></tr></thead><tbody>{result.data.results.map(row => <tr key={`${row.item_id}-${row.location}`}><td>{row.item_name}<small>#{row.item_id} · {row.location}</small></td><td>{qty(row.before)}</td><td>{qty(row.after)}</td><td>{qty(row.change)}</td><td>{row.percentage === null ? 'Novo' : `${Number(row.percentage).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`}</td></tr>)}</tbody></table>{!result.data.count && <p>Nenhuma alteração entre essas datas.</p>}</div><Pages page={result.data.page} pages={result.data.pages} change={setPage} /></>}</section>
}
function Snapshots({ access }: { access: ObservationAccess }) {
  const KEY = useObservationKey()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState('')
  const [before, setBefore] = useState<ItemSnapshot | null>(null)
  const [after, setAfter] = useState<ItemSnapshot | null>(null)
  const history = useQuery({ queryKey: [...KEY, 'snapshots', page], queryFn: () => api.snapshots(page), retry: false })
  const capture = useMutation({ mutationFn: () => api.capture(notes), onSuccess: row => { setSelected(row.id); setNotes(''); setPage(1); toast.success('Snapshot capturado'); void client.invalidateQueries({ queryKey: KEY }) }, onError: failed })
  const remove = useMutation({ mutationFn: api.removeSnapshot, onSuccess: (_, id) => { if (selected === id) setSelected(''); if (before?.id === id) setBefore(null); if (after?.id === id) setAfter(null); void client.invalidateQueries({ queryKey: KEY }) }, onError: failed })
  return <section className="card observation-section"><h2>Histórico e comparação</h2><p className="muted">Uma captura por dia e origem. Salva no painel, sem modificar o banco L2. Compare duas datas da mesma origem.</p>
    {access.capture && <form className="observation-actions" onSubmit={e => { e.preventDefault(); capture.mutate() }}><label className="field">Observações<input value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)} /></label><button className="btn" disabled={capture.isPending}>{capture.isPending ? 'Capturando…' : 'Capturar snapshot'}</button></form>}
    <ErrorNotice error={history.error} />{history.isPending && <p>Carregando histórico…</p>}
    {history.data && <><div className="observation-table"><table><thead><tr><th>Data / origem</th><th>Jogo / SITE</th><th>Ações</th></tr></thead><tbody>{history.data.results.map(row => <tr key={row.id}><td>{row.snapshot_date}<small>{row.source}</small><small>{row.created_by || 'Usuário removido'}</small></td><td>{qty(row.total_quantity)}<small>SITE: {qty(row.site_quantity)}</small></td><td><div className="observation-actions"><button className="btn" onClick={() => setSelected(row.id)}>Detalhes</button><button className="btn" aria-pressed={before?.id === row.id} onClick={() => setBefore(row)}>Antes</button><button className="btn" aria-pressed={after?.id === row.id} onClick={() => setAfter(row)}>Depois</button>{access.delete_snapshots && <button className="btn" disabled={remove.isPending} onClick={() => { if (window.confirm(`Excluir permanentemente o snapshot de ${row.snapshot_date}?`)) remove.mutate(row.id) }}>Excluir</button>}</div></td></tr>)}</tbody></table>{!history.data.count && <p>Nenhum snapshot capturado.</p>}</div><Pages page={history.data.page} pages={history.data.pages} change={setPage} /></>}
    <p className="muted">Antes: {before?.snapshot_date || 'selecione no histórico'} · Depois: {after?.snapshot_date || 'selecione no histórico'}</p>
    {before && after && <Comparison key={`${before.id}-${after.id}`} before={before} after={after} />}
    {selected && <SnapshotDetail key={selected} id={selected} />}
  </section>
}

function Categories({ access }: { access: ObservationAccess }) {
  const KEY = useObservationKey()
  const client = useQueryClient()
  const empty = { name: '', description: '', ids: '', order: 0 }
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string>()
  const list = useQuery({ queryKey: [...KEY, 'categories'], queryFn: api.categories, retry: false })
  const save = useMutation({ mutationFn: async () => {
    const parts = form.ids.trim() ? form.ids.split(/[\s,;]+/).filter(Boolean) : []
    if (parts.some(id => !/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 2147483647) || new Set(parts.map(Number)).size !== parts.length || parts.length > 2000) throw { status: 400, message: 'Informe até 2.000 IDs inteiros positivos, sem repetição.' }
    return api.saveCategory({ name: form.name, description: form.description, item_ids: parts.map(Number), order: form.order }, editing)
  }, onSuccess: () => { setEditing(undefined); setForm(empty); toast.success('Categoria salva'); void client.invalidateQueries({ queryKey: KEY }) }, onError: error => { toast.error(error && typeof error === 'object' && 'message' in error ? String(error.message) : message(error)) } })
  const remove = useMutation({ mutationFn: api.removeCategory, onSuccess: (_, id) => { if (editing === id) { setEditing(undefined); setForm(empty) } void client.invalidateQueries({ queryKey: KEY }) }, onError: failed })
  const edit = (row: ItemCategory) => { setEditing(row.id); setForm({ name: row.name, description: row.description, ids: row.item_ids.join(', '), order: row.order }) }
  return <section className="card observation-section"><h2>Categorias de itens</h2><p className="muted">Agrupe IDs de itens. Quando um ID pertence a várias categorias, a primeira na ordem prevalece. Alterações não reescrevem o histórico.</p><ErrorNotice error={list.error} />{list.isPending && <p>Carregando categorias…</p>}
    <div className="observation-category-list">{list.data?.map(row => <article key={row.id}><strong>{row.name}</strong><p>{row.description}</p><small>Ordem {row.order} · IDs: {row.item_ids.join(', ') || 'Nenhum'}</small><div className="observation-actions">{access.change_categories && <button className="btn" onClick={() => edit(row)}>Editar</button>}{access.delete_categories && <button className="btn" disabled={remove.isPending || save.isPending} onClick={() => { if (window.confirm(`Excluir a categoria ${row.name}?`)) remove.mutate(row.id) }}>Excluir</button>}</div></article>)}</div>
    {list.data?.length === 0 && <p>Nenhuma categoria cadastrada.</p>}
    {(editing ? access.change_categories : access.add_categories) && <form className="observation-filters" onSubmit={e => { e.preventDefault(); save.mutate() }}><h3>{editing ? 'Editar categoria' : 'Nova categoria'}</h3><label className="field">Nome<input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label className="field">Descrição<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label><label className="field">Ordem<input type="number" min={0} max={32767} required value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} /></label><label className="field">IDs separados por vírgula<textarea value={form.ids} onChange={e => setForm({ ...form, ids: e.target.value })} /></label><button className="btn" disabled={save.isPending || remove.isPending}>{save.isPending ? 'Salvando…' : 'Salvar categoria'}</button>{editing && <button className="btn" type="button" onClick={() => { setEditing(undefined); setForm(empty) }}>Cancelar</button>}</form>}
  </section>
}

export function AdminItemObservationPage() {
  const KEY = useObservationKey()
  const [tab, setTab] = useState('live')
  const access = useQuery({ queryKey: [...KEY, 'access'], queryFn: api.access, retry: false })
  return <div className="account-page item-observation"><AdminHeader kicker="Servidor" title="Observar itens" description="Acompanhe a economia do servidor: itens, favoritos e evolução entre snapshots." />
    {access.isPending && <p>Verificando acesso…</p>}<ErrorNotice error={access.error} />{access.isError && <button className="btn" onClick={() => void access.refetch()}>Tentar novamente</button>}
    {access.data && <><nav className="observation-actions" aria-label="Seções de observação">{[['live', 'Ao vivo'], ['snapshots', 'Snapshots e comparação'], ['categories', 'Categorias']].map(([value, label]) => <button className="btn" key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</nav>{tab === 'live' ? <Live /> : tab === 'snapshots' ? <Snapshots access={access.data} /> : <Categories access={access.data} />}</>}
  </div>
}
