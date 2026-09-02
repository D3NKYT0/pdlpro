import type { ReactNode } from 'react'
import { CheckCircle2, CircleDashed, AlertCircle, Gift, Clock3 } from 'lucide-react'
import type { Reward, RewardHistory } from '../../services/domain/programs.service'
import { ItemIcon } from '../ItemIcon'
import './programs.css'

export const labels: Record<string, string> = {pending: 'Em análise', approved: 'Aprovado', rejected: 'Recusado', paid: 'Creditado', available: 'Disponível', completed: 'Concluído', planned: 'Planejado', progress: 'Em andamento', daily: 'Diária', weekly: 'Semanal', season: 'Temporada'}
export function Status({value}: {value: string}) { return <span className={`program-status status-${value}`}><CircleDashed size={13} />{labels[value] || value}</span> }
export function Empty({children}: {children: ReactNode}) { return <div className="program-empty"><CircleDashed size={28} /><p>{children}</p></div> }
export function ErrorNotice({error}: {error: unknown}) { return error ? <div className="program-error" role="alert"><AlertCircle size={18}/><span>{error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'}</span></div> : null }
export function Loading() { return <div className="program-empty" role="status"><Clock3 size={24}/><p>Carregando informações…</p></div> }
export function RewardList({rewards}: {rewards: Reward[]}) { return <div className="program-rewards">{rewards.map((reward, i) => <span key={i} className="program-reward">{reward.kind === 'item' ? <ItemIcon itemId={reward.item_id || 0} size={28}/> : <Gift size={20}/>}<span><strong>{reward.name || ({tokens: 'Fichas', balance: 'Saldo', bonus: 'Bônus'}[reward.kind]) || 'Item'}</strong><small>× {reward.quantity}{reward.enchant ? ` · +${reward.enchant}` : ''}</small></span></span>)}</div> }
export function RewardHistoryList({history}: {history: RewardHistory[]}) { return history.length ? <div className="program-timeline">{history.map(row => <article key={row.id}><CheckCircle2 size={18}/><div><strong>{row.label}</strong><small>{new Date(row.created_at).toLocaleString('pt-BR')}</small><RewardList rewards={row.rewards}/></div></article>)}</div> : <Empty>Seus resgates aparecerão aqui.</Empty> }
export function Meter({value, max}: {value: number; max: number}) { return <div className="program-meter" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={Math.max(max, value)}><span style={{width: `${Math.min(100, Math.max(0, value / Math.max(1, max) * 100))}%`}}/></div> }
