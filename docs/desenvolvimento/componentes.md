# Componentes e padrão visual

[Índice](../README.md) · [Frontend](frontend.md) · [Reutilização](../arquitetura/reutilizacao.md) · [Testes](testes.md)

Novas telas devem compor a biblioteca existente. Os componentes compartilham interação e acessibilidade; o tema do painel define a aparência. O catálogo usa o mesmo `usePanelTheme` de `PrivateLayout`, incluindo as fontes, o fundo e as texturas originais dos botões.

Temas instaláveis sobrescrevem os tokens e assets declarados sem substituir estes componentes.
O contrato, os limites do ZIP e o fallback do tema `default` estão documentados em
[Temas instaláveis](../funcionalidades/temas.md).

Para telas Django/Jazzmin, consulte a [interface compartilhada do backend](interface-admin.md), que mantém as variantes equivalentes e preserva o envio nativo dos formulários.

## Experimentar o catálogo

Dentro de `frontend/`, execute `npm run dev` e abra [o catálogo local](http://localhost:3000/ui.html). Se escolher outra porta, use `/ui.html` nessa origem. A página demonstra os componentes reais sem consultar APIs: ações, formulário, carregamento, erro, paginação e teclado. Seus dados são descartados ao recarregar.

O código está em [dev/ui.tsx](../../frontend/dev/ui.tsx). O catálogo é uma entrada de desenvolvimento, não uma rota autenticada nem uma entrada do build de produção. Ele participa de `npm run typecheck`.

## Biblioteca básica

Na ajuda, [HelpCompanion](../../frontend/src/components/help/HelpCompanion.tsx) combina o renderizador Denkynho com um menu de ações e dicas. No celular, sua alça nativa especializada permite arraste e movimentação por teclado; botões, campos e superfícies do menu continuam usando a biblioteca compartilhada. Consulte [Interação com o personagem](../funcionalidades/ajuda.md#interação-com-o-personagem).

[ContextualHelp](../../frontend/src/components/help/ContextualHelp.tsx) compõe o mini-mascote no shell do painel, o humor, o selo de necessidade e destinos autorizados; some em `/painel/ajuda`. `contextual.ts` centraliza rotas, dicas, `from` e o chamado pré-preenchido sem histórico. [HelpPreferences](../../frontend/src/components/help/HelpPreferences.tsx) concentra nome e tamanho das respostas no perfil da conta, com cópia opcional neste navegador. [PetProgress](../../frontend/src/components/help/PetProgress.tsx) apresenta ganhos confirmados, desbloqueios e armário com `useAsyncAction`. Todos compõem os controles compartilhados. A demonstração `/denkynho.html`, disponível só em desenvolvimento, permite revisar a página de Ajuda e esses componentes com o tema real e dados simulados.

| Peça | Uso e contrato |
| --- | --- |
| [Button, ButtonLink e IconButton](../../frontend/src/components/ui/Button.tsx) | Ações, navegação interna e ações somente com ícone |
| [Field](../../frontend/src/components/ui/Field.tsx) | Label, controle nativo, dica e erro; preserva ref, atributos e validação HTML |
| [Card](../../frontend/src/components/ui/Card.tsx) | Superfície do tema; `as` seleciona `section`, `article`, `aside`, `div` ou `header` |
| [PageHeader](../../frontend/src/components/ui/PageHeader.tsx) | Título h1, descrição, identificação da seção e ações |
| [Tabs](../../frontend/src/components/ui/Tabs.tsx) | Abas controladas, setas, Home/End e associação aos painéis |
| [Toggle](../../frontend/src/components/ui/Toggle.tsx) | Checkbox nativo, nome acessível e bloqueio durante envio |
| [Pagination](../../frontend/src/components/ui/Pagination.tsx) | Página atual, limites e bloqueio durante consulta; a tela busca os dados |
| [EmptyState, LoadingState e ErrorNotice](../../frontend/src/components/ui/Feedback.tsx) | Vazio, carregamento anunciado e erro com tentativa explícita |

Os componentes básicos publicam `data-theme-part` estável (`button`, `field`, `card`,
`page-header`, `tabs`, `empty-state`, `loading-state` e `error-notice`). Temas podem usar
esses seletores para alterar a aparência, mas não devem esconder estados, mudar semântica
ou substituir a interação implementada pelo componente.

## Botões

| Propriedade | Valores e finalidade |
| --- | --- |
| `variant` | `primary`: dourado; `secondary`: azul; `success`: verde; `warning`: âmbar; `danger`: vermelho |
| `variant="ghost"` | Alias compatível de `secondary`, usado pelas telas anteriores |
| `size` | `sm` compacto, `md` padrão e `lg` amplo |
| `busy`, `busyLabel` | Desabilita a ação, mostra indicador e anuncia o texto de envio |
| `disabled` | Indisponibilidade sem anunciar uma operação em andamento |
| `type` | Padrão `button`; informe `submit` para enviar o formulário |

As variantes mantêm as imagens `button/1.png` e `button/2.png` do tema. Sucesso, atenção e perigo tonalizam a mesma arte; hover e clique preservam essa tonalidade. O estado desabilitado não recebe a animação de hover e o indicador respeita preferência por movimento reduzido. A largura acompanha o texto e o ícone, com padding lateral; não há largura fixa, mínima artificial ou preenchimento da linha. `size` altera altura, fonte e padding.

```tsx
import { Save, Trash2 } from 'lucide-react'
import { Button, ButtonLink, IconButton } from '../../components/ui/Button'

// Dentro de um componente de tela; saving e save pertencem à sua operação.
<Button type="submit" busy={saving} busyLabel="Salvando...">
  <Save aria-hidden="true" /> Salvar
</Button>
<Button variant="success" size="sm" onClick={approve}>Aprovar</Button>
<Button variant="warning" onClick={review}>Revisar</Button>
<IconButton label="Excluir item" variant="danger" onClick={remove}>
  <Trash2 aria-hidden="true" />
</IconButton>
<ButtonLink to="/painel" variant="secondary">Voltar ao painel</ButtonLink>
```

`ButtonLink` precisa do Router da aplicação e mantém semântica de link, inclusive abrir em outra aba. Não use um botão com `window.location` para navegação interna. `IconButton` exige `label`; a cor e o ícone não substituem a descrição da ação. A variante de perigo não implementa confirmação ou exclusão: a tela continua responsável por essas regras.

## Formulário e ação assíncrona

Este exemplo completo aceita a operação como dependência. Em uma tela real, o callback deve chamar o serviço de domínio e invalidar suas consultas antes de terminar.

```tsx
import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'

export function NameForm({ onSave }: { onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const hintId = useId()
  const action = useFeedbackAction()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await action.run(() => onSave(name), 'Não foi possível salvar o nome.')
  }

  return <form onSubmit={submit}>
    <Field label="Nome" hint={<span id={hintId}>Exibido aos jogadores.</span>}>
      <input value={name} onChange={event => setName(event.target.value)}
        required disabled={action.pending} aria-describedby={hintId} />
    </Field>
    <Button type="submit" busy={action.pending} busyLabel="Salvando...">Salvar</Button>
  </form>
}
```

[useAsyncAction](../../frontend/src/hooks/useAsyncAction.ts) centraliza `pending`, `error` e bloqueio síncrono de chamadas repetidas. Retorna `{ ok: true, value }` ou `{ ok: false, error }`; chamadas ignoradas também têm `skipped: true`. Não cancela a operação ao desmontar a tela. [useFeedbackAction](../../frontend/src/hooks/useFeedbackAction.ts) acrescenta o toast de falha, preservando a mensagem pública de `ApiError` ou usando o fallback. O callback continua responsável pela mensagem de sucesso.

Escolha um hook por grupo de ações que precisa ficar bloqueado junto. Operações independentes podem ter hooks separados. Desabilitar um botão melhora a interface, mas a idempotência e as transações continuam obrigatórias no backend.

Use apenas um controle por `Field`. Para erro, coloque um ID no conteúdo de `error`, associe-o com `aria-describedby` e marque `aria-invalid` no controle. O componente não inventa regras de validação nem converte valores da API.

## Abas e composição por domínio

`Tabs` recebe `id`, `label`, `items`, `value` e `onChange`. Para `id="inventory"` e item `bag`, o painel deve ter `id="inventory-panel-bag"`, `role="tabpanel"` e `aria-labelledby="inventory-tab-bag"`. O chamador controla visibilidade e conteúdo. Use o estilo de navegação existente (`game-tabs` ou `inventory-tabs`) para o contexto correspondente.

`AdminHeader` e `ProgramHeader` compõem `PageHeader`; `AdminSaveBar` compõe `Button`. Os aliases `Empty`, `Loading` e `ErrorNotice` de `ProgramUI` reutilizam os estados comuns. Preserve componentes com contrato próprio, como `ItemIdField`, `ItemIcon`, `RewardsEditor` e `FishingGame`.

[TicketMessages](../../frontend/src/components/support/TicketMessages.tsx) e [TicketStatus](../../frontend/src/components/support/TicketStatus.tsx) compartilham a apresentação do atendimento. `staff` permite exibir notas internas recebidas da API; o modo padrão as filtra. Isso não substitui a autorização e a filtragem no servidor.

[Denkynho](../../frontend/src/components/help/Denkynho.tsx) compõe as camadas PNG do mascote com pose, fala, piscadas e movimento reduzido. Comer, jogar, rir, dormir, dançar, carinho, pensar, confuso e comemorar usam `ActivitySprite`, com sequências de quadros pré-carregadas, recortes e ancoragem pelos pés. O atlas de sucesso só entra com `celebration`. `useMascotPose` centraliza as transições, a fila de atividades e o espelhamento por visita, preservando a prioridade da conversa. A camada de orientação envolve corpo e recortes faciais juntos e não sobrescreve a transformação da animação. A página de Ajuda controla os estados; consulte [Ajuda e Denkynho](../funcionalidades/ajuda.md) para o contrato e os cenários de teste.

[formatters.ts](../../frontend/src/lib/formatters.ts) centraliza BRL e data/hora em português. Datas usam o fuso do navegador e têm fallback para dados inválidos. Não use a formatação BRL para USD, fichas ou moedas do jogo. Cálculos e precisão financeira pertencem ao domínio.

## Acrescentar uma variante ou componente

1. Procure a peça nesta biblioteca e nos componentes do domínio.
2. Se o contrato for o mesmo, acrescente uma propriedade ou composição à peça existente.
3. Preserve o default em `public/theme/pages/panel.css`; regras comuns de interação ficam em `components/ui/ui.css`. Extensões de um pacote ficam no CSS instalável e usam o contrato de superfícies/partes. Não copie texturas e regras de hover para uma página.
4. Atualize o catálogo com exemplos úteis, inclusive pendente, desabilitado e erro quando aplicável.
5. Teste interação, teclado e acessibilidade. Confira desktop e celular com o tema carregado.

Referências: [testes da biblioteca](../../frontend/src/components/ui/ui.test.tsx), [ações assíncronas](../../frontend/src/hooks/useAsyncAction.test.tsx) e [privacidade do atendimento](../../frontend/src/components/support/TicketMessages.test.tsx).
