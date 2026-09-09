import type { ApiAuction } from '../../services/api'

export const auctionStatus: Record<string, { label: string; className: string }> = {
  open: { label: 'Aberto', className: 'open' },
  finished: { label: 'Finalizado', className: 'finished' },
  cancelled: { label: 'Cancelado', className: 'cancelled' },
}

export function formatRemaining(value: string) {
  const milliseconds = new Date(value).getTime() - Date.now()
  if (milliseconds <= 0) return 'Encerrando'
  const totalMinutes = Math.ceil(milliseconds / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h restantes`
  if (hours > 0) return `${hours}h ${minutes}min restantes`
  return `${minutes}min restantes`
}

export function nextBidFor(auction: ApiAuction) {
  return (Math.max(Number(auction.current_bid ?? 0), Number(auction.min_bid)) + 0.01).toFixed(2)
}
