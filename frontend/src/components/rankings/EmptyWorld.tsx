export function EmptyWorld({ ranking = false }: { ranking?: boolean }) {
  return (
    <div className="rankings-empty">
      <span className="rankings-diamond" aria-hidden="true" />
      <p>
        {ranking
          ? 'O hall da fama ainda aguarda os primeiros nomes.'
          : 'Sem dados desta consulta no momento.'}
      </p>
    </div>
  )
}
