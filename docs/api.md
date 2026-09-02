# API

## Endereços

| Recurso | Caminho |
|---|---|
| API v1 | `/api/v1/` |
| Schema OpenAPI | `/api/schema/` |
| Swagger UI | `/api/docs/swagger-ui/` |
| ReDoc | `/api/docs/redoc/` |
| Admin Django | `/admin/` |

O Swagger e o ReDoc usam o mesmo visual ouro/escuro do frontend e do Jazzmin. Em desenvolvimento nativo, use `http://127.0.0.1:8000`. Com o Compose completo, use `http://localhost` por meio do Nginx.

## Namespaces

| Prefixo | Acesso | Conteúdo |
|---|---|---|
| `/api/v1/auth/` | Público ou sessão | CSRF, cadastro, login, 2FA, e-mail, senha, refresh e logout |
| `/api/v1/public/` | Anônimo | Status, rankings, notícias, wiki, calendário, FAQ, downloads e mercados públicos |
| `/api/v1/shared/` | Autenticado | Perfil, progresso, recompensas, carteira, loja e conteúdo compartilhado |
| `/api/v1/customer/` | Autenticado | Contas, personagens, inventário, pagamentos, mercados, jogos e comunicação |
| `/api/v1/staff/` | Equipe | Configurações administrativas e relatórios financeiros |
| `/api/v1/system/` | Operacional | Health, versão e webhooks de pagamento |

A lista completa e os métodos aceitos devem ser consultados no Swagger/ReDoc ou diretamente nos arquivos `backend/apps/*/presentation/urls/`.

## Relatórios financeiros

Disponíveis na central administrativa em `/painel/admin/financeiro/saldos`.
As quatro APIs abaixo aceitam apenas leitura e exigem sessão com acesso de equipe
(`IsStaffMember`, incluindo os papéis de staff, admin e moderador do PRO).

| GET `/api/v1/staff/financial-reports/` + | Relatório | Filtros específicos |
|---|---|---|
| `balances/` | Saldos de todos os usuários, incluindo usuários sem carteira | `status`, `minimum`, `maximum` sobre saldo total |
| `cash-flow/` | Movimentação diária de carteiras | `date_from`, `date_to` |
| `payments/` | Pedidos e pagamentos | `date_from`, `date_to`, `status`, `method`, `currency`, `minimum`, `maximum` sobre valor do pedido |
| `reconciliation/` | Conferência das carteiras existentes | `status`, `minimum`, `maximum` sobre diferença assinada |

Todos aceitam `username` (busca parcial sem distinguir maiúsculas), `page` e
`page_size` (padrão 20, máximo 50). Datas usam `YYYY-MM-DD`, limites inclusivos
e o fuso configurado no backend. O período de pagamentos usa a criação do pedido;
`paid_at` é exibido separadamente. Intervalos invertidos e filtros inválidos retornam
400; páginas inexistentes retornam 404.

A resposta contém `count`, `total_pages`, `next`, `previous`, `results` e `summary`.
Totais e contadores de situação em `summary` consideram **todos os registros filtrados**,
independentemente da página. Valores decimais são strings com duas casas; respostas
usam `Cache-Control: no-store`. Os filtros ficam na URL da tela, permitindo compartilhar
um recorte com outro membro da equipe.

Regras de cálculo:

- Saldos e fluxo são expressos em moedas da carteira. O histórico inclui créditos
  de bônus: a reconciliação compara `balance + bonus_balance` com entradas menos saídas.
- `difference` é saldo atual menos saldo calculado. `absolute_difference` no resumo
  soma os módulos das diferenças para que divergências opostas não se ocultem.
  Situações: `consistent` até 0,01; `review` até 1,00; `discrepancy` acima de 1,00;
  `no_wallet` para usuários sem carteira. A consulta não corrige nem cria carteiras.
- O fluxo inclui transferências internas e bônus, portanto não equivale à receita
  em dinheiro. O acumulado começa em zero no período filtrado, em ordem cronológica,
  mesmo quando a tabela é exibida da data mais recente para a mais antiga.
- Pagamentos agrupam valores em `summary.currencies`, separando BRL e USD, com
  `total_amount`, `confirmed_amount` e `pending_amount` (pendente + processando).
  `coins`, `bonus_applied` e `total_credited` no resumo incluem apenas pedidos confirmados.
- A origem indica `simulation` para mock, `gateway` quando há referência externa
  ou `unidentified` quando ela falta. Não se presume confirmação manual. Tokens,
  payloads de gateway, URLs de checkout e IDs sequenciais internos não são expostos.

