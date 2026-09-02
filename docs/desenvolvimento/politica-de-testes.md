# Política de testes para novas features

[Índice](../README.md) · [Executar os testes](testes.md) · [Contribuição](../projeto/contribuicao.md)

Uma feature só está pronta quando seu comportamento está protegido por testes, os testes passam e a documentação descreve como usá-la. A regra vale também para correções e refatorações que alterem contratos. Está registrada em [AGENTS.md](../../AGENTS.md) para orientar as próximas tarefas no repositório.

## Cenários exigidos

| Tipo de mudança | Evidência esperada |
| --- | --- |
| Caso de uso | Resultado correto, entradas inválidas, limites e ausência de efeitos parciais |
| Endpoint privado | Visitante recusado, papel permitido/negado e registro próprio/alheio |
| Saldo, compra, lance, item ou recompensa | Valores exatos, insuficiência, repetição/idempotência e rollback aplicável |
| Componente ou página | Interação real, carregamento, vazio, erro e sucesso relevantes |
| Formulário | Validação, payload, falha preservando dados e proteção contra reenvio quando necessária |
| Serviço HTTP | Rota, verbo, parâmetros, codificação, corpo e propagação de erros |
| Autenticação | Sessão inválida/expirada, conta desativada, desafio correto/incorreto e autorização |
| Integração | Payload enviado, resposta interpretada, falha externa e limites do mock documentados |
| Correção de bug | Teste de regressão que reproduz o defeito antes da correção |
| Migração de dados | Preservação e transformação dos dados, incluindo registros legados relevantes |

A matriz é aplicada ao comportamento alterado. Não crie testes triviais de getters, imports ou strings do código para aumentar a contagem. Asserções devem detectar regressões observáveis.

## Organização

- Backend: `backend/apps/<app>/tests/test_<assunto>.py`; infraestrutura compartilhada em `backend/common/tests/`.
- Frontend: `<Componente>.test.tsx` ou `<servico>.test.ts`, junto ao código; use `// @vitest-environment jsdom` para testes de DOM.
- Testes de comportamento devem consumir a classe, API ou tela real. Substitua somente dependências necessárias ao isolamento; não substitua a unidade que está sendo verificada.
- Use `Decimal` para dinheiro no backend, dados determinísticos, timers controlados e banco de teste. Limpe cache, DOM, mocks e globais alterados.

## Revisão e automação

O [workflow de qualidade](../../.github/workflows/tests.yml) executa backend e frontend em push e pull request. Ele verifica Pytest, Ruff, configuração Django, ausência de migrações pendentes, Vitest com cobertura, tipos da aplicação e dos testes e build. Os relatórios HTML ficam nos artefatos da execução.

Os pisos de cobertura são definidos em [backend/.coveragerc](../../backend/.coveragerc) e [frontend/vite.config.ts](../../frontend/vite.config.ts). Eles impedem regressões grandes; **não comprovam que uma feature nova foi testada**. No review, confira também os arquivos e ramos alterados. Não reduza os pisos nem exclua código executável para fazer o CI passar.

Para tornar esses jobs obrigatórios no merge, o mantenedor deve selecionar os checks `backend` e `frontend` na proteção da branch do GitHub. O arquivo de workflow não altera essa configuração remota.

## O que registrar no pull request

Descreva o comportamento coberto, os comandos executados e o resultado. Para integrações, indique o que foi simulado e o que foi homologado de verdade. Caso o ambiente impeça alguma verificação, informe a causa e a validação pendente; não apresente como executado um teste que não rodou.

Cobertura de linhas, quantidade de testes e execução com mocks são evidências complementares. Não significam cobertura exaustiva, validação visual em todos os navegadores nem confirmação de concorrência no banco de produção.
