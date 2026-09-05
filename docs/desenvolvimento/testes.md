# Testes e qualidade

[Índice](../README.md) · [Ambiente local](ambiente-local.md) · [Contribuição](../projeto/contribuicao.md)

O backend usa Pytest com pytest-django, pytest-mock e pytest-cov. O frontend usa Vitest, Testing Library, jsdom e cobertura V8. Toda feature ou correção precisa de testes para o comportamento alterado; consulte a [política de testes](politica-de-testes.md) e [AGENTS.md](../../AGENTS.md).

Testes automatizados, build e homologação verificam aspectos diferentes: passar na suíte local não confirma uma integração real com MySQL, loginserver ou provedor de pagamento.

## Execução rápida

Prepare as dependências conforme o [ambiente local](ambiente-local.md). `python` deve ser o executável do virtualenv; no Windows, ative `.venv\Scripts\Activate.ps1` ou use `.venv\Scripts\python.exe` dentro de `backend/`.

### Backend — dentro de backend/

```bash
python -m pytest
python -m ruff check .
python manage.py check --settings=core.settings.test
python manage.py makemigrations --check --dry-run --settings=core.settings.test
```

### Frontend — dentro de frontend/

```bash
npm ci
npm run test:run
npm run typecheck
npm run test:coverage
npm run build
```

O frontend **já possui testes**. Não use `--passWithNoTests` no fluxo normal: uma suíte não descoberta precisa ser investigada. `npm run test` mantém o Vitest em modo interativo; `npm run test:run` executa uma vez e encerra.

### Backend no Docker — a partir da raiz

```bash
docker compose exec backend python -m pytest --ds=core.settings.test
docker compose exec backend python -m ruff check .
```

O argumento `--ds` explicita o ambiente de teste mesmo quando o container está configurado para desenvolvimento. Não execute a suíte usando os settings de produção.

## Ambiente e isolamento do backend

[pytest.ini](../../backend/pytest.ini) seleciona `core.settings.test`, descobre arquivos `test_*.py` e habilita `--strict-markers` e `--reuse-db`. Os [settings de teste](../../backend/core/settings/test.py) definem:

| Componente | Comportamento na suíte |
| --- | --- |
| Banco Django | SQLite gerenciado pelo runner de testes |
| Lineage | Gateway em memória, com `LINEAGE_DB_ENABLED=False` |
| Cache e Channels | Backends em memória |
| Celery | Execução eager; broker e resultado em memória |
| E-mail e arquivos | Armazenamento em memória |
| Senhas | Hasher rápido exclusivo do ambiente de teste |
| Pagamentos | Mock habilitado e confirmação simulada |

A fixture automática em [conftest.py](../../backend/conftest.py) limpa contas, personagens e itens do `NullLineageGateway` antes de cada teste. Ao substituir serviços, restaure o estado depois da execução; não deixe instâncias globais ou mocks interferirem no teste seguinte.

`--reuse-db` preserva o banco de teste entre execuções. Após uma mudança de schema, recrie-o pelo runner:

```bash
python -m pytest --create-db
```

Não apague bancos manualmente para resolver uma falha de coleta ou uma asserção incorreta.

## Executar somente o necessário

```bash
# Dentro de backend/: pasta, arquivo, teste específico e filtro por nome.
python -m pytest common/tests
python -m pytest apps/shop/tests/test_cart_api.py
python -m pytest common/tests/test_container.py::test_constructor_injection
python -m pytest apps/server/tests -k "catalog"
python -m pytest --collect-only -q
```

```bash
# Dentro de frontend/: arquivo ou nome do cenário.
npm run test:run -- src/services/infra/session.test.ts
npm run test:run -- -t "retries after a 502"
```

Os marcadores `unit`, `integration` e `architecture` estão registrados no Pytest, mas nem todos os testes os utilizam. `-m unit` não equivale a executar todos os testes unitários existentes. Para uma mudança localizada, prefira o caminho do arquivo; para validar tudo, execute sem filtro.

## Exemplos de cobertura existente

