import { Pencil } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Empty } from '../../programs/ProgramUI'
import type { ConfigRow } from '../../../services/api'
import type { GameContentField } from './gameContentConfig'

interface GameContentRecordListProps {
  fields: GameContentField[]
  rows: ConfigRow[] | undefined
  rowsFor: (source: string) => ConfigRow[]
  rowLabel: (row: ConfigRow) => string
  onEdit: (row: ConfigRow) => void
}

export function GameContentRecordList({
  fields,
  rows,
  rowsFor,
  rowLabel,
  onEdit,
}: GameContentRecordListProps) {
  return (
    <>
      <div className="program-grid program-record-grid">
        {rows?.map((row) => {
          const metaFields = fields.filter(
            (f) =>
              f.type !== 'rewards' &&
              f.key !== 'name' &&
              f.type !== 'textarea' &&
              f.key !== 'active',
          )
          const activeField = fields.find((f) => f.key === 'active' && f.type === 'checkbox')
          const isActive = activeField ? Boolean(row.active) : undefined
          return (
            <Card as="article" className={`program-section program-record${isActive === false ? ' is-inactive' : isActive ? ' is-active' : ''}`} key={row.id}>
              <header className="program-record-head">
                <div>
                  <h3>{rowLabel(row)}</h3>
                  {isActive !== undefined ? (
                    <span className={`program-status ${isActive ? 'status-available' : 'status-pending'}`}>
                      {isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  ) : null}
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(row)}>
                  <Pencil size={16} />
                  Editar
                </Button>
              </header>
              <dl className="program-record-meta">
                {metaFields.map((f) => (
                  <div key={f.key}>
                    <dt>{f.label}</dt>
                    <dd>
                      {f.source
                        ? rowsFor(f.source).find((s) => s.id === row[f.key])
                          ? rowLabel(rowsFor(f.source).find((s) => s.id === row[f.key])!)
                          : '—'
                        : f.type === 'checkbox'
                          ? row[f.key]
                            ? 'Sim'
                            : 'Não'
                          : f.type === 'datetime-local'
                            ? new Date(String(row[f.key])).toLocaleString('pt-BR')
                            : f.type === 'date'
                              ? new Date(`${row[f.key]}T12:00:00`).toLocaleDateString('pt-BR')
                              : f.options
                                ? f.options.find(([key]) => key === row[f.key])?.[1] || String(row[f.key])
                                : String(row[f.key] ?? '—')}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          )
        })}
      </div>
      {rows?.length === 0 && (
        <Empty>
          Nenhum registro. Configure esta etapa para disponibilizar novas
          recompensas.
        </Empty>
      )}
    </>
  )
}
