import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, ButtonLink, IconButton } from '../src/components/ui/Button'
import { BrowserRouter } from 'react-router-dom'
import { ArrowRight, Check, Download, Pencil, Plus, RefreshCw, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { Card } from '../src/components/ui/Card'
import { usePanelTheme } from '../src/theme/usePanelTheme'
import { Field } from '../src/components/ui/Field'
import { PageHeader } from '../src/components/ui/PageHeader'
import { EmptyState, ErrorNotice, LoadingState } from '../src/components/ui/Feedback'
import { Toggle } from '../src/components/ui/Toggle'
import { Tabs } from '../src/components/ui/Tabs'
import { Pagination } from '../src/components/ui/Pagination'
import { useAsyncAction } from '../src/hooks/useAsyncAction'
import '../src/styles/global.css'
import './ui.css'

/** Catálogo local: demonstra os componentes reais sem autenticação ou chamadas API. */
function Showcase() {
  usePanelTheme()
  const [tab, setTab] = useState('components')
  const [enabled, setEnabled] = useState(true)
  const [page, setPage] = useState(1)
  const [saved, setSaved] = useState(false)
  const [failed, setFailed] = useState(true)
  const [lastAction, setLastAction] = useState('Escolha uma ação para experimentar.')
  const action = useAsyncAction()
  return <main className="panel-app ui-showcase">
    <PageHeader eyebrow="PDL PRO · Biblioteca de interface" title="Uma base para todas as telas" description="Componentes reais do painel. Explore estados, teclado e ações sem acessar a API." />
    <Tabs id="showcase" label="Catálogo" className="game-tabs" value={tab} onChange={setTab} items={[{ id: 'components', label: 'Componentes' }, { id: 'guidelines', label: 'Como usar' }]} />
    <section id="showcase-panel-components" role="tabpanel" aria-labelledby="showcase-tab-components" hidden={tab !== 'components'}>
      <div className="ui-showcase-grid">
        <Card className="ui-showcase-buttons">
          <h2>Botões do painel</h2><p className="muted">As mesmas texturas do projeto, com opções para cada ação.</p>
          <div className="ui-showcase-actions">
            <Button onClick={() => setLastAction('Configuração salva no exemplo.')}><Save aria-hidden="true" /> Salvar</Button>
            <Button variant="secondary" onClick={() => setLastAction('Edição cancelada no exemplo.')}>Cancelar</Button>
            <Button variant="success" onClick={() => setLastAction('Solicitação aprovada no exemplo.')}><Check aria-hidden="true" /> Aprovar</Button>
            <Button variant="warning" onClick={() => setLastAction('Solicitação enviada para revisão no exemplo.')}><ShieldAlert aria-hidden="true" /> Revisar</Button>
            <Button variant="danger" onClick={() => setLastAction('Item removido apenas neste exemplo.')}><Trash2 aria-hidden="true" /> Remover</Button>
          </div>
          <h3>Tamanhos e ícones</h3>
          <div className="ui-showcase-actions">
            <Button size="sm" onClick={() => setLastAction('Edição aberta no exemplo.')}><Pencil aria-hidden="true" /> Editar</Button>
            <Button onClick={() => setLastAction('Item criado no exemplo.')}><Plus aria-hidden="true" /> Novo item</Button>
            <Button size="lg" onClick={() => setLastAction('Download demonstrativo selecionado.')}><Download aria-hidden="true" /> Baixar arquivo</Button>
            <IconButton label="Atualizar lista" variant="secondary" onClick={() => setLastAction('Lista atualizada no exemplo.')}><RefreshCw aria-hidden="true" /></IconButton>
            <IconButton label="Excluir item" variant="danger" onClick={() => setLastAction('Exclusão demonstrativa selecionada.')}><Trash2 aria-hidden="true" /></IconButton>
          </div>
          <h3>Estados e navegação</h3>
          <div className="ui-showcase-actions"><Button disabled>Indisponível</Button><Button busy busyLabel="Salvando...">Salvar</Button><IconButton label="Atualizar lista" variant="secondary" busy><RefreshCw aria-hidden="true" /></IconButton><ButtonLink variant="secondary" to="#showcase-panel-guidelines" onClick={() => setTab('guidelines')}>Como usar <ArrowRight aria-hidden="true" /></ButtonLink></div>
          <p className="ui-showcase-result" role="status">{lastAction}</p>
        </Card>
        <form className="card" onSubmit={event => { event.preventDefault(); void action.run(async () => { setSaved(false); await new Promise(resolve => setTimeout(resolve, 700)); setSaved(true) }) }}>
          <h2>Formulário</h2><Field label="Nome" hint="Exibido aos jogadores."><input placeholder="Nome do servidor" required /></Field><Field label="Descrição"><textarea rows={2} placeholder="Conte sobre seu servidor" /></Field><Toggle label="Disponível aos jogadores" checked={enabled} onChange={event => setEnabled(event.target.checked)} /><div className="ui-showcase-actions"><Button type="submit" busy={action.pending} busyLabel="Salvando...">Salvar exemplo</Button></div>{saved && <p role="status">Exemplo salvo localmente.</p>}
        </form>
        <Card><h2>Consultas</h2><LoadingState /><EmptyState>Nenhum registro encontrado.</EmptyState><ErrorNotice error={failed ? new Error('Não foi possível carregar os dados.') : null} onRetry={() => setFailed(false)} /></Card>
        <Card><h2>Validação e navegação</h2><Field label="E-mail" error={<span id="email-error">Informe um e-mail válido.</span>}><input defaultValue="incompleto" aria-invalid="true" aria-describedby="email-error" /></Field><Pagination page={page} pages={3} onChange={setPage} /><p className="muted">Use Tab para navegar, Espaço nos controles e setas nas abas.</p></Card>
      </div>
    </section>
    <Card id="showcase-panel-guidelines" role="tabpanel" aria-labelledby="showcase-tab-guidelines" hidden={tab !== 'guidelines'}><h2>Reaproveitar primeiro</h2><p>Importe componentes de src/components/ui e componha a tela com as regras do seu domínio.</p><p>Button usa type="button" por padrão. Para salvar um formulário, informe type="submit". Use busy e busyLabel durante ações assíncronas.</p><p>Guias completos em docs/desenvolvimento/componentes.md e docs/arquitetura/reutilizacao.md.</p></Card>
  </main>
}

createRoot(document.getElementById('root')!).render(<BrowserRouter><Showcase /></BrowserRouter>)
