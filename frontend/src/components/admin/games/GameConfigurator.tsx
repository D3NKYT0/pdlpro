import { useMemo, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Plus, WandSparkles } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { Modal } from '../../ui/Modal'
import { ItemIcon } from '../../ItemIcon'
import { useFeedbackAction } from '../../../hooks/useFeedbackAction'
import { useItemCatalog } from '../../../hooks/useItemCatalog'
import { staffApi, staffGameContentApi, type ApiStaffGame, type ConfigRow } from '../../../services/api'
import {
  buildGameContentConfig,
  buildRowLabel,
  contentKindsForGame,
  GAME_SETTING_FIELDS,
} from '../gameContent/gameContentConfig'
import { GameContentEditor } from '../gameContent/GameContentEditor'
import { GameContentRecordList } from '../gameContent/GameContentRecordList'

export function GameConfigurator({
  game,
  open,
  onClose,
  onAutoconfig,
  autoconfigBusy,
}: {
  game: ApiStaffGame
  open: boolean
  onClose: () => void
  onAutoconfig: () => void
  autoconfigBusy: boolean
}) {
  const { t } = useTranslation('admin')
  const catalog = useItemCatalog()
  const queryClient = useQueryClient()
  const action = useFeedbackAction()
  const sections = useMemo(() => buildGameContentConfig(t), [t])
  const kinds = contentKindsForGame(game.code)
  const settingFields = GAME_SETTING_FIELDS[game.code] ?? []
  const [settings, setSettings] = useState<Record<string, string>>(() =>
    Object.fromEntries(settingFields.map((field) => [field.key, String(game.settings[field.key] ?? '')])),
  )
  const [section, setSection] = useState(kinds[0] ?? '')
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
  const [editId, setEditId] = useState<string | undefined>()
  const queries = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: ['game-config', kind],
      queryFn: () => staffGameContentApi.configs(kind),
      enabled: open && kinds.length > 0,
    })),
  })
  const config = sections.find((item) => item.id === section)
  const query = queries[kinds.indexOf(section)]
  const rowsFor = (source: string) => queries[kinds.findIndex((kind) => kind === source)]?.data || []
  const rowLabel = (row: ConfigRow) => buildRowLabel(t, row, [])

  function openRow(row?: ConfigRow) {
    if (!config) return
    setEditId(row?.id)
    setDraft(
      Object.fromEntries(
        config.fields.map((field) => [
          field.key,
          row?.[field.key] ?? field.initial ?? (field.type === 'checkbox' ? false : field.options?.[0][0] || ''),
        ]),
      ),
    )
  }

  async function saveSettings() {
    if (!game.id || game.code === 'boxes') return
    const payload = Object.fromEntries(
      settingFields.map((field) => [field.key, field.step === '0.01' ? settings[field.key] : Number(settings[field.key])]),
    )
    const result = await action.run(
      () => staffApi.saveGame({ id: game.id, settings: payload }),
      t('games.toast.error'),
    )
    if (result.ok) {
      toast.success(t('games.toast.settingsSaved'))
      await queryClient.invalidateQueries({ queryKey: ['staff-games'] })
    }
  }

  if (!open) return null

  return (
    <Modal className="admin-game-configurator" open={open} title={`${t('games.configure')} · ${game.name}`} onClose={onClose}>
      {settingFields.length > 0 ? (
        <form
          className="admin-game-settings"
          onSubmit={(event) => {
            event.preventDefault()
            void saveSettings()
          }}
        >
          {settingFields.map((field) => (
            <Field key={field.key} label={t(`games.settings.${field.key}`)}>
              <input
                type="number"
                min={field.min}
                step={field.step ?? 1}
                value={settings[field.key] ?? ''}
                onChange={(event) => setSettings((current) => ({ ...current, [field.key]: event.target.value }))}
              />
            </Field>
          ))}
          <Button type="submit" busy={action.pending && !draft} busyLabel={t('chrome.saving')}>
            {t('games.saveSettings')}
          </Button>
        </form>
      ) : null}
      <div className="admin-game-config-toolbar">
        {kinds.length > 0 ? (
          <Button type="button" size="sm" onClick={() => openRow()}>
            <Plus aria-hidden="true" />
            {t('gameContent.newRecord')}
          </Button>
        ) : null}
        <Button className="ghost" type="button" size="sm" onClick={onAutoconfig} busy={autoconfigBusy} busyLabel={t('games.autoconfigBusy')}>
          <WandSparkles aria-hidden="true" />
          {t('games.autoconfig')}
        </Button>
      </div>
      {kinds.length > 1 ? (
        <Field label={t('games.contentKind')}>
          <select value={section} onChange={(event) => { setSection(event.target.value); setDraft(null) }}>
            {kinds.map((kind) => (
              <option key={kind} value={kind}>{t(`gameContent.sections.${kind}`)}</option>
            ))}
          </select>
        </Field>
      ) : null}
      {kinds.length > 0 && config ? (
        <>
          {draft ? (
            <GameContentEditor
              label={config.label}
              editId={editId}
              fields={config.fields}
              draft={draft}
              busy={action.pending}
              rowsFor={rowsFor}
              rowLabel={rowLabel}
              onDraftChange={setDraft}
              onCancel={() => setDraft(null)}
              onSubmit={(payload) => {
                void action
                  .run(async () => {
                    const saved = await staffGameContentApi.saveConfig(section, payload, editId)
                    await queryClient.invalidateQueries({ queryKey: ['game-config', section] })
                    return saved
                  }, t('games.toast.error'))
                  .then((result) => {
                    if (result.ok) {
                      toast.success(t('gameContent.saved'))
                      setDraft(null)
                    }
                  })
              }}
            />
          ) : null}
          <GameContentRecordList
            fields={config.fields}
            rows={query?.data}
            rowsFor={rowsFor}
            rowLabel={(row) => catalog.getById(String(row.item_id ?? ''))?.name || rowLabel(row)}
            onEdit={openRow}
          />
        </>
      ) : (
        <p className="admin-game-config-hint">{t('games.settingsOnly')}</p>
      )}
      {query?.data?.some((row) => row.item_id) ? (
        <ul className="admin-game-loot-preview">
          {query.data.slice(0, 8).map((row) => (
            <li key={row.id}>
              <ItemIcon itemId={String(row.item_id)} name={String(row.name || row.item_name || '')} size={28} />
              <span>{String(row.name || row.item_name || row.item_id)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Modal>
  )
}
