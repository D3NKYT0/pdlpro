import { useTranslation } from 'react-i18next'

export function EmptyWorld({ ranking = false }: { ranking?: boolean }) {
  const { t } = useTranslation('public')

  return (
    <div className="rankings-empty">
      <span className="rankings-diamond" aria-hidden="true" />
      <p>{ranking ? t('rankings.emptyRanking') : t('rankings.emptyWorld')}</p>
    </div>
  )
}
