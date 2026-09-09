# Regras de desenvolvimento do PDL PRO

## Arquitetura (obrigatória)

O detalhe vive em [Visão geral](docs/arquitetura/visao-geral.md), [Apps](docs/arquitetura/apps.md),
[Frontend](docs/desenvolvimento/frontend.md) e [Temas](docs/funcionalidades/temas.md).
Registros da migração: [backend PDF](docs/arquitetura/migracao-clean-architecture-di.pdf),
[frontend PDF](docs/arquitetura/migracao-frontend-camadas.pdf).

### Backend (Clean Architecture + DI)

```text
presentation → application → domain
infrastructure → domain
```

- Domínio: sem Django, DRF, ORM ou infra.
- Application: casos de uso + portas; sem `.objects`, sem `transaction.atomic`, sem import de `infrastructure`.
- Infrastructure: repositórios, gateways, providers; sem importar `presentation`.
- Presentation: views/serializers finas; sem ORM; cookies JWT montados aqui (`IAuthSessionService` só materializa o usuário).
- Cada app registra um `AppProvider`. Views usam `InjectedAPIView` / `self.resolve(...)`. Sem service locator na application.
- Comandos management resolvem portas pelo container (ex.: `IPreviewSeedService`); ORM fica no adaptador.
- Staff consome portas dos apps donos; `common/` só para capacidades transversais.

### Frontend (SPA em camadas)

```text
pages/components → services/api.ts → domain/*Api → infra/http.ts
lib/ = helpers puros (sem HTTP)
```

- Importar APIs/tipos de `frontend/src/services/api.ts` (não de `domain/*.service` nem `infra/http` nas telas).
- `fetch` somente em `services/infra/http.ts`. Sem axios.
- Serviços por capacidade: `gamesApi` (gameplay), `programsApi` (produto), `staffGameContentApi` (staff), `catalogApi` (itens).
- Páginas finas: orquestração + Query; UI em `components/<feature>/`; hooks de feature quando o estado cresce.
- Invalidação TanStack sempre com `queryKey` escopada (`useProgramAction` exige a lista).
- Sem container DI no React: `AppProviders` + objetos `*Api`. Regra de negócio permanece no backend.

### Temas (público + painel)

- Toda rota pública/painel passa por `ThemeProvider` e `data-theme-surface` (`public` | `auth` | `panel` | `admin` | `overlay`).
- Pacotes ZIP controlam identidade via `theme.css` + `assets`; o `default` é fallback embutido.
- Folhas estruturais remapeáveis: `css/public/*`, `css/pages/*`, `vendor/*`. Features usam tokens `--theme-*` / `--panel-*`.
- Não invente paleta/CSS de chrome local; estenda tokens, `data-theme-part` e o catálogo de UI.

## Testes obrigatórios por mudança

- Toda feature e alteração de comportamento deve incluir testes no mesmo conjunto de alterações. Se atingir backend e frontend, teste as duas camadas.
- Para correções, reproduza o defeito com um teste que falha antes da correção e passa depois. Teste o resultado observável, não apenas imports, nomes de classes ou texto do código-fonte.
- Backend: cubra sucesso, entradas inválidas, limites, autenticação, autorização por papel e propriedade dos registros. Operações de dinheiro, itens e recompensas também exigem testes de repetição, saldo/quantidade insuficiente e rollback quando aplicável.
- Frontend: teste o contrato HTTP e a interação que entrega a funcionalidade, incluindo carregamento, vazio, erro, sucesso e bloqueio de envios duplicados quando aplicável. Use Testing Library e interações do usuário; SSR isolado não substitui testes de interação.
- Integrações: simule somente a fronteira externa (SDK, HTTP ou gateway). Verifique payloads, timeouts/falhas e respostas inválidas. Não use credenciais reais nem efetue pagamentos, envios de e-mail ou operações no servidor de jogo durante a suíte.
- Preserve isolamento: cada teste cria seus dados, restaura mocks/globais/timers e não depende de ordem, rede ou relógio não controlado.
- Execute testes focados durante o desenvolvimento. Antes de concluir uma mudança de código, execute as suítes completas, cobertura, análise estática e build descritos em [Testes e qualidade](docs/desenvolvimento/testes.md).
- Não use `.only`, skips permanentes, `--passWithNoTests`, exclusões de código de produção ou redução dos limites de cobertura para esconder falhas. Se uma verificação não puder rodar, informe o motivo e o que permanece sem validação.
- Percentual global não substitui os cenários da feature. Revise o relatório por arquivo e cubra os novos ramos relevantes mesmo quando o limite global já estiver passando.
- Mudanças exclusivamente editoriais não precisam de testes artificiais; valide exemplos, links e comandos afetados.

## Reutilização e consistência visual

- Antes de criar uma tela, consulte o [catálogo de componentes](docs/desenvolvimento/componentes.md), os componentes de domínio e os serviços existentes. Componha essas peças; não copie uma página para começar outra.
- Ações, links com aparência de botão, campos, cartões, cabeçalhos, abas, paginação e estados de consulta devem usar os componentes compartilhados aplicáveis em `frontend/src/components/ui/`. Preserve elementos nativos especializados quando a biblioteca ainda não cobrir seu contrato.
- Preserve o tema real do projeto: público usa `useDefaultTheme`; painel/admin usam `usePanelTheme`; superfícies e tokens do pacote ativo. Não recrie o desenho dos botões em CSS local. Acrescente variantes à base compartilhada, com exemplos no catálogo e testes dos comportamentos novos.
- A largura dos botões acompanha o texto e o ícone, com padding. Não aplique largura fixa, min-width artificial ou width: 100% nas telas; variantes de tamanho alteram altura, fonte e espaçamento.
- No Django/Jazzmin, reutilize os assets de `pdl_ui/_button_assets.html` e as classes documentadas na [interface do backend](docs/desenvolvimento/interface-admin.md). Preserve nomes/valores dos submitters, CSRF e validação nativa. Confira o catálogo e uma tela real ao alterar estilos, pois o Jazzmin também aplica regras por ID.
- Centralize estados assíncronos com os hooks existentes quando o contrato for o mesmo. Bloqueie repetição, preserve mensagens e mantenha a invalidação do cache no escopo da operação. A proteção no frontend não substitui a idempotência no backend.
- No backend, extraia políticas duplicadas para o app responsável. Use `common/` somente para capacidades transversais; preserve autorização, transações e diferenças entre integrações. Consulte [Reutilização](docs/arquitetura/reutilizacao.md).
- Na revisão, execute a auditoria de repetição e confira o comportamento no navegador em desktop e celular com o tema carregado. Similaridade sintática é um indício; não force uma abstração entre regras diferentes.

## Documentação

- Documente responsabilidade, uso e efeitos colaterais de classes públicas, especialmente em `backend/apps/` e `backend/common/`.
- Mantenha o README principal focado. Guias detalhados ficam em subpastas de `docs/`, com entrada em [docs/README.md](docs/README.md).
- Ao criar uma funcionalidade, atualize seu guia, os exemplos de uso e os cenários de teste. Consulte a [política de qualidade](docs/desenvolvimento/politica-de-testes.md).
- Mantenha o [changelog](docs/historico/changelog.md) e o ponteiro em [CHANGELOG.md](CHANGELOG.md) alinhados ao Git: use a data da última atualização / última versão publicada como corte (`git log --since=…`), agrupe em Adicionado / Alterado / Corrigido / Removido (Keep a Changelog) e atualize a linha “Última atualização” do `CHANGELOG.md`. Não liste commit a commit; consolide o impacto para o produto.