| Área | Referências |
| --- | --- |
| DI, admin e OpenAPI | [common/tests](../../backend/common/tests/) |
| Sessão, e-mail e progresso | [accounts/tests](../../backend/apps/accounts/tests/) |
| Carteira e comércio | [shop/tests](../../backend/apps/shop/tests/), [payment/tests](../../backend/apps/payment/tests/), [auction/tests](../../backend/apps/auction/tests/) |
| Itens, vínculos e SQL | [server/tests](../../backend/apps/server/tests/), [inventory/tests](../../backend/apps/inventory/tests/) |
| Recompensas e comissões | [games/tests](../../backend/apps/games/tests/), [programs/tests](../../backend/apps/programs/tests/) |
| Ferramentas da equipe | [staff/tests](../../backend/apps/staff/tests/), [support/tests](../../backend/apps/support/tests/) |
| Sessão frontend | [http.test.ts](../../frontend/src/services/infra/http.test.ts), [session.test.ts](../../frontend/src/services/infra/session.test.ts) |
| Catálogo frontend | [item-icons.test.ts](../../frontend/src/lib/item-icons.test.ts) |
| Representação de telas | [ProgramScreens.test.tsx](../../frontend/src/components/programs/ProgramScreens.test.tsx), [AdminFinancialReportsPage.test.tsx](../../frontend/src/pages/admin/AdminFinancialReportsPage.test.tsx) |
| Interação de conta e perfil | [AccountSecurityPage.test.tsx](../../frontend/src/pages/AccountSecurityPage.test.tsx), [ProfilePage.test.tsx](../../frontend/src/pages/ProfilePage.test.tsx) |
| Interação de comércio e inventário | [TradingPages.test.tsx](../../frontend/src/pages/TradingPages.test.tsx), [InventoryPage.test.tsx](../../frontend/src/pages/InventoryPage.test.tsx) |
| Interação de jogos e atendimento | [GamesPage.test.tsx](../../frontend/src/pages/GamesPage.test.tsx), [FishingGame.test.tsx](../../frontend/src/components/games/FishingGame.test.tsx), [SupportPage.test.tsx](../../frontend/src/pages/SupportPage.test.tsx) |
| Componentes e ações compartilhadas | [ui.test.tsx](../../frontend/src/components/ui/ui.test.tsx), [useAsyncAction.test.tsx](../../frontend/src/hooks/useAsyncAction.test.tsx), [TicketMessages.test.tsx](../../frontend/src/components/support/TicketMessages.test.tsx) |
| Temas e shells globais | [ThemeProvider.test.tsx](../../frontend/src/theme/ThemeProvider.test.tsx), [PortalTheme.test.tsx](../../frontend/src/components/themes/PortalTheme.test.tsx), [AuthPanel.test.tsx](../../frontend/src/components/auth/AuthPanel.test.tsx), [PrivateLayout.test.tsx](../../frontend/src/components/layout/PrivateLayout.test.tsx) |

O Vitest usa **Node por padrão** e descobre `src/**/*.test.{ts,tsx}` e `dev/**/*.test.{ts,tsx}`, conforme [vite.config.ts](../../frontend/vite.config.ts). Os testes de interface selecionam jsdom por arquivo e usam Testing Library, ambos instalados nas dependências de desenvolvimento. A suíte inclui contratos HTTP, renderização estática, interações de formulários e carregamento das [52 rotas](../../frontend/src/app/routes/AppRoutes.test.tsx). O carregamento das rotas verifica a montagem das páginas e seus layouts com a API pendente; não substitui os cenários de interação de cada funcionalidade nem uma suíte E2E em navegador real.

## Como escrever novos testes

Nomeie o teste pelo comportamento observado. Prepare apenas os dados necessários, execute a ação e verifique o resultado público e os efeitos persistidos relevantes. Evite testes que apenas repitam a implementação.

### Regra de aplicação sem banco

Injete um fake ou mock da porta necessária. Este exemplo verifica uma restrição antes de consultar a política e pode ser adaptado para `apps/wallet/tests/test_use_cases.py`:

```python
from decimal import Decimal

import pytest

from apps.wallet.application.use_cases import (
    PreviewPurchaseBonusInput,
    PreviewPurchaseBonusUseCase,
)
from apps.wallet.domain.entities import InvalidTransferError

def test_bonus_rejects_zero_before_calling_policy(mocker):
    policy = mocker.Mock()
    use_case = PreviewPurchaseBonusUseCase(bonus_policy=policy)

    with pytest.raises(InvalidTransferError):
        use_case.execute(PreviewPurchaseBonusInput(amount=Decimal("0.00")))

    policy.preview.assert_not_called()
```

### API e banco de dados

Use `@pytest.mark.django_db` ou a fixture `db` quando o cenário acessar o ORM. [test_cart_api.py](../../backend/apps/shop/tests/test_cart_api.py) mostra fixtures de usuário/produto, requisições `APIClient` e asserções sobre entrega e saldo.

