import { formatWorldCell, worldColumnLabel, worldKeys } from './rankingsFormat'
import type { WorldRow } from './rankingsMeta'

export function WorldTable({ rows }: { rows: WorldRow[] }) {
  const keys = worldKeys(rows)

  return (
    <div className="rankings-table-wrap">
      <table className="rankings-table">
        <thead>
          <tr>
            {keys.map((key) => (
              <th key={key}>{worldColumnLabel(key)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {keys.map((key) => (
                <td key={key}>{formatWorldCell(key, row[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
