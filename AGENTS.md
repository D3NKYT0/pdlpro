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

## Documentação

- Documente responsabilidade, uso e efeitos colaterais de classes públicas, especialmente em `backend/apps/` e `backend/common/`.
- Mantenha o README principal focado. Guias detalhados ficam em subpastas de `docs/`, com entrada em [docs/README.md](docs/README.md).
- Ao criar uma funcionalidade, atualize seu guia, os exemplos de uso e os cenários de teste. Consulte a [política de qualidade](docs/desenvolvimento/politica-de-testes.md).
