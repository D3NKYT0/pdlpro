import { Card } from '../../components/ui/Card'
import { Pagination } from '../../components/ui/Pagination'
import { apiErrorMessage } from '../../lib/errors'
import { formatNumber, formatTime } from '../../lib/formatters'
import { ErrorNotice } from '../../components/ui/Feedback'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Star, Search, RefreshCw, Coins, Layers3, Users, Package, Database, ShieldCheck, ChartNoAxesCombined, History, Tags, MapPin, SlidersHorizontal, FileCode2, LockKeyhole, Camera, CalendarDays, GitCompareArrows, Plus, Pencil, Trash2, Save, X, Info, Eye, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { itemObservationApi as api, formatItemQuantity as qty, type ObservationAccess, type ObservationFilters, type ObservedItem, type ItemCategory, type ItemSnapshot, type ItemMetadata } from '../../services/api'
import { ItemIcon } from '../../components/ItemIcon'
import { AdminHeader } from './AdminChrome'
import { useAuth } from '../../contexts/AuthContext'
import './item-observation.css'

type Translate = (key: string, options?: Record<string, unknown>) => string

function useObservationKey() {
  const { user } = useAuth()
  return ['staff-item-observation', user?.id]
}
/** Rótulos vindos do catálogo do L2; o código bruto é o fallback quando não há tradução. */
const typeLabel = (t: Translate, code: string) => t(`itemWatch.types.${code}`, { defaultValue: code })
const locationLabel = (t: Translate, code: string) => t(`itemWatch.locations.${code}`, { defaultValue: code })
function useObservationFeedback() {
  const { t } = useTranslation('admin')
  const message = (error: unknown) => apiErrorMessage(error, t('itemWatch.genericError'))
  return { t: t as Translate, message, failed: (error: unknown) => { toast.error(message(error)) } }
}
function ItemIdentity({ row }: { row: ItemMetadata & { item_id: number; item_name: string } }) {
  const { t } = useTranslation('admin')
  return <div className="observation-item"><span className="observation-item-art"><ItemIcon itemId={row.item_id} name={row.item_name} size={36} /></span><div><strong>{row.item_name}</strong><div className="observation-item-meta"><span>#{row.item_id}</span>{row.catalog_found === false ? <span className="observation-missing">{t('itemWatch.outOfCatalog')}</span> : <>{row.item_type && <span>{typeLabel(t, row.item_type)}</span>}{row.grade && <b className={`observation-grade grade-${row.grade}`}>{row.grade}</b>}{row.tradeable === false && <span title={t('itemWatch.notTradeableTitle')} aria-label={t('itemWatch.notTradeable')}><LockKeyhole size={12} /></span>}</>}</div></div></div>
}
function Items({ rows, favorite, busy }: { rows: ObservedItem[]; favorite?: (row: ObservedItem) => void; busy?: boolean }) {
  const { t } = useTranslation('admin')
  return <div className="observation-table"><table><thead><tr>{favorite && <th className="observation-star-column"><Star size={14} aria-label={t('itemWatch.favoriteColumn')} /></th>}<th>{t('itemWatch.columnItem')}</th><th>{t('itemWatch.columnCategoryLocation')}</th><th className="observation-number">{t('itemWatch.columnQuantity')}</th><th className="observation-number">{t('itemWatch.columnInstances')}</th><th className="observation-number">{t('itemWatch.columnOwners')}</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.item_id}-${row.location ?? ''}`}>
    {favorite && <td><button className="observation-star" aria-label={t(row.is_favorite ? 'itemWatch.removeFavorite' : 'itemWatch.addFavorite', { name: row.item_name })} aria-pressed={!!row.is_favorite} disabled={busy} onClick={() => favorite(row)}><Star size={18} fill={row.is_favorite ? 'currentColor' : 'none'} /></button></td>}
    <td><ItemIdentity row={row} /></td><td><span className={`observation-category${row.category_name ? '' : ' is-empty'}`}>{row.category_name || t('itemWatch.noCategory')}</span>{row.location && <small>{locationLabel(t, row.location)}</small>}</td><td className="observation-number observation-quantity">{qty(row.quantity)}</td><td className="observation-number">{qty(row.instances)}</td><td className="observation-number">{qty(row.unique_owners)}</td>
  </tr>)}</tbody></table>{!rows.length && <div className="observation-empty"><Package size={30} /><strong>{t('itemWatch.emptyItemsTitle')}</strong><p>{t('itemWatch.emptyItemsText')}</p></div>}</div>
}

const initialFilters: ObservationFilters = { search: '', minimum: '', category: '', favorites: false, sort: 'quantity', page: 1 }
function Live() {
  const { t, failed } = useObservationFeedback()
  const KEY = useObservationKey()
  const client = useQueryClient()
  const [draft, setDraft] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const live = useQuery({ queryKey: [...KEY, 'live', filters], queryFn: () => api.live(filters), retry: false, staleTime: 15000 })
  const favorite = useMutation({ mutationFn: (row: ObservedItem) => api.favorite(row.item_id, !row.is_favorite), onSuccess: () => client.invalidateQueries({ queryKey: [...KEY, 'live'] }), onError: failed })
  const data = live.data
  return <Card className="observation-section">
    <div className="observation-heading"><div><span className="panel-eyebrow">{t('itemWatch.liveEyebrow')}</span><h2>{t('itemWatch.liveTitle')}</h2><p className="muted">{t('itemWatch.liveDescription')}</p></div><Button type="submit" disabled={live.isFetching} onClick={() => void live.refetch()}><RefreshCw size={15} className={live.isFetching ? 'observation-spin' : ''} />{live.isFetching ? t('itemWatch.refreshing') : t('itemWatch.refresh')}</Button></div>
    <ErrorNotice error={live.error} />
    {live.isPending && <div className="observation-loading" role="status"><RefreshCw className="observation-spin" size={22} /> {t('itemWatch.loadingLive')}</div>}
    {data && <><div className="observation-source"><span><Database size={14} />{data.source}</span><span><ShieldCheck size={14} /> {t('itemWatch.readOnly')}</span><span>{t('itemWatch.updatedAt', { time: formatTime(live.dataUpdatedAt) })}</span></div><div className="observation-totals">{[
      { label: t('itemWatch.totalQuantity'), value: data.totals.total_quantity, hint: t('itemWatch.totalQuantityHint'), Icon: Coins },
      { label: t('itemWatch.totalInstances'), value: data.totals.total_instances, hint: t('itemWatch.totalInstancesHint'), Icon: Layers3 },
      { label: t('itemWatch.totalCharacters'), value: data.totals.total_characters, hint: t('itemWatch.totalCharactersHint'), Icon: Users },
      { label: t('itemWatch.siteQuantity'), value: data.totals.site_quantity, hint: t('itemWatch.siteQuantityHint'), Icon: Package },
    ].map(({ label, value, hint, Icon }) => <article key={label}><div><span>{label}</span><Icon size={20} /></div><strong title={qty(value)}>{qty(value)}</strong><small>{hint}</small></article>)}</div>
      <div className="observation-locations" aria-label={t('itemWatch.locationTotals')}>{data.locations.map(row => <article key={row.location}><span><MapPin size={14} />{locationLabel(t, row.location)}</span><strong>{qty(row.quantity)}</strong><small>{t('itemWatch.locationDetail', { types: row.types, instances: qty(row.instances) })}</small></article>)}</div></>}
    <div className="observation-list-title"><div><h3><Package size={19} /> {t('itemWatch.catalogTitle')}</h3><p>{t('itemWatch.catalogDescription')}</p></div><span><FileCode2 size={14} /> {t('itemWatch.catalogMeta')}</span></div>
    <form className="observation-filters" onSubmit={event => { event.preventDefault(); setFilters({ ...draft, page: 1 }) }}>
      <Field className="observation-search">{t('itemWatch.searchLabel')}<span><Search size={16} /><input placeholder={t('itemWatch.searchPlaceholder')} value={draft.search} maxLength={100} onChange={e => setDraft({ ...draft, search: e.target.value })} /></span></Field>
      <Field>{t('itemWatch.minimumQuantity')}<input inputMode="numeric" pattern="[0-9]*" value={draft.minimum} onChange={e => setDraft({ ...draft, minimum: e.target.value })} /></Field>
      <Field>{t('itemWatch.category')}<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}><option value="">{t('itemWatch.allCategories')}</option>{data?.categories.map(row => <option key={row.id} value={row.name}>{row.name}</option>)}</select></Field>
      <Field>{t('itemWatch.sort')}<select value={draft.sort} onChange={e => setDraft({ ...draft, sort: e.target.value as ObservationFilters['sort'] })}><option value="quantity">{t('itemWatch.sortQuantity')}</option><option value="instances">{t('itemWatch.sortInstances')}</option><option value="unique_owners">{t('itemWatch.sortOwners')}</option><option value="name">{t('itemWatch.sortName')}</option></select></Field>
      <label className="observation-favorite-filter"><input type="checkbox" checked={draft.favorites} onChange={e => setDraft({ ...draft, favorites: e.target.checked })} /><Star size={15} /> {t('itemWatch.onlyFavorites')}</label><Button type="submit"><SlidersHorizontal size={15} /> {t('itemWatch.filter')}</Button><Button className="observation-reset" type="button" onClick={() => { setDraft(initialFilters); setFilters(initialFilters) }}>{t('itemWatch.clear')}</Button>
    </form>
    {data && <><div className="observation-results"><span><strong>{data.count}</strong> {t('itemWatch.resultsFound')}</span><span><Star size={13} /> {t('itemWatch.favoritesHint')}</span></div><Items rows={data.results} favorite={row => favorite.mutate(row)} busy={favorite.isPending} /><Pagination className="observation-actions observation-pagination" page={data.page} pages={data.pages} onChange={page => setFilters({ ...filters, page })} /></>}
  </Card>
}

function SnapshotDetail({ id }: { id: string }) {
  const { t } = useTranslation('admin')
  const KEY = useObservationKey()
  const [page, setPage] = useState(1)
  const detail = useQuery({ queryKey: [...KEY, 'detail', id, page], queryFn: () => api.detail(id, page), retry: false })
  return <section><h3>{t('itemWatch.snapshotDetailTitle')}</h3><ErrorNotice error={detail.error} />{detail.isPending && <p>{t('itemWatch.loading')}</p>}{detail.data && <><p>{detail.data.snapshot.snapshot_date} — {detail.data.snapshot.notes || t('itemWatch.noNotes')}</p><Items rows={detail.data.results} /><Pagination className="observation-actions observation-pagination" page={detail.data.page} pages={detail.data.pages} onChange={setPage} /></>}</section>
}
function Comparison({ before, after }: { before: ItemSnapshot; after: ItemSnapshot }) {
  const { t } = useTranslation('admin')
  const KEY = useObservationKey()
  const [page, setPage] = useState(1)
  const result = useQuery({ queryKey: [...KEY, 'compare', before.id, after.id, page], queryFn: () => api.compare(before.id, after.id, page), retry: false })
  return <section><h3>{t('itemWatch.comparisonTitle', { before: before.snapshot_date, after: after.snapshot_date })}</h3><p className="muted">{t('itemWatch.comparisonHint')}</p><ErrorNotice error={result.error} />{result.isPending && <p>{t('itemWatch.comparing')}</p>}{result.data && <><div className="observation-table"><table><thead><tr><th>{t('itemWatch.columnItemLocation')}</th><th>{t('itemWatch.columnBefore')}</th><th>{t('itemWatch.columnAfter')}</th><th>{t('itemWatch.columnDifference')}</th><th>{t('itemWatch.columnChange')}</th></tr></thead><tbody>{result.data.results.map(row => <tr key={`${row.item_id}-${row.location}`}><td><ItemIdentity row={row} /><small>{locationLabel(t as Translate, row.location)}</small></td><td className="observation-number">{qty(row.before)}</td><td className="observation-number">{qty(row.after)}</td><td className={`observation-number ${row.change.startsWith('-') ? 'observation-down' : 'observation-up'}`}>{qty(row.change)}</td><td>{row.percentage === null ? t('itemWatch.newEntry') : `${formatNumber(row.percentage, { maximumFractionDigits: 2 })}%`}</td></tr>)}</tbody></table>{!result.data.count && <p>{t('itemWatch.noChanges')}</p>}</div><Pagination className="observation-actions observation-pagination" page={result.data.page} pages={result.data.pages} onChange={setPage} /></>}</section>
}
export function Snapshots({ access }: { access: ObservationAccess }) {
  const { t, failed } = useObservationFeedback()
  const KEY = useObservationKey()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState('')
  const [before, setBefore] = useState<ItemSnapshot | null>(null)
  const [after, setAfter] = useState<ItemSnapshot | null>(null)
  const history = useQuery({ queryKey: [...KEY, 'snapshots', page], queryFn: () => api.snapshots(page), retry: false })
  const capture = useMutation({ mutationFn: () => api.capture(notes), onSuccess: row => { setSelected(row.id); setNotes(''); setPage(1); toast.success(t('itemWatch.captured')); void client.invalidateQueries({ queryKey: KEY }) }, onError: failed })
  const remove = useMutation({ mutationFn: api.removeSnapshot, onSuccess: (_, id) => { if (selected === id) setSelected(''); if (before?.id === id) setBefore(null); if (after?.id === id) setAfter(null); void client.invalidateQueries({ queryKey: KEY }) }, onError: failed })
  return <Card className="observation-section">
    <div className="observation-heading">
      <div><span className="panel-eyebrow">{t('itemWatch.historyEyebrow')}</span><h2>{t('itemWatch.historyTitle')}</h2><p className="muted">{t('itemWatch.historyDescription')}</p></div>
      <span className="observation-counter"><History size={16} />{history.data ? t('itemWatch.snapshotCount', { total: history.data.count }) : t('itemWatch.history')}</span>
    </div>
    {access.capture && <form className="observation-capture-box" onSubmit={e => { e.preventDefault(); capture.mutate() }}>
      <div className="observation-box-heading"><span className="observation-box-icon"><Camera size={22} /></span><div><h3>{t('itemWatch.captureTitle')}</h3><p>{t('itemWatch.captureDescription')}</p></div><span className="observation-safe"><ShieldCheck size={14} /> {t('itemWatch.readOnlyL2')}</span></div>
      <div className="observation-actions observation-capture-controls"><Field>{t('itemWatch.notes')} <input placeholder={t('itemWatch.notesPlaceholder')} value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)} /></Field><Button type="submit" disabled={capture.isPending}><Camera size={16} />{capture.isPending ? t('itemWatch.capturing') : t('itemWatch.capture')}</Button></div>
    </form>}
    <ErrorNotice error={history.error} />{history.isPending && <div className="observation-loading" role="status"><RefreshCw className="observation-spin" size={20} />{t('itemWatch.loadingHistory')}</div>}
    {history.data && (history.data.count > 0 ? <>
      <div className="observation-list-title"><h3><History size={18} /> {t('itemWatch.capturesTitle')}</h3><span>{t('itemWatch.capturesHint')}</span></div>
      <div className="observation-table"><table><thead><tr><th>{t('itemWatch.columnDateSource')}</th><th>{t('itemWatch.columnQuantities')}</th><th>{t('itemWatch.columnActions')}</th></tr></thead><tbody>{history.data.results.map(row => <tr key={row.id}>
        <td><strong className="observation-date"><CalendarDays size={15} />{row.snapshot_date.split('-').reverse().join('/')}</strong><small>{row.source}</small><small>{row.created_by || t('itemWatch.removedUser')}{row.notes ? ` · ${row.notes}` : ''}</small></td>
        <td className="observation-number"><strong>{qty(row.total_quantity)}</strong><small>{t('itemWatch.siteTotal', { value: qty(row.site_quantity) })}</small></td>
        <td><div className="observation-row-actions"><button className="observation-small-button" onClick={() => setSelected(row.id)}><Eye size={14} />{t('itemWatch.details')}</button><button className="observation-small-button" aria-pressed={before?.id === row.id} onClick={() => setBefore(row)}>{t('itemWatch.before')}</button><button className="observation-small-button" aria-pressed={after?.id === row.id} onClick={() => setAfter(row)}>{t('itemWatch.after')}</button>{access.delete_snapshots && <button className="observation-small-button observation-delete" aria-label={t('itemWatch.deleteSnapshot', { date: row.snapshot_date })} disabled={remove.isPending} onClick={() => { if (window.confirm(t('itemWatch.confirmDeleteSnapshot', { date: row.snapshot_date }))) remove.mutate(row.id) }}><Trash2 size={14} /></button>}</div></td>
      </tr>)}</tbody></table></div>
      {history.data.pages > 1 && <Pagination className="observation-actions observation-pagination" page={history.data.page} pages={history.data.pages} onChange={setPage} />}
    </> : <div className="observation-empty observation-empty-panel"><span className="observation-empty-icon"><History size={30} /></span><h3>{t('itemWatch.emptyHistoryTitle')}</h3><p>{access.capture ? t('itemWatch.emptyHistoryCapture') : t('itemWatch.emptyHistoryReadOnly')}</p><span className="observation-empty-hint"><CalendarDays size={14} /> {t('itemWatch.emptyHistoryHint')}</span></div>)}
    <div className="observation-compare-box">
      <div className="observation-box-heading"><GitCompareArrows size={20} /><div><h3>{t('itemWatch.compareTitle')}</h3><p>{t('itemWatch.compareDescription')}</p></div></div>
      <div className="observation-compare-slots">{[{ label: t('itemWatch.before'), value: before, clear: () => setBefore(null) }, { label: t('itemWatch.after'), value: after, clear: () => setAfter(null) }].map(({ label, value, clear }, index) => <div key={label} className={`observation-period${value ? ' is-selected' : ''}`}><span className="observation-period-step">0{index + 1}</span><div><small>{label}</small><strong>{value ? value.snapshot_date.split('-').reverse().join('/') : t('itemWatch.selectCapture')}</strong><p>{value?.source || t('itemWatch.clickToSelect', { label })}</p></div>{value && <button className="observation-small-button" onClick={clear} aria-label={t('itemWatch.clearSelection', { label })}><X size={14} /></button>}</div>)}</div>
    </div>
    {before && after && <Comparison key={`${before.id}-${after.id}`} before={before} after={after} />}
    {selected && <SnapshotDetail key={selected} id={selected} />}
  </Card>
}

export function Categories({ access }: { access: ObservationAccess }) {
  const { t, message } = useObservationFeedback()
  const KEY = useObservationKey()
  const client = useQueryClient()
  const empty = { name: '', description: '', ids: '', order: 0 }
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string>()
  const list = useQuery({ queryKey: [...KEY, 'categories'], queryFn: api.categories, retry: false })
  const save = useMutation({ mutationFn: async () => {
    const parts = form.ids.trim() ? form.ids.split(/[\s,;]+/).filter(Boolean) : []
    if (parts.some(id => !/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 2147483647) || new Set(parts.map(Number)).size !== parts.length || parts.length > 2000) throw { status: 400, message: t('itemWatch.invalidIds') }
    return api.saveCategory({ name: form.name, description: form.description, item_ids: parts.map(Number), order: form.order }, editing)
  }, onSuccess: () => { setEditing(undefined); setForm(empty); toast.success(t('itemWatch.categorySaved')); void client.invalidateQueries({ queryKey: KEY }) }, onError: error => { toast.error(error && typeof error === 'object' && 'message' in error ? String(error.message) : message(error)) } })
  const remove = useMutation({ mutationFn: api.removeCategory, onSuccess: (_, id) => { if (editing === id) { setEditing(undefined); setForm(empty) } void client.invalidateQueries({ queryKey: KEY }) }, onError: error => { toast.error(message(error)) } })
  const edit = (row: ItemCategory) => { setEditing(row.id); setForm({ name: row.name, description: row.description, ids: row.item_ids.join(', '), order: row.order }) }
  const canEditForm = editing ? access.change_categories : access.add_categories
  return <Card className="observation-section">
    <div className="observation-heading"><div><span className="panel-eyebrow">{t('itemWatch.categoriesEyebrow')}</span><h2>{t('itemWatch.categoriesTitle')}</h2><p className="muted">{t('itemWatch.categoriesDescription')}</p></div><span className="observation-counter"><Tags size={16} />{list.data ? t('itemWatch.categoryCount', { total: list.data.length }) : t('itemWatch.categories')}</span></div>
    <ErrorNotice error={list.error} />{list.isPending && <div className="observation-loading" role="status"><RefreshCw className="observation-spin" size={20} />{t('itemWatch.loadingCategories')}</div>}
    <div className={`observation-category-workspace${canEditForm ? '' : ' is-readonly'}`}>
      <div className="observation-category-collection">
        <div className="observation-list-title"><h3><FolderOpen size={18} /> {t('itemWatch.groupsTitle')}</h3></div>
        <div className="observation-category-list">{list.data?.map(row => <article className={editing === row.id ? 'is-editing' : ''} key={row.id}>
          <div className="observation-category-card-heading"><span className="observation-box-icon"><Tags size={20} /></span><div><h3>{row.name}</h3><small>{t('itemWatch.linkedItems', { total: row.item_ids.length })}</small></div><span className="observation-category">{t('itemWatch.order', { value: row.order })}</span></div>
          <p className="muted">{row.description || t('itemWatch.noDescription')}</p>
          <div className="observation-id-chips">{row.item_ids.slice(0, 12).map(id => <span key={id}><ItemIcon itemId={id} size={22} />#{id}</span>)}{row.item_ids.length > 12 && <span>{t('itemWatch.moreItems', { total: row.item_ids.length - 12 })}</span>}{!row.item_ids.length && <small>{t('itemWatch.noLinkedIds')}</small>}</div>
          <div className="observation-row-actions">{access.change_categories && <button className="observation-small-button" disabled={save.isPending} onClick={() => edit(row)}><Pencil size={14} />{t('itemWatch.edit')}</button>}{access.delete_categories && <button className="observation-small-button observation-delete" disabled={remove.isPending || save.isPending} onClick={() => { if (window.confirm(t('itemWatch.confirmDeleteCategory', { name: row.name }))) remove.mutate(row.id) }}><Trash2 size={14} />{t('itemWatch.delete')}</button>}</div>
        </article>)}</div>
        {list.data?.length === 0 && <div className="observation-empty observation-empty-panel"><span className="observation-empty-icon"><Tags size={30} /></span><h3>{t('itemWatch.emptyCategoriesTitle')}</h3><p>{access.add_categories ? t('itemWatch.emptyCategoriesCreate') : t('itemWatch.emptyCategoriesReadOnly')}</p><div className="observation-example-tags"><span>{t('itemWatch.exampleCoins')}</span><span>{t('itemWatch.exampleEquipment')}</span><span>{t('itemWatch.exampleMaterials')}</span></div></div>}
        <aside className="observation-info"><Info size={17} /><p>{t('itemWatch.categoriesInfo')}</p></aside>
      </div>
      {canEditForm && <form className="observation-category-editor" onSubmit={e => { e.preventDefault(); save.mutate() }}>
        <div className="observation-box-heading"><span className="observation-box-icon">{editing ? <Pencil size={20} /> : <Plus size={22} />}</span><div><h3>{editing ? t('itemWatch.editCategory') : t('itemWatch.newCategory')}</h3><p>{t('itemWatch.categoryEditorHint')}</p></div></div>
        <div className="observation-editor-grid">
          <Field>{t('itemWatch.categoryName')}<input placeholder={t('itemWatch.categoryNamePlaceholder')} required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field>{t('itemWatch.categoryOrder')}<input type="number" min={0} max={32767} required value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} /></Field>
          <Field className="observation-editor-full">{t('itemWatch.categoryDescription')} <textarea rows={2} placeholder={t('itemWatch.categoryDescriptionPlaceholder')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <Field className="observation-editor-full">{t('itemWatch.itemIds')}<textarea className="observation-ids-input" rows={4} placeholder="57, 4037, 6673" aria-describedby="observation-ids-help" value={form.ids} onChange={e => setForm({ ...form, ids: e.target.value })} /><small id="observation-ids-help">{t('itemWatch.itemIdsHelp')}</small></Field>
        </div>
        <div className="observation-editor-footer"><span><ShieldCheck size={14} /> {t('itemWatch.savedInPanel')}</span><div className="observation-actions">{editing && <button className="observation-small-button" disabled={save.isPending} type="button" onClick={() => { setEditing(undefined); setForm(empty) }}>{t('itemWatch.cancel')}</button>}<Button type="submit" disabled={save.isPending || remove.isPending}><Save size={15} />{save.isPending ? t('itemWatch.saving') : t('itemWatch.saveCategory')}</Button></div></div>
      </form>}
    </div>
  </Card>
}

export function AdminItemObservationPage() {
  const { t } = useTranslation('admin')
  const KEY = useObservationKey()
  const [tab, setTab] = useState('live')
  const access = useQuery({ queryKey: [...KEY, 'access'], queryFn: api.access, retry: false })
  return <div className="account-page item-observation"><div className="observation-hero"><AdminHeader kicker={t('itemWatch.kicker')} title={t('itemWatch.title')} description={t('itemWatch.description')} /><div className="observation-hero-mark" aria-hidden="true"><ChartNoAxesCombined size={44} /></div></div>
    {access.isPending && <p>{t('itemWatch.checkingAccess')}</p>}<ErrorNotice error={access.error} />{access.isError && <Button type="submit" onClick={() => void access.refetch()}>{t('itemWatch.retry')}</Button>}
    {access.data && <><nav className="observation-tabs" aria-label={t('itemWatch.tabsLabel')}>{[{ value: 'live', label: t('itemWatch.tabLive'), Icon: ChartNoAxesCombined }, { value: 'snapshots', label: t('itemWatch.tabSnapshots'), Icon: History }, { value: 'categories', label: t('itemWatch.tabCategories'), Icon: Tags }].map(({ value, label, Icon }) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}><Icon size={17} />{label}</button>)}</nav>{tab === 'live' ? <Live /> : tab === 'snapshots' ? <Snapshots access={access.data} /> : <Categories access={access.data} />}</>}
  </div>
}
