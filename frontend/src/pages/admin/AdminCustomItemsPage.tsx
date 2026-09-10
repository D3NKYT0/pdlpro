import { Card } from '../../components/ui/Card'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ImagePlus, PackagePlus, Search, Pencil, Save, Plus, ShieldCheck, Info, Power, FileJson } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminHeader } from './AdminChrome'
import { useAuth } from '../../contexts/AuthContext'
import { customItemsApi as api, isApiError, ITEM_CATALOG_KEY, type CustomItem } from '../../services/api'
import './custom-items.css'

const empty = { item_id: '', name: '', category: 'COMUM', grade: 'NG', tradeable: true, active: true, metadata: '{}' }
function errorText(error: unknown, fallback: string) {
  if (isApiError(error)) {
    const details = Object.entries(error.details || {}).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · ')
    return details || error.message
  }
  return error instanceof Error ? error.message : fallback
}
export function AdminCustomItemsPage() {
  const { t } = useTranslation('admin')
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
  const message = (error: unknown) => errorText(error, t('customItems.genericError'))
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
    try { metadata = JSON.parse(form.metadata) } catch { throw new Error(t('customItems.invalidJson')) }
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error(t('customItems.objectRequired'))
    if (!editing && !file) throw new Error(t('customItems.imageRequired'))
    return api.save({ ...form, metadata: metadata as Record<string, unknown>, image: file }, editing?.id)
  }, onSuccess: () => { toast.success(editing ? t('customItems.updated') : t('customItems.created')); reset(); void Promise.all([client.invalidateQueries({ queryKey: ['staff-custom-items'] }), client.invalidateQueries({ queryKey: ITEM_CATALOG_KEY })]) } })
  const activate = useMutation({ mutationFn: (row: CustomItem) => api.activate(row.id, !row.active), onSuccess: row => {
    if (editing?.id === row.id) edit(row)
    toast.success(row.active ? t('customItems.activated') : t('customItems.deactivated'))
    void Promise.all([client.invalidateQueries({ queryKey: ['staff-custom-items'] }), client.invalidateQueries({ queryKey: ITEM_CATALOG_KEY })])
  }, onError: error => toast.error(message(error)) })
  const canEdit = editing ? list.data?.permissions.change : list.data?.permissions.add
  const busy = save.isPending || activate.isPending
  return <div className="account-page custom-items-page">
    <AdminHeader kicker={t('customItems.kicker')} title={t('customItems.title')} description={t('customItems.description')} />
    <div className="custom-items-notice"><ShieldCheck size={19} /><p>{t('customItems.notice')}</p></div>
    <div className="custom-items-layout">
      <Card className="custom-items-list">
        <header><div><span className="panel-eyebrow">{t('customItems.listEyebrow')}</span><h2>{t('customItems.listTitle')}</h2></div><span className="custom-count">{t('customItems.listCount', { total: list.data?.count ?? '—' })}</span></header>
        <form className="custom-search" onSubmit={e => { e.preventDefault(); setFilter(search); setPage(1) }}><label><Search size={16} /><input aria-label={t('customItems.searchLabel')} placeholder={t('customItems.searchPlaceholder')} value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /></label><Button type="submit" >{t('customItems.search')}</Button></form>
        {list.isPending && <p className="muted" role="status">{t('customItems.loading')}</p>}
        {list.isError && <div role="alert" className="custom-error">{message(list.error)} <button type="button" onClick={() => void list.refetch()}>{t('customItems.retry')}</button></div>}
        {list.data?.results.length === 0 && <div className="custom-empty"><PackagePlus size={34} /><h3>{filter ? t('customItems.emptyFilteredTitle') : t('customItems.emptyTitle')}</h3><p>{filter ? t('customItems.emptyFilteredText') : t('customItems.emptyText')}</p></div>}
        <div className="custom-item-cards">{list.data?.results.map(row => <article key={row.id} className={editing?.id === row.id ? 'is-selected' : ''}>
          <div className="custom-card-heading">{row.icon_url && <img src={row.icon_url} alt={row.name} width={48} height={48} />}<div><strong>{row.name}</strong><small>{t('customItems.cardMeta', { id: row.item_id, category: list.data.categories.find(type => type.value === row.category)?.label || row.category, grade: row.grade })}</small></div><span className={`custom-status${row.active ? ' active' : ''}`}>{row.active ? t('customItems.active') : t('customItems.inactive')}</span></div>
          {row.conflicts_with_xml && <p className="custom-error">{t('customItems.conflict')}</p>}
          <div className="custom-card-footer"><small>{t('customItems.cardFooter', { tradeable: row.tradeable ? t('customItems.tradeable') : t('customItems.notTradeable'), total: Object.keys(row.metadata).length })}</small>{list.data.permissions.change && <div><button type="button" disabled={busy} onClick={() => { save.reset(); edit(row) }}><Pencil size={14} />{t('customItems.edit')}</button><button type="button" disabled={busy} onClick={() => activate.mutate(row)}><Power size={14} />{row.active ? t('customItems.deactivate') : t('customItems.activate')}</button></div>}</div>
        </article>)}</div>
        {list.data && list.data.pages > 1 && <Pagination className="custom-pagination" page={list.data.page} pages={list.data.pages} onChange={setPage} busy={list.isFetching} />}
      </Card>
      {canEdit ? <form className="card custom-item-editor" onSubmit={e => { e.preventDefault(); save.mutate() }}>
        <header><span className="custom-editor-icon">{editing ? <Pencil size={22} /> : <Plus size={24} />}</span><div><span className="panel-eyebrow">{editing ? t('customItems.editorEditEyebrow') : t('customItems.editorNewEyebrow')}</span><h2>{editing ? editing.name : t('customItems.editorNewTitle')}</h2></div></header>
        <fieldset disabled={busy}>
          <label className="custom-upload"><span className="custom-preview">{preview || editing?.icon_url ? <img src={preview || editing?.icon_url || ''} alt={t('customItems.imagePreviewAlt')} /> : <ImagePlus size={32} />}</span><span><strong>{editing ? t('customItems.updateImage') : t('customItems.itemImage')}</strong><small>{t('customItems.imageHint')}</small><input key={fileKey} type="file" accept="image/png,image/jpeg,image/webp" required={!editing} onChange={e => {
            const next = e.target.files?.[0] ?? null
            if (next && next.size > 2 * 1024 * 1024) { toast.error(t('customItems.imageTooLarge')); e.target.value = ''; setFile(null); return }
            setFile(next)
          }} /></span></label>
          <div className="custom-fields"><Field>{t('customItems.gameId')}<input type="number" min={1} max={2147483647} required readOnly={!!editing} value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} /><small>{editing ? t('customItems.gameIdLockedHint') : t('customItems.gameIdHint')}</small></Field><Field>{t('customItems.name')}<input required maxLength={255} placeholder={t('customItems.namePlaceholder')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field>{t('customItems.type')}<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{list.data?.categories.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field><Field>{t('customItems.grade')}<select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>{list.data?.grades.map(grade => <option key={grade.value} value={grade.value}>{grade.label}</option>)}</select></Field></div>
          <div className="custom-switches"><label><input type="checkbox" checked={form.tradeable} onChange={e => setForm({ ...form, tradeable: e.target.checked })} />{t('customItems.tradeable')}</label><label><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />{t('customItems.availableInCatalog')}</label></div>
          <Field className="custom-json"><span><FileJson size={15} /> {t('customItems.metadata')}</span><textarea rows={5} value={form.metadata} spellCheck={false} onChange={e => setForm({ ...form, metadata: e.target.value })} /><small>{t('customItems.metadataHint')}</small></Field>
        </fieldset>
        {save.isError && <p role="alert" className="custom-error">{message(save.error)}</p>}
        <footer><span><Info size={14} /> {t('customItems.footerNote')}</span><div>{editing && <button type="button" className="custom-cancel" disabled={busy} onClick={() => { reset(); save.reset() }}>{t('customItems.cancel')}</button>}<Button type="submit" disabled={busy}><Save size={16} />{save.isPending ? t('customItems.saving') : editing ? t('customItems.saveChanges') : t('customItems.createItem')}</Button></div></footer>
      </form> : list.data && <Card as="aside" className="custom-empty"><PackagePlus size={32} /><p>{list.data.permissions.change ? t('customItems.readonlySelect') : t('customItems.readonlyOnly')}</p></Card>}
    </div>
  </div>
}