`force_authenticate` ajuda a testar a regra e a autorização de um endpoint, mas contorna o login e não prova cookies ou CSRF. Testes de sessão precisam percorrer esse fluxo; consulte [test_auth_api.py](../../backend/apps/accounts/tests/test_auth_api.py). Para verificar CSRF com APIClient, habilite `enforce_csrf_checks=True` e exercite a autenticação real.

### Serviços e telas do frontend

Crie o arquivo `.test.ts` ou `.test.tsx` perto do código correspondente. Use `describe`, `it`, `expect` e `vi` do Vitest. O ambiente padrão é Node; adicione `// @vitest-environment jsdom` ao início dos testes de DOM. Use `render`, `screen` e `userEvent` para interagir com formulários, botões e rotas reais. [LoginPage.test.tsx](../../frontend/src/pages/LoginPage.test.tsx) e [ShopPage.test.tsx](../../frontend/src/pages/ShopPage.test.tsx) mostram exemplos completos.

Restaure mocks e globais em `afterEach`; os testes de HTTP também chamam `resetHttpClient`. Use `cleanup()` nos testes React. Cada teste deve ter seu próprio QueryClient, sem retries automáticos, e desmontar a árvore ao terminar. `npm run typecheck` verifica também os arquivos de teste por meio de [tsconfig.test.json](../../frontend/tsconfig.test.json).

## Cenários importantes

- **Autorização:** visitante, proprietário, outro usuário, equipe sem permissão específica e recurso desativado.
- **Valores:** zero, negativo, limites, `Decimal`, saldo insuficiente e separação entre dinheiro, moedas e bônus.
- **Repetição:** checkout ou webhook duplicado, recibo repetido e retomada após timeout, verificando que o efeito não é duplicado.
- **Persistência:** falha entre operações, rollback do painel e limites da transação externa.
- **Contrato:** UUID público, ausência de dados internos, paginação, filtros, erros e precisão numérica.
- **Interface:** carregamento, vazio, erro, acesso negado e sucesso; confira também celular.

SQLite não comprova os mesmos bloqueios e concorrência do PostgreSQL/MySQL. Para alterar essas garantias, homologue com os bancos adequados em ambiente controlado. Testes de catálogo SQL e gateway falso não comprovam que um game server real consumiu `items_delayed`.

## Cobertura e verificações complementares

```bash
# Dentro de backend/; pytest-cov faz parte de requirements.txt.
python -m pytest --cov --cov-report=term:skip-covered --cov-report=html --cov-report=json:coverage.json --cov-report=xml:coverage.xml
```

O arquivo [backend/.coveragerc](../../backend/.coveragerc) mede `apps` e `common`, incluindo branches e excluindo somente testes e migrações. O relatório HTML fica em `backend/htmlcov/index.html`; JSON e XML servem para automação. O piso `fail_under` considera a métrica combinada de linhas e branches do Coverage.py. Testes de migração continuam necessários quando houver transformação de dados; sua exclusão da métrica de código da aplicação não os dispensa.

```bash
# Dentro de frontend/.
npm run test:coverage
```

O frontend usa `@vitest/coverage-v8`, com versão compatível com Vitest. [vite.config.ts](../../frontend/vite.config.ts) inclui todo o código em `src`, mesmo arquivos sem testes, e exclui arquivos de teste, declarações, tipos e o ponto de montagem `main.tsx`. O relatório HTML fica em `frontend/coverage/index.html`. Os limites globais e dos serviços críticos são verificados pelo comando. Linhas, statements, funções e branches são métricas separadas; não compare diretamente o percentual combinado do backend com linhas do frontend.

O [workflow de CI](../../.github/workflows/tests.yml) executa as verificações completas e guarda os relatórios como artefatos. Os pisos atuais são uma barreira contra regressão, não uma declaração de cobertura exaustiva. Consulte também o [registro desta ampliação](../historico/2026-09-02-testes.md).

`npm run lint` está declarado, porém o manifesto atual não inclui ESLint e não há configuração ESLint versionada. Prepare esse comando antes de tratá-lo como gate confiável. O Ruff já faz parte das dependências do backend. Registre falhas existentes separadamente de problemas introduzidos pela mudança.

## Evidências de uma entrega

Informe revisão, ambiente, comandos, resultados e limitações. Para mudanças apenas documentais, verifique links, caminhos, exemplos e coerência com o código; não é necessário executar integrações reais. Para mudança funcional, rode os cenários afetados e amplie conforme o risco.

Resultados datados ficam em [histórico](../historico/2026-09-02-validacao.md). Uma contagem antiga de testes não é promessa permanente de cobertura ou homologação.
