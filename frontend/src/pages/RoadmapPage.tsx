import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Flag, CalendarDays, ArrowLeft, ArrowUpRight } from 'lucide-react'
import { programsApi } from '../services/domain/programs.service'
import { Empty, ErrorNotice, Loading, Meter, Status } from '../components/programs/ProgramUI'

export function RoadmapPage() {
  const query = useQuery({queryKey: ['roadmap'], queryFn: () => programsApi.roadmap()})
  return <div className="program-page program-public"><header className="card program-hero"><div><span className="panel-eyebrow">O próximo capítulo</span><h1>Roadmap do servidor</h1><p>Acompanhe o que estamos preparando, o que está em desenvolvimento e as novidades já entregues.</p></div><Flag/></header><ErrorNotice error={query.error}/>{query.isPending && <Loading/>}
    <div className="program-grid">{['planned','progress','completed'].map(status => <section className="card program-section" key={status}><div className="program-section-heading"><Status value={status}/><small className="muted">{query.data?.filter(e => e.status === status).length || 0} atualizações</small></div>{query.data?.filter(e => e.status === status).map(entry => <article className="program-item" key={entry.id}><span className="panel-eyebrow">{entry.category}</span><h2>{entry.title}</h2><p>{entry.description.length > 170 ? `${entry.description.slice(0,170)}…` : entry.description}</p><Meter value={entry.progress} max={100}/><small>{entry.progress}% concluído {entry.target_date ? `· Previsão ${new Date(`${entry.target_date}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}</small><Link to={`/roadmap/${entry.id}`} className="character-back">Ver atualização <ArrowUpRight size={16}/></Link></article>)}{query.data && !query.data.some(e => e.status === status) && <Empty>Nenhuma atualização nesta etapa.</Empty>}</section>)}</div>
  </div>
}

export function RoadmapDetailPage() {
  const {id = ''} = useParams()
  const query = useQuery({queryKey: ['roadmap',id], queryFn: () => programsApi.roadmapDetail(id)})
  const entry = query.data
  return <div className="program-page program-public"><Link to="/roadmap" className="character-back"><ArrowLeft/>Voltar ao roadmap</Link><ErrorNotice error={query.error}/>{query.isPending && <Loading/>}{entry && <article className="card program-section"><div className="program-section-heading"><span className="panel-eyebrow">{entry.category}</span><Status value={entry.status}/></div><h1>{entry.title}</h1><Meter value={entry.progress} max={100}/><small className="muted">{entry.progress}% concluído</small><p style={{whiteSpace: 'pre-wrap'}}>{entry.description}</p>{entry.target_date && <p className="muted"><CalendarDays size={17}/> Previsão: {new Date(`${entry.target_date}T12:00:00`).toLocaleDateString('pt-BR')}</p>}</article>}</div>
}
