import { useState } from 'react'
import { Backpack, MapPin, Plus, RotateCcw, Shield, Sparkles, Swords, Trash2 } from 'lucide-react'
import { CharacterAvatar } from './CharacterAvatar'
import { ItemIcon } from '../ItemIcon'
import { EmptyState } from '../ui/Feedback'
import { formatNumber } from '../../lib/formatters'
import './character-creation.css'
import { useTranslation } from 'react-i18next'
import { PAPERDOLL_SLOTS } from './CharacterPaperdoll'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import type { ApiCharacterCreation, ApiCharacterStart } from '../../services/api'

export const defaultCharacterCreation = (): ApiCharacterCreation => ({
  default: { level: 1, xp: '0', sp: '0', title: '', x: 83400, y: 147940, z: -3404, items: [] }, classes: {},
})
const classes = [0, 10, 18, 25, 31, 38, 44, 49, 53]

/** Edita o padrão geral e snapshots completos por classe inicial. */
export function CharacterCreationSettings({ value, onChange, disabled, maxLevel }: {
  value: ApiCharacterCreation; onChange: (value: ApiCharacterCreation) => void; disabled: boolean; maxLevel: number
}) {
  const { t } = useTranslation('admin')
  const { t: panelT } = useTranslation('panel')
  const slots = Array.from({ length: 32 }, (_, id) => {
    const slot = PAPERDOLL_SLOTS.find(slot => slot.slotIds.includes(id))
    return { value: String(id), label: slot ? `${panelT(`character.slots.${slot.labelKey}`)} (${id})` : String(id) }
  })
  const [selected, setSelected] = useState('default')
  const [previewSex, setPreviewSex] = useState<0 | 1>(0)
  const override = selected !== 'default' && Boolean(value.classes[selected])
  const profile = value.classes[selected] ?? value.default
  const update = (patch: Partial<ApiCharacterStart>) => {
    const next = { ...profile, ...patch }
    onChange(selected === 'default' ? { ...value, default: next } : { ...value, classes: { ...value.classes, [selected]: next } })
  }
  const profileName = selected === 'default' ? t('characterCreation.general') : t(`characterCreation.classes.${selected}`)
  const equipped = profile.items.filter(item => item.slot !== null).length
  const status = selected === 'default' ? 'generalStatus' : override ? 'customStatus' : 'inheritedStatus'
  return <Card className="admin-config-section cc-workshop" data-theme-part="character-creation">
    <div className="cc-heading">
      <div className="cc-heading-icon"><Sparkles aria-hidden="true" /></div>
      <div><span className="panel-eyebrow">{t('characterCreation.title')}</span><h2>{t('characterCreation.editorTitle')}</h2></div>
      <span className="cc-badge">{t('characterCreation.overrideCount', { count: Object.keys(value.classes).length })}</span>
    </div>
    <div className="cc-layout">
      <div className="cc-editor">
        <div className="cc-profile-picker">
          <Field label={t('characterCreation.profile')}>
            <Select aria-label={t('characterCreation.profile')} value={selected} disabled={disabled} onChange={setSelected}
              options={[{ value: 'default', label: t('characterCreation.general') }, ...classes.map(id => ({ value: String(id), label: t(`characterCreation.classes.${id}`) }))]} />
          </Field>
          {selected !== 'default' && <div className="cc-inheritance">
            <p className="muted">{t(override ? 'characterCreation.custom' : 'characterCreation.inherited')}</p>
            {override && <Button size="sm" variant="secondary" disabled={disabled} onClick={() => {
              const next = { ...value.classes }; delete next[selected]; onChange({ ...value, classes: next })
            }}><RotateCcw aria-hidden="true" />{t('characterCreation.reset')}</Button>}
          </div>}
        </div>
        <div key={selected} className="cc-profile-body">
          <section className="cc-block" aria-label={t('characterCreation.attributes')}>
            <div className="cc-block-heading"><Swords aria-hidden="true" /><h3>{t('characterCreation.attributes')}</h3><span>01</span></div>
            <div className="account-form-fields cc-attributes">
              <Field label={t('characterCreation.level')}><input disabled={disabled} type="number" required min={1} max={maxLevel} value={profile.level} onChange={e => update({ level: Number(e.target.value) })} /></Field>
              <Field label={t('characterCreation.xp')}><input disabled={disabled} inputMode="numeric" required pattern="[0-9]+" value={profile.xp} onChange={e => update({ xp: e.target.value })} /></Field>
              <Field label={t('characterCreation.sp')}><input disabled={disabled} inputMode="numeric" required pattern="[0-9]+" value={profile.sp} onChange={e => update({ sp: e.target.value })} /></Field>
              <Field label={t('characterCreation.characterTitle')}><input disabled={disabled} maxLength={16} value={profile.title} onChange={e => update({ title: e.target.value })} /></Field>
            </div>
            <p className="cc-hint muted">{t('characterCreation.xpHint')}</p>
          </section>
          <section className="cc-block" aria-label={t('characterCreation.spawn')}>
            <div className="cc-block-heading"><MapPin aria-hidden="true" /><h3>{t('characterCreation.spawn')}</h3><span>02</span></div>
            <div className="account-form-fields cc-coordinates">
              {(['x', 'y', 'z'] as const).map(axis => <Field key={axis} label={t(`characterCreation.${axis}`)}><input disabled={disabled} type="number" required min={-2147483648} max={2147483647} value={profile[axis]} onChange={e => update({ [axis]: Number(e.target.value) })} /></Field>)}
            </div>
          </section>
          <section className="cc-block cc-kit" aria-label={t('characterCreation.items')}>
            <div className="cc-block-heading"><Backpack aria-hidden="true" /><h3>{t('characterCreation.items')}</h3><span>{formatNumber(profile.items.length)} / 100</span></div>
            <p className="cc-hint muted">{t('characterCreation.itemsHint')}</p>
            {profile.items.length === 0 && <EmptyState icon={<Backpack size={32} aria-hidden="true" />} className="cc-empty">{t('characterCreation.empty')}</EmptyState>}
            <div className="cc-item-list">
              {profile.items.map((item, index) => <div key={index} role="group" className="cc-item" aria-label={t('characterCreation.itemRow', { number: index + 1 })}>
                <div className="cc-item-heading">
                  <ItemIcon itemId={item.item_id} name={t('characterCreation.itemLabel', { id: item.item_id })} size={36} />
                  <div><strong>{t('characterCreation.itemLabel', { id: item.item_id })}</strong><small className="muted">{t(item.slot === null ? 'characterCreation.inventoryStatus' : 'characterCreation.equippedStatus')}</small></div>
                  <Button size="sm" variant="danger" disabled={disabled} onClick={() => update({ items: profile.items.filter((_, i) => i !== index) })}><Trash2 aria-hidden="true" />{t('characterCreation.remove')}</Button>
                </div>
                <div className="account-form-fields cc-item-fields">
                  <Field label={t('characterCreation.itemId')}><input disabled={disabled} type="number" required min={1} max={2147483647} value={item.item_id} onChange={e => update({ items: profile.items.map((it, i) => i === index ? { ...it, item_id: Number(e.target.value) } : it) })} /></Field>
                  <Field label={t('characterCreation.quantity')}><input disabled={disabled} type="number" required min={1} max={item.slot === null ? 2147483647 : 1} value={item.quantity} onChange={e => update({ items: profile.items.map((it, i) => i === index ? { ...it, quantity: Number(e.target.value) } : it) })} /></Field>
                  <Field label={t('characterCreation.enchant')}><input disabled={disabled} type="number" required min={0} max={65535} value={item.enchant} onChange={e => update({ items: profile.items.map((it, i) => i === index ? { ...it, enchant: Number(e.target.value) } : it) })} /></Field>
                  <Field label={t('characterCreation.slot')}><Select aria-label={t('characterCreation.slot')} disabled={disabled} value={item.slot === null ? '' : String(item.slot)} options={[{ value: '', label: t('characterCreation.inventory') }, ...slots]} onChange={value => update({ items: profile.items.map((it, i) => i === index ? { ...it, slot: value === '' ? null : Number(value), quantity: value === '' ? it.quantity : 1 } : it) })} /></Field>
                </div>
              </div>)}
            </div>
            <Button disabled={disabled || profile.items.length >= 100} onClick={() => update({ items: [...profile.items, { item_id: 57, quantity: 1, enchant: 0, slot: null }] })}><Plus aria-hidden="true" />{t('characterCreation.add')}</Button>
          </section>
        </div>
      </div>
      <Card as="aside" className="cc-preview" aria-label={t('characterCreation.preview')}>
        <span className="panel-eyebrow">{t('characterCreation.preview')}</span>
        {selected !== 'default' && <div className="cc-preview-sex" role="group" aria-label={t('characterCreation.previewSex')}>
          {([0, 1] as const).map(sex => <Button key={sex} size="sm" variant={previewSex === sex ? 'primary' : 'secondary'} aria-pressed={previewSex === sex} onClick={() => setPreviewSex(sex)}>
            {panelT(sex === 0 ? 'accounts.createCharModal.male' : 'accounts.createCharModal.female')}
          </Button>)}
        </div>}
        <div key={`${selected}-${previewSex}`} className={`cc-portrait${selected === 'default' ? ' cc-portrait-general' : ''}`}>
          <span className="cc-portrait-ring" />
          {selected === 'default' ? <img src="/theme/avatars/general-party.png" width={144} height={192} alt={t('characterCreation.generalIllustration')} /> : <CharacterAvatar classId={Number(selected)} sex={previewSex} size="xl" alt={t('characterCreation.raceIllustration')} />}
        </div>
        <h3>{profileName}</h3>
        <span className="cc-badge" data-custom={override || undefined}>{t(`characterCreation.${status}`)}</span>
        <div className="cc-level"><strong>{formatNumber(profile.level)}</strong><span>{t('characterCreation.level')}</span></div>
        {profile.title && <p className="cc-title-preview">{profile.title}</p>}
        <dl className="cc-summary">
          <div><dt><Shield aria-hidden="true" />{t('characterCreation.equippedStatus')}</dt><dd>{formatNumber(equipped)}</dd></div>
          <div><dt><Backpack aria-hidden="true" />{t('characterCreation.inventoryStatus')}</dt><dd>{formatNumber(profile.items.length - equipped)}</dd></div>
          <div><dt>{t('characterCreation.xp')}</dt><dd><code>{profile.xp || '0'}</code></dd></div>
          <div><dt>{t('characterCreation.sp')}</dt><dd><code>{profile.sp || '0'}</code></dd></div>
        </dl>
        <p className="muted cc-preview-note">{t('characterCreation.previewHint')}</p>
      </Card>
    </div>
  </Card>
}
