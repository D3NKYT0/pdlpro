import type { ApiAuction } from '../../services/api'

/** Tradutor do namespace `panel` recebido pelas telas de leilão. */
export type AuctionTranslate = (key: string, options?: Record<string, unknown>) => string

const auctionStatusClasses: Record<string, string> = {
  open: 'open',
  finished: 'finished',
  cancelled: 'cancelled',
}

/** Rótulo e modificador visual do status de um leilão, traduzidos no idioma ativo. */
export function auctionStatusFor(status: string, t: AuctionTranslate) {
  const className = auctionStatusClasses[status]
  if (!className) return { label: status, className: 'unknown' }
  return { label: t(`auctions.status.${status}`), className }
}

/** Tempo restante até o encerramento do leilão, já traduzido. */
export function formatRemaining(value: string, t: AuctionTranslate) {
  const milliseconds = new Date(value).getTime() - Date.now()
  if (milliseconds <= 0) return t('auctions.remaining.ending')
  const totalMinutes = Math.ceil(milliseconds / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return t('auctions.remaining.days', { days, hours })
  if (hours > 0) return t('auctions.remaining.hours', { hours, minutes })
  return t('auctions.remaining.minutes', { minutes })
}

export function nextBidFor(auction: ApiAuction) {
  return (Math.max(Number(auction.current_bid ?? 0), Number(auction.min_bid)) + 0.01).toFixed(2)
}
