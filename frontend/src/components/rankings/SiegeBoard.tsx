import { useQueries } from '@tanstack/react-query'
import { Castle, Shield, Swords, Users } from 'lucide-react'
import { serverApi } from '../../services/api'
import {
  castleIdOf,
  castleInfo,
  displayName,
  formatRelative,
  formatTax,
  formatTreasury,
  initial,
  parseDate,
  siegeState,
  splitParticipants,
  withCastleCatalog,
} from './rankingsFormat'
import type { WorldRow } from './rankingsMeta'

export function SiegeBoard({ rows }: { rows: WorldRow[] }) {
  const castles = withCastleCatalog(rows)
  const participants = useQueries({
    queries: castles.map((row) => {
      const castleId = castleIdOf(row)
      return {
        queryKey: ['world', 'siege_participants', castleId],
        queryFn: () => serverApi.world('siege_participants', { castle_id: String(castleId) }),
        enabled: castleId > 0,
      }
    }),
  })
  const occupied = castles.filter((row) => displayName(row.clan_name, '')).length
  const nextSiege = castles
    .map((row) => parseDate(row.sdate))
    .filter((date): date is Date => Boolean(date && date.getTime() > Date.now()))
    .sort((a, b) => a.getTime() - b.getTime())[0]
  const liveCount = castles.filter((row) => siegeState(row.sdate).kind === 'live').length

  return (
    <div className="rankings-siege">
      <dl className="rankings-siege-summary">
        <div>
          <dt>Ocupados</dt>
          <dd>
            {occupied}/{castles.length}
          </dd>
        </div>
        <div>
          <dt>Livres</dt>
          <dd>{castles.length - occupied}</dd>
        </div>
        <div>
          <dt>Em guerra</dt>
          <dd>{liveCount || 'Nenhum'}</dd>
        </div>
        <div>
          <dt>Próximo cerco</dt>
          <dd>{nextSiege ? formatRelative(nextSiege) : '—'}</dd>
        </div>
      </dl>

      <div className="rankings-siege-list">
        {castles.map((row, index) => {
          const info = castleInfo(row)
          const owner = displayName(row.clan_name, '')
          const leader = displayName(row.leader ?? row.char_name, 'Sem líder')
          const ally = displayName(row.ally_name, 'Sem aliança')
          const siege = siegeState(row.sdate)
          const sides = splitParticipants(participants[index]?.data ?? [], owner)
          const owned = Boolean(owner)

          return (
            <article className={`rankings-castle${owned ? ' is-owned' : ''}${siege.kind === 'live' ? ' is-live' : ''}`} key={info.slug || String(info.id)}>
              <div className="rankings-castle-visual">
                <img src={info.image} alt={`Castelo de ${info.title}`} onError={(event) => event.currentTarget.remove()} />
                <span className="rankings-castle-fallback" aria-hidden="true">
                  <Castle />
                </span>
                <div className="rankings-castle-visual-copy">
                  <small>{info.territory}</small>
                  <strong>{info.title}</strong>
                </div>
                <em className={`rankings-castle-status is-${siege.kind}`}>
                  {siege.kind === 'live' ? 'Sob cerco' : owned ? 'Dominado' : 'Sem dono'}
                </em>
              </div>

              <div className="rankings-castle-body">
                <header>
                  <span>{info.territory}</span>
                  <h3>{info.title} Castle</h3>
                  <p>{info.blurb}</p>
                </header>

                <dl className="rankings-castle-meta">
                  <div>
                    <dt>Clã dono</dt>
                    <dd>
                      <span className="rankings-crest sm" aria-hidden="true">
                        <span>{initial(owner || info.title)}</span>
                      </span>
                      {owner || 'Sem dono'}
                    </dd>
                  </div>
                  <div>
                    <dt>Líder</dt>
                    <dd>{leader}</dd>
                  </div>
                  <div>
                    <dt>Aliança</dt>
                    <dd>{ally}</dd>
                  </div>
                  <div>
                    <dt>Tesouro</dt>
                    <dd>{formatTreasury(row.stax)}</dd>
                  </div>
                  <div>
                    <dt>Taxa</dt>
                    <dd>{formatTax(row.tax)}</dd>
                  </div>
                  <div>
                    <dt>Próxima guerra</dt>
                    <dd>
                      {siege.detail}
                      {siege.kind === 'soon' ? <small>{siege.label}</small> : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Forças do cerco</dt>
                    <dd>
                      {sides.attackers.length} atacantes · {sides.defenders.length} defensores
                    </dd>
                  </div>
                </dl>

                {sides.attackers.length || sides.defenders.length ? (
                  <div className="rankings-castle-forces">
                    <div>
                      <h4>
                        <Swords aria-hidden="true" />
                        Atacantes
                      </h4>
                      {sides.attackers.length ? (
                        <ul>
                          {sides.attackers.map((name) => (
                            <li key={`atk-${name}`}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Nenhum clã registrado</p>
                      )}
                    </div>
                    <div>
                      <h4>
                        <Shield aria-hidden="true" />
                        Defensores
                      </h4>
                      {sides.defenders.length ? (
                        <ul>
                          {sides.defenders.map((name) => (
                            <li key={`def-${name}`}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Nenhum clã registrado</p>
                      )}
                    </div>
                  </div>
                ) : participants[index]?.isLoading ? (
                  <p className="rankings-castle-hint">
                    <Users aria-hidden="true" />
                    Consultando clãs inscritos no cerco...
                  </p>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
