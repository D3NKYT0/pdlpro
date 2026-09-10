import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import {
  staffGameContentApi,
  type ConfigRow,
} from '../../services/api'
import {
  ErrorNotice,
  Loading,
} from '../../components/programs/ProgramUI'
import { useProgramAction } from '../../components/programs/useProgramAction'
import { AdminHeader } from './AdminChrome'
import { GameContentEditor } from '../../components/admin/gameContent/GameContentEditor'
import { GameContentRecordList } from '../../components/admin/gameContent/GameContentRecordList'
import {
  buildGameContentConfig,
  buildRowLabel,
} from '../../components/admin/gameContent/gameContentConfig'

export function AdminGameContentPage() {
  const { t } = useTranslation('admin')
  const [section, setSection] = useState('seasons')
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
  const [editId, setEditId] = useState<string | undefined>()
  const action = useProgramAction()
  const gameConfigSections = useMemo(() => buildGameContentConfig(t), [t])
  const queries = useQueries({
    queries: gameConfigSections.map((s) => ({
      queryKey: ['game-config', s.id],
      queryFn: () => staffGameContentApi.configs(s.id),
    })),
  })
  const config = gameConfigSections.find((s) => s.id === section)!
  const query = queries[gameConfigSections.findIndex((s) => s.id === section)]
  const rows = (source: string) =>
    queries[gameConfigSections.findIndex((s) => s.id === source)]?.data || []
  const rowLabel = (row: ConfigRow) => buildRowLabel(t, row, rows('seasons'))
  function open(row?: ConfigRow) {
    setEditId(row?.id)
    setDraft(
      Object.fromEntries(
        config.fields.map((f) => [
          f.key,
          row?.[f.key] ??
            f.initial ??
            (f.type === 'checkbox' ? false : f.options?.[0][0] || ''),
        ]),
      ),
    )
  }
  return (
    <div className="program-page">
      <AdminHeader
        kicker={t('gameContent.kicker')}
        title={t('gameContent.title')}
        description={t('gameContent.description')}
      />
      <ErrorNotice error={query.error || action.error} />
      <div className="program-form">
        <label>
          {t('gameContent.areaLabel')}
          <select
            value={section}
            onChange={(e) => {
              setSection(e.target.value)
              setDraft(null)
            }}
          >
            {gameConfigSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="program-section-heading">
        <h2>{config.label}</h2>
        <div className="program-actions">
          <Button type="submit" onClick={() => open()}>
            <Plus size={18} />
            {t('gameContent.newRecord')}
          </Button>
        </div>
      </div>
      {draft && (
        <GameContentEditor
          label={config.label}
          editId={editId}
          fields={config.fields}
          draft={draft}
          busy={action.busy}
          rowsFor={rows}
          rowLabel={rowLabel}
          onDraftChange={setDraft}
          onCancel={() => setDraft(null)}
          onSubmit={(payload) => {
            void action
              .run(
                () => staffGameContentApi.saveConfig(section, payload, editId),
                t('gameContent.saved'),
                [['game-config', section]],
              )
              .then((ok) => {
                if (ok) setDraft(null)
              })
          }}
        />
      )}
      {query.isPending && <Loading />}
      <GameContentRecordList
        fields={config.fields}
        rows={query.data}
        rowsFor={rows}
        rowLabel={rowLabel}
        onEdit={open}
      />
    </div>
  )
}