Os relatórios usam os dados existentes no PRO; não importam o histórico do SITE 1.x.

## Autenticação

### Catálogo canônico de itens

`GET /api/v1/public/items/catalog/` é público e independe da conexão com o jogo.
Retorna `items` e `default_icon_url`. Cada item contém `id` (ID L2 como string),
`name`, `category`, `grade`, `tradeable`, `catalog_found`, `icon_url` e
`icon_reference` (referência de textura do XML, não uma URL de imagem), `source`
(`xml` ou `custom`) e `metadata` (objeto JSON adicional para customs).
As URLs de ícone são resolvidas exclusivamente pelo backend. O cache HTTP é de 60 segundos.

APIs que apresentam itens atuais também retornam `item_metadata` e `icon_url`,
resolvidos pelo mesmo serviço. `name`/`item_name` refletem o catálogo, sem alterar
quantidades, preços, IDs comerciais (UUID) ou registros persistidos. IDs desconhecidos
recebem `Item <ID>`, metadados nulos e a imagem padrão, sem adivinhar por nome.
Snapshots mantêm o nome capturado, explicitamente histórico; tipo/grau/ícone são atuais.
O frontend compartilha uma única consulta em cache, inclusive para autocomplete,
e não possui catálogo JSON ou regras próprias de nomes/ícones.

Customs são gerenciados em `/api/v1/staff/custom-items/`: GET lista paginada, permissões
e opções de tipo/grau; POST cadastra usando multipart com `image` e `metadata` JSON.
`/api/v1/staff/custom-items/<uuid>/` aceita GET e PATCH (JSON ou multipart).
`item_id` é o ID L2 imutável; `id` é o UUID do registro no PDL. Não existe DELETE:
use PATCH com `active: false` para desativar. Uploads autenticados por cookie exigem CSRF.

### Sessão

A aplicação usa access e refresh JWT em cookies `HttpOnly`. O navegador deve enviar credenciais em todas as requisições:

```ts
fetch('/api/v1/shared/me/', {
  credentials: 'include',
})
```

Fluxo do frontend:

1. `GET /api/v1/auth/csrf/` obtém o token CSRF.
2. Cadastro ou login grava os cookies de autenticação.
3. Requisições mutáveis enviam `X-CSRFToken` e os cookies.
4. Ao receber `401`, o cliente tenta `POST /api/v1/auth/refresh/` uma vez.
5. `POST /api/v1/auth/logout/` encerra a sessão no navegador.

Quando 2FA está habilitado, o login retorna um desafio; conclua-o em `POST /api/v1/auth/2fa/verify/` antes de considerar a sessão autenticada.

## CSRF

Métodos `POST`, `PUT`, `PATCH` e `DELETE` exigem token CSRF quando usam autenticação por cookie. Não desabilite essa proteção para contornar erros de origem. Ajuste `CSRF_TRUSTED_ORIGINS`, use HTTPS e mantenha frontend e API sob origens conhecidas.

## Paginação

Listagens paginadas aceitam:

- `page`: número da página;
- `page_size`: itens por página, com padrão 20 e máximo 50.

Formato:

```json
{
  "count": 42,
  "total_pages": 3,
  "next": "http://localhost/api/v1/public/news/?page=2",
  "previous": null,
  "results": []
}
```

Endpoints também podem expor `search` e `ordering` quando declarados pela view.

## Contrato de erro

Erros HTTP da API são normalizados:

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Verifique os dados informados e tente novamente.",
  "details": {
    "email": ["Informe um endereço de email válido."]
  },
  "request_id": "7ff40e81bb164db897421f403b47dc8a",
  "error": "validation_error"
}
```

`error` é um alias legado. Novos clientes devem usar `error_code`. O cabeçalho `X-Request-ID` da resposta contém o mesmo identificador; o cliente pode enviar um valor seguro nesse cabeçalho para correlação.

Códigos comuns:

| HTTP | `error_code` esperado |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `AUTHENTICATION_REQUIRED` ou `AUTHENTICATION_FAILED` |
| 403 | `PERMISSION_DENIED` |
| 404 | `RESOURCE_NOT_FOUND` |
| 409 | `CONFLICT` |
| 429 | `RATE_LIMIT_EXCEEDED` |
| 500 | `INTERNAL_SERVER_ERROR` |
| 503 | `SERVICE_UNAVAILABLE` |

## Versionamento

A versão do produto e a versão da API ficam em `version.json`. O endpoint `/api/v1/system/version/` expõe a versão em execução. Mudanças incompatíveis devem criar uma nova versão de namespace em vez de alterar silenciosamente o contrato `/api/v1/`.
