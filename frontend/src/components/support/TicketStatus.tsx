import type { ApiSupportTicket } from '../../services/types'

const tones: Record<string, string> = {
  open: 'new', in_progress: 'progress', waiting_user: 'attention',
  waiting_team: 'progress', resolved: 'done', closed: 'closed',
}

/** Mesma legenda e cor do chamado nas telas do jogador e da equipe. */
export function TicketStatus({ ticket }: { ticket: Pick<ApiSupportTicket, 'status' | 'status_label'> }) {
  return <span className={`support-status ${tones[ticket.status] ?? ''}`}>{ticket.status_label}</span>
}
