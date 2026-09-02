import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, Search, RefreshCw, Coins, Layers3, Users, Package, Database, ShieldCheck, ChartNoAxesCombined, History, Tags, ArrowLeft, ArrowRight, MapPin, SlidersHorizontal, FileCode2, LockKeyhole, Camera, CalendarDays, GitCompareArrows, Plus, Pencil, Trash2, Save, X, Info, Eye, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { isApiError } from '../../services/infra/http'
import { itemObservationApi as api, formatItemQuantity as qty, type ObservationAccess, type ObservationFilters, type ObservedItem, type ItemCategory, type ItemSnapshot, type ItemMetadata } from '../../services/domain/itemObservation.service'
import { ItemIcon } from '../../components/ItemIcon'
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
  return <nav className="observation-actions observation-pagination" aria-label="Paginação"><span>Página <strong>{page}</strong> de {pages}</span><button className="btn" disabled={page <= 1} onClick={() => change(page - 1)}><ArrowLeft size={15} /> Anterior</button><button className="btn" disabled={page >= pages} onClick={() => change(page + 1)}>Próxima <ArrowRight size={15} /></button></nav>
}
const types: Record<string, string> = { WEAPON: 'Arma', SHIELD: 'Escudo', HELMET: 'Elmo', ARMOR: 'Armadura', PANTS: 'Calça', BOOTS: 'Botas', GLOVES: 'Luvas', NECKLACE: 'Colar', EARRING: 'Brinco', RING: 'Anel', HAIR: 'Acessório', FACE: 'Máscara', UNDERWEAR: 'Roupa íntima', FORMAL: 'Traje', PET: 'Pet', COMUM: 'Comum' }
const locations: Record<string, string> = { INVENTORY: 'Inventário', PAPERDOLL: 'Equipados', WAREHOUSE: 'Armazém', CLANWH: 'Armazém do clã', SITE: 'Painel / SITE' }
function ItemIdentity({ row }: { row: ItemMetadata & { item_id: number; item_name: string } }) {
  return <div className="observation-item"><span className="observation-item-art"><ItemIcon itemId={row.item_id} name={row.item_name} size={36} /></span><div><strong>{row.item_name}</strong><div className="observation-item-meta"><span>#{row.item_id}</span>{row.catalog_found === false ? <span className="observation-missing">Sem XML</span> : <>{row.item_type && <span>{types[row.item_type] || row.item_type}</span>}{row.grade && <b className={`observation-grade grade-${row.grade}`}>{row.grade}</b>}{row.tradeable === false && <span title="Não negociável segundo o XML" aria-label="Não negociável"><LockKeyhole size={12} /></span>}</>}</div></div></div>
}
function Items({ rows, favorite, busy }: { rows: ObservedItem[]; favorite?: (row: ObservedItem) => void; busy?: boolean }) {
  return <div className="observation-table"><table><thead><tr>{favorite && <th className="observation-star-column"><Star size={14} aria-label="Favorito" /></th>}<th>Item / catálogo XML</th><th>Categoria / local</th><th className="observation-number">Quantidade</th><th className="observation-number">Instâncias</th><th className="observation-number">Donos</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.item_id}-${row.location ?? ''}`}>
    {favorite && <td><button className="observation-star" aria-label={`${row.is_favorite ? 'Remover' : 'Adicionar'} favorito: ${row.item_name}`} aria-pressed={!!row.is_favorite} disabled={busy} onClick={() => favorite(row)}><Star size={18} fill={row.is_favorite ? 'currentColor' : 'none'} /></button></td>}
    <td><ItemIdentity row={row} /></td><td><span className={`observation-category${row.category_name ? '' : ' is-empty'}`}>{row.category_name || 'Sem categoria'}</span>{row.location && <small>{locations[row.location] || row.location}</small>}</td><td className="observation-number observation-quantity">{qty(row.quantity)}</td><td className="observation-number">{qty(row.instances)}</td><td className="observation-number">{qty(row.unique_owners)}</td>
  </tr>)}</tbody></table>{!rows.length && <div className="observation-empty"><Package size={30} /><strong>Nenhum item encontrado</strong><p>Experimente outro nome, ID ou remova os filtros.</p></div>}</div>
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
    <div className="observation-heading"><div><span className="panel-eyebrow">Monitor da economia</span><h2>Visão geral do servidor</h2><p className="muted">Totais do jogo e do painel, com consulta somente leitura.</p></div><button className="btn" disabled={live.isFetching} onClick={() => void live.refetch()}><RefreshCw size={15} className={live.isFetching ? 'observation-spin' : ''} />{live.isFetching ? 'Consultando…' : 'Atualizar dados'}</button></div>
    <ErrorNotice error={live.error} />
    {live.isPending && <div className="observation-loading" role="status"><RefreshCw className="observation-spin" size={22} /> Consultando os itens do servidor…</div>}
    {data && <><div className="observation-source"><span><Database size={14} />{data.source}</span><span><ShieldCheck size={14} /> Somente leitura</span><span>Atualizado às {new Date(live.dataUpdatedAt).toLocaleTimeString('pt-BR')}</span></div><div className="observation-totals">{[
      { label: 'Quantidade no jogo', value: data.totals.total_quantity, hint: 'Soma de unidades no L2', Icon: Coins },
      { label: 'Instâncias no jogo', value: data.totals.total_instances, hint: 'Registros / stacks de itens', Icon: Layers3 },
      { label: 'Personagens', value: data.totals.total_characters, hint: 'Personagens com accesslevel 0', Icon: Users },
      { label: 'Quantidade no SITE', value: data.totals.site_quantity, hint: 'Inventário separado do painel', Icon: Package },
    ].map(({ label, value, hint, Icon }) => <article key={label}><div><span>{label}</span><Icon size={20} /></div><strong title={qty(value)}>{qty(value)}</strong><small>{hint}</small></article>)}</div>
      <div className="observation-locations" aria-label="Totais por localização">{data.locations.map(row => <article key={row.location}><span><MapPin size={14} />{locations[row.location] || row.location}</span><strong>{qty(row.quantity)}</strong><small>{row.types} tipos · {qty(row.instances)} instâncias</small></article>)}</div></>}
    <div className="observation-list-title"><div><h3><Package size={19} /> Catálogo em circulação</h3><p>Filtre os itens do jogo sem alterar os totais acima.</p></div><span><FileCode2 size={14} /> Metadados do XML atual</span></div>
    <form className="observation-filters" onSubmit={event => { event.preventDefault(); setFilters({ ...draft, page: 1 }) }}>
      <label className="field observation-search">Nome ou ID<span><Search size={16} /><input placeholder="Buscar Adena, arma ou #ID…" value={draft.search} maxLength={100} onChange={e => setDraft({ ...draft, search: e.target.value })} /></span></label>
      <label className="field">Quantidade mínima<input inputMode="numeric" pattern="[0-9]*" value={draft.minimum} onChange={e => setDraft({ ...draft, minimum: e.target.value })} /></label>
      <label className="field">Categoria<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}><option value="">Todas</option>{data?.categories.map(row => <option key={row.id} value={row.name}>{row.name}</option>)}</select></label>
      <label className="field">Ordenação<select value={draft.sort} onChange={e => setDraft({ ...draft, sort: e.target.value as ObservationFilters['sort'] })}><option value="quantity">Quantidade</option><option value="instances">Instâncias</option><option value="unique_owners">Donos</option><option value="name">Nome</option></select></label>
      <label className="observation-favorite-filter"><input type="checkbox" checked={draft.favorites} onChange={e => setDraft({ ...draft, favorites: e.target.checked })} /><Star size={15} /> Só favoritos</label><button className="btn" type="submit"><SlidersHorizontal size={15} /> Filtrar</button><button className="btn observation-reset" type="button" onClick={() => { setDraft(initialFilters); setFilters(initialFilters) }}>Limpar</button>
    </form>
    {data && <><div className="observation-results"><span><strong>{data.count}</strong> tipos encontrados</span><span><Star size={13} /> Seus favoritos ficam salvos por servidor</span></div><Items rows={data.results} favorite={row => favorite.mutate(row)} busy={favorite.isPending} /><Pages page={data.page} pages={data.pages} change={page => setFilters({ ...filters, page })} /></>}
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
  return <section><h3>Variação: {before.snapshot_date} → {after.snapshot_date}</h3><p className="muted">Nomes e quantidades preservados no histórico; grau e tipo consultados no XML atual.</p><ErrorNotice error={result.error} />{result.isPending && <p>Comparando…</p>}{result.data && <><div className="observation-table"><table><thead><tr><th>Item / local</th><th>Antes</th><th>Depois</th><th>Diferença</th><th>Variação</th></tr></thead><tbody>{result.data.results.map(row => <tr key={`${row.item_id}-${row.location}`}><td><ItemIdentity row={row} /><small>{locations[row.location] || row.location}</small></td><td className="observation-number">{qty(row.before)}</td><td className="observation-number">{qty(row.after)}</td><td className={`observation-number ${row.change.startsWith('-') ? 'observation-down' : 'observation-up'}`}>{qty(row.change)}</td><td>{row.percentage === null ? 'Novo' : `${Number(row.percentage).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`}</td></tr>)}</tbody></table>{!result.data.count && <p>Nenhuma alteração entre essas datas.</p>}</div><Pages page={result.data.page} pages={result.data.pages} change={setPage} /></>}</section>
}
export function Snapshots({ access }: { access: ObservationAccess }) {
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
  return <section className="card observation-section">
    <div className="observation-heading">
      <div><span className="panel-eyebrow">Linha do tempo da economia</span><h2>Histórico e comparação</h2><p className="muted">Registre o estado dos itens e acompanhe o que mudou entre duas datas.</p></div>
      <span className="observation-counter"><History size={16} />{history.data ? `${history.data.count} snapshots` : 'Histórico'}</span>
    </div>
    {access.capture && <form className="observation-capture-box" onSubmit={e => { e.preventDefault(); capture.mutate() }}>
      <div className="observation-box-heading"><span className="observation-box-icon"><Camera size={22} /></span><div><h3>Registrar o momento atual</h3><p>Uma captura por dia e origem, salva apenas no banco do painel.</p></div><span className="observation-safe"><ShieldCheck size={14} /> L2 somente leitura</span></div>
      <div className="observation-actions observation-capture-controls"><label className="field">Observações <input placeholder="Ex.: antes do evento de fim de semana" value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)} /></label><button className="btn" disabled={capture.isPending}><Camera size={16} />{capture.isPending ? 'Capturando…' : 'Capturar snapshot'}</button></div>
    </form>}
    <ErrorNotice error={history.error} />{history.isPending && <div className="observation-loading" role="status"><RefreshCw className="observation-spin" size={20} />Carregando histórico…</div>}
    {history.data && (history.data.count > 0 ? <>
      <div className="observation-list-title"><h3><History size={18} /> Capturas registradas</h3><span>Selecione “Antes” e “Depois” para comparar</span></div>
      <div className="observation-table"><table><thead><tr><th>Data / origem</th><th>Quantidade no jogo / SITE</th><th>Ações</th></tr></thead><tbody>{history.data.results.map(row => <tr key={row.id}>
        <td><strong className="observation-date"><CalendarDays size={15} />{row.snapshot_date.split('-').reverse().join('/')}</strong><small>{row.source}</small><small>{row.created_by || 'Usuário removido'}{row.notes ? ` · ${row.notes}` : ''}</small></td>
        <td className="observation-number"><strong>{qty(row.total_quantity)}</strong><small>SITE: {qty(row.site_quantity)}</small></td>
        <td><div className="observation-row-actions"><button className="observation-small-button" onClick={() => setSelected(row.id)}><Eye size={14} />Detalhes</button><button className="observation-small-button" aria-pressed={before?.id === row.id} onClick={() => setBefore(row)}>Antes</button><button className="observation-small-button" aria-pressed={after?.id === row.id} onClick={() => setAfter(row)}>Depois</button>{access.delete_snapshots && <button className="observation-small-button observation-delete" aria-label={`Excluir snapshot de ${row.snapshot_date}`} disabled={remove.isPending} onClick={() => { if (window.confirm(`Excluir permanentemente o snapshot de ${row.snapshot_date}?`)) remove.mutate(row.id) }}><Trash2 size={14} /></button>}</div></td>
      </tr>)}</tbody></table></div>
      {history.data.pages > 1 && <Pages page={history.data.page} pages={history.data.pages} change={setPage} />}
    </> : <div className="observation-empty observation-empty-panel"><span className="observation-empty-icon"><History size={30} /></span><h3>Sua economia ainda não tem histórico</h3><p>{access.capture ? 'Use “Capturar snapshot” acima para registrar o primeiro ponto de comparação.' : 'Peça a um administrador autorizado para registrar o primeiro snapshot.'}</p><span className="observation-empty-hint"><CalendarDays size={14} /> Uma nova captura em outra data permite acompanhar a evolução.</span></div>)}
    <div className="observation-compare-box">
      <div className="observation-box-heading"><GitCompareArrows size={20} /><div><h3>Comparar períodos</h3><p>Escolha duas capturas da mesma origem, da mais antiga para a mais recente.</p></div></div>
      <div className="observation-compare-slots">{[{ label: 'Antes', value: before, clear: () => setBefore(null) }, { label: 'Depois', value: after, clear: () => setAfter(null) }].map(({ label, value, clear }, index) => <div key={label} className={`observation-period${value ? ' is-selected' : ''}`}><span className="observation-period-step">0{index + 1}</span><div><small>{label}</small><strong>{value ? value.snapshot_date.split('-').reverse().join('/') : 'Selecione uma captura'}</strong><p>{value?.source || `Clique em “${label}” no histórico acima`}</p></div>{value && <button className="observation-small-button" onClick={clear} aria-label={`Limpar seleção ${label}`}><X size={14} /></button>}</div>)}</div>
    </div>
    {before && after && <Comparison key={`${before.id}-${after.id}`} before={before} after={after} />}
    {selected && <SnapshotDetail key={selected} id={selected} />}
  </section>
}

export function Categories({ access }: { access: ObservationAccess }) {
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
  const canEditForm = editing ? access.change_categories : access.add_categories
  return <section className="card observation-section">
    <div className="observation-heading"><div><span className="panel-eyebrow">Organização do catálogo</span><h2>Categorias de itens</h2><p className="muted">Crie grupos para encontrar e acompanhar os itens que importam.</p></div><span className="observation-counter"><Tags size={16} />{list.data ? `${list.data.length} categorias` : 'Categorias'}</span></div>
    <ErrorNotice error={list.error} />{list.isPending && <div className="observation-loading" role="status"><RefreshCw className="observation-spin" size={20} />Carregando categorias…</div>}
    <div className={`observation-category-workspace${canEditForm ? '' : ' is-readonly'}`}>
      <div className="observation-category-collection">
        <div className="observation-list-title"><h3><FolderOpen size={18} /> Seus grupos de itens</h3></div>
        <div className="observation-category-list">{list.data?.map(row => <article className={editing === row.id ? 'is-editing' : ''} key={row.id}>
          <div className="observation-category-card-heading"><span className="observation-box-icon"><Tags size={20} /></span><div><h3>{row.name}</h3><small>{row.item_ids.length} itens vinculados</small></div><span className="observation-category">Ordem {row.order}</span></div>
          <p className="muted">{row.description || 'Sem descrição'}</p>
          <div className="observation-id-chips">{row.item_ids.slice(0, 12).map(id => <span key={id}><ItemIcon itemId={id} size={22} />#{id}</span>)}{row.item_ids.length > 12 && <span>+{row.item_ids.length - 12} itens</span>}{!row.item_ids.length && <small>Nenhum ID vinculado ainda</small>}</div>
          <div className="observation-row-actions">{access.change_categories && <button className="observation-small-button" disabled={save.isPending} onClick={() => edit(row)}><Pencil size={14} />Editar</button>}{access.delete_categories && <button className="observation-small-button observation-delete" disabled={remove.isPending || save.isPending} onClick={() => { if (window.confirm(`Excluir a categoria ${row.name}?`)) remove.mutate(row.id) }}><Trash2 size={14} />Excluir</button>}</div>
        </article>)}</div>
        {list.data?.length === 0 && <div className="observation-empty observation-empty-panel"><span className="observation-empty-icon"><Tags size={30} /></span><h3>Dê forma ao seu catálogo</h3><p>{access.add_categories ? 'Crie seu primeiro grupo: moedas, equipamentos ou materiais, por exemplo.' : 'As categorias aparecerão aqui quando forem cadastradas por um administrador.'}</p><div className="observation-example-tags"><span>Moedas</span><span>Equipamentos</span><span>Materiais</span></div></div>}
        <aside className="observation-info"><Info size={17} /><p>Se um item estiver em vários grupos, vale o primeiro na ordem. O histórico já capturado permanece intacto.</p></aside>
      </div>
      {canEditForm && <form className="observation-category-editor" onSubmit={e => { e.preventDefault(); save.mutate() }}>
        <div className="observation-box-heading"><span className="observation-box-icon">{editing ? <Pencil size={20} /> : <Plus size={22} />}</span><div><h3>{editing ? 'Editar categoria' : 'Nova categoria'}</h3><p>Defina o grupo e os IDs que fazem parte dele.</p></div></div>
        <div className="observation-editor-grid">
          <label className="field">Nome<input placeholder="Ex.: Moedas do servidor" required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field">Ordem<input type="number" min={0} max={32767} required value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} /></label>
          <label className="field observation-editor-full">Descrição <textarea rows={2} placeholder="O que este grupo reúne? (opcional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
          <label className="field observation-editor-full">IDs dos itens<textarea className="observation-ids-input" rows={4} placeholder="57, 4037, 6673" aria-describedby="observation-ids-help" value={form.ids} onChange={e => setForm({ ...form, ids: e.target.value })} /><small id="observation-ids-help">Separe por vírgula, espaço ou quebra de linha. Até 2.000 IDs, sem repetição.</small></label>
        </div>
        <div className="observation-editor-footer"><span><ShieldCheck size={14} /> Salvo apenas no painel</span><div className="observation-actions">{editing && <button className="observation-small-button" disabled={save.isPending} type="button" onClick={() => { setEditing(undefined); setForm(empty) }}>Cancelar</button>}<button className="btn" disabled={save.isPending || remove.isPending}><Save size={15} />{save.isPending ? 'Salvando…' : 'Salvar categoria'}</button></div></div>
      </form>}
    </div>
  </section>
}

export function AdminItemObservationPage() {
  const KEY = useObservationKey()
  const [tab, setTab] = useState('live')
  const access = useQuery({ queryKey: [...KEY, 'access'], queryFn: api.access, retry: false })
  return <div className="account-page item-observation"><div className="observation-hero"><AdminHeader kicker="Inteligência do servidor" title="Observar itens" description="Itens, inventários e evolução da economia em um só lugar." /><div className="observation-hero-mark" aria-hidden="true"><ChartNoAxesCombined size={44} /></div></div>
    {access.isPending && <p>Verificando acesso…</p>}<ErrorNotice error={access.error} />{access.isError && <button className="btn" onClick={() => void access.refetch()}>Tentar novamente</button>}
    {access.data && <><nav className="observation-tabs" aria-label="Seções de observação">{[{ value: 'live', label: 'Ao vivo', Icon: ChartNoAxesCombined }, { value: 'snapshots', label: 'Snapshots e comparação', Icon: History }, { value: 'categories', label: 'Categorias', Icon: Tags }].map(({ value, label, Icon }) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}><Icon size={17} />{label}</button>)}</nav>{tab === 'live' ? <Live /> : tab === 'snapshots' ? <Snapshots access={access.data} /> : <Categories access={access.data} />}</>}
  </div>
}
