import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { RewardsEditor } from '../../programs/RewardsEditor'
import type { ConfigRow, Reward } from '../../../services/api'
import { localDate, type GameContentField } from './gameContentConfig'

interface GameContentEditorProps {
  label: string
  editId?: string
  fields: GameContentField[]
  draft: Record<string, unknown>
  busy: boolean
  rowsFor: (source: string) => ConfigRow[]
  rowLabel: (row: ConfigRow) => string
  onDraftChange: (draft: Record<string, unknown>) => void
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => void
}

export function GameContentEditor({
  label,
  editId,
  fields,
  draft,
  busy,
  rowsFor,
  rowLabel,
  onDraftChange,
  onCancel,
  onSubmit,
}: GameContentEditorProps) {
  return (
    <Card className="program-section">
      <h2>
        {editId ? 'Editar' : 'Criar'} · {label}
      </h2>
      <form
        className="program-form"
        onSubmit={(e) => {
          e.preventDefault()
          const payload = { ...draft }
          for (const f of fields) {
            if (f.type === 'datetime-local' && payload[f.key])
              payload[f.key] = new Date(
                String(payload[f.key]),
              ).toISOString()
          }
          onSubmit(payload)
        }}
      >
        <div className="program-fields">
          {fields
            .filter((f) => f.type !== 'rewards')
            .map((f) => (
              <label
                key={f.key}
                className={f.type === 'checkbox' ? 'program-check' : ''}
              >
                {f.type === 'checkbox' ? (
                  <>
                    <input
                      type="checkbox"
                      checked={Boolean(draft[f.key])}
                      onChange={(e) =>
                        onDraftChange({ ...draft, [f.key]: e.target.checked })
                      }
                    />
                    {f.label}
                  </>
                ) : (
                  <>
                    {f.label}
                    {f.source || f.options ? (
                      <select
                        required
                        value={String(draft[f.key] || '')}
                        onChange={(e) =>
                          onDraftChange({ ...draft, [f.key]: e.target.value })
                        }
                      >
                        <option value="">Selecione…</option>
                        {f.options
                          ? f.options.map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))
                          : rowsFor(f.source!).map((row) => (
                              <option key={row.id} value={row.id}>
                                {rowLabel(row)}
                              </option>
                            ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={String(draft[f.key] || '')}
                        onChange={(e) =>
                          onDraftChange({ ...draft, [f.key]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        required
                        type={f.type || 'text'}
                        min={f.min}
                        step={
                          f.type === 'number' && f.key === 'premium_price'
                            ? '0.01'
                            : undefined
                        }
                        value={
                          f.type === 'datetime-local' && draft[f.key]
                            ? localDate(String(draft[f.key]))
                            : String(draft[f.key] ?? '')
                        }
                        onChange={(e) =>
                          onDraftChange({
                            ...draft,
                            [f.key]:
                              f.type === 'number'
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                      />
                    )}
                  </>
                )}
              </label>
            ))}
        </div>
        {fields.some((f) => f.type === 'rewards') && (
          <RewardsEditor
            value={draft.rewards as Reward[]}
            onChange={(nextRewards) => onDraftChange({ ...draft, rewards: nextRewards })}
          />
        )}
        <div className="program-actions">
          <Button type="submit" disabled={busy}>
            Salvar configuração
          </Button>
          <Button
            className="ghost"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
