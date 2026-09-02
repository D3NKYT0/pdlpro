import { Headphones } from 'lucide-react'
import type { ApiSupportMessage } from '../../services/types'
import { formatDateTime } from '../../lib/formatters'

/** Histórico comum do atendimento; notas internas nunca aparecem no modo jogador.
 * A API também filtra as notas: a filtragem visual é uma segunda proteção.
 */
export function TicketMessages({ messages, staff = false }: { messages: ApiSupportMessage[]; staff?: boolean }) {
  return <div className={`support-message-list${staff ? ' staff-messages' : ''}`}>
    {messages.filter(message => staff || !message.is_internal).map(message => <article className={`support-message ${message.is_staff_reply ? 'staff' : 'player'}${message.is_internal ? ' internal' : ''}`} key={message.id}>
      <div className="support-message-avatar">{message.is_staff_reply ? <Headphones aria-hidden="true" /> : message.author_name.slice(0, 1).toUpperCase()}</div>
      <div><header><strong>{!staff && message.is_staff_reply ? 'Equipe PDL' : message.author_name}{message.is_internal ? ' · nota interna' : ''}</strong><time>{formatDateTime(message.created_at, 'short')}</time></header><p>{message.body}</p></div>
    </article>)}
  </div>
}
