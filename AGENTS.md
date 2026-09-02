# Regras de desenvolvimento do PDL PRO

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
- Preserve o tema real do projeto: painel e catálogo usam `usePanelTheme`, suas fontes e texturas. Não recrie o desenho dos botões em CSS local. Acrescente variantes à base compartilhada, com exemplos no catálogo e testes dos comportamentos novos.
- A largura dos botões acompanha o texto e o ícone, com padding. Não aplique largura fixa, min-width artificial ou width: 100% nas telas; variantes de tamanho alteram altura, fonte e espaçamento.
- Centralize estados assíncronos com os hooks existentes quando o contrato for o mesmo. Bloqueie repetição, preserve mensagens e mantenha a invalidação do cache no escopo da operação. A proteção no frontend não substitui a idempotência no backend.
- No backend, extraia políticas duplicadas para o app responsável. Use `common/` somente para capacidades transversais; preserve autorização, transações e diferenças entre integrações. Consulte [Reutilização](docs/arquitetura/reutilizacao.md).
- Na revisão, execute a auditoria de repetição e confira o comportamento no navegador em desktop e celular com o tema carregado. Similaridade sintática é um indício; não force uma abstração entre regras diferentes.

## Documentação

- Documente responsabilidade, uso e efeitos colaterais de classes públicas, especialmente em `backend/apps/` e `backend/common/`.
- Mantenha o README principal focado. Guias detalhados ficam em subpastas de `docs/`, com entrada em [docs/README.md](docs/README.md).
- Ao criar uma funcionalidade, atualize seu guia, os exemplos de uso e os cenários de teste. Consulte a [política de qualidade](docs/desenvolvimento/politica-de-testes.md).
