# Arquitetura do PDL PRO

## Visão geral

O PDL PRO usa uma arquitetura modular em camadas. O backend separa regras de negócio de Django, banco de dados e transporte HTTP; o frontend concentra o acesso à API em serviços próprios.

```text
Browser
   │
   ├── HTTP ──────> Nginx ─────> Django/DRF ──> caso de uso ──> porta ──> adaptador
   │                                      │                         ├── PostgreSQL
   │                                      │                         ├── Redis
   │                                      │                         └── MySQL Lineage 2
   │
   └── WebSocket ─> Nginx ─────> Daphne/Channels ────────────────> serviços de aplicação
```

## Regra de dependência

```text
presentation ──> application ──> domain
      │                │
      └──> infrastructure ─────> domain
```

| Camada | Local | Responsabilidade |
|---|---|---|
| Domínio | `backend/apps/<app>/domain/` | Entidades, exceções, políticas e interfaces |
| Aplicação | `backend/apps/<app>/application/` | Casos de uso, entradas e orquestração |
| Infraestrutura | `backend/apps/<app>/infrastructure/` | ORM, repositórios, gateways e providers |
| Apresentação | `backend/apps/<app>/presentation/` | Views, serializers, consumers e URLs |

Regras centrais:

- o domínio não importa Django, DRF ou SQLAlchemy;
- a aplicação depende de interfaces do domínio, não de implementações concretas;
- infraestrutura implementa as portas e conhece detalhes externos;
- apresentação trata HTTP/WebSocket e delega a regra ao caso de uso;
- consultas do banco Lineage ficam nos catálogos SQL da infraestrutura.

## Injeção de dependência

Cada app registra um `AppProvider` em seu `AppConfig.ready()`. O catálogo compõe o container raiz quando `DependencyInjection.root()` é usado pela primeira vez.

O `DependencyInjectionMiddleware` cria um escopo por requisição. Views derivadas de `InjectedAPIView` usam `self.resolve(TipoDoCasoDeUso)`; o container inspeciona o construtor tipado e injeta as dependências registradas.

Lifetimes:

| Lifetime | Uso |
|---|---|
| `SINGLETON` | Uma instância no processo, adequada a objetos imutáveis e pools |
| `SCOPED` | Uma instância por requisição, normalmente repositórios e políticas |
| `TRANSIENT` | Nova instância a cada resolução, normalmente casos de uso |

Não mantenha estado específico de usuário em singletons.

## Módulos de negócio

| App | Responsabilidade principal |
|---|---|
| `accounts` | Usuários, autenticação, e-mail, 2FA e progresso |
| `server` | Status, contas, personagens, rankings e gateway Lineage |
| `wallet` | Saldo, transferências e bônus de compra |
| `shop` | Catálogo, carrinho e checkout |
| `payment` | Pedidos, provedores e webhooks de pagamento |
| `inventory` | Itens, depósito, retirada e troca |
| `marketplace` | Anúncios e compra de personagens |
| `auction` | Leilões e lances |
| `content` | Notícias, wiki, calendário, FAQ, downloads e legais |
| `games` | Minigames, recompensas, economia e passe de batalha |
| `communication` | Notificações e push |
| `staff` | Endpoints operacionais do sistema |

`common/` contém capacidades transversais, como container de DI, middleware, paginação, permissões, contrato de erro e suporte a OpenAPI.

## Integração com o Lineage 2

`ILineageGateway` isola a aplicação do schema do servidor:

1. `ServerProvider` lê `LINEAGE_DB_ENABLED`.
2. Desabilitado: registra `NullLineageGateway`, mantendo status por socket e respostas sem banco do jogo.
3. Habilitado: carrega o `LineageQueryCatalog` selecionado e registra `SqlAlchemyLineageGateway`.
4. O catálogo usa somente consultas conhecidas dentro de `queries/<módulo>/`.

Para suportar um novo fork do servidor, crie outro diretório de consultas com o mesmo contrato dos catálogos existentes e cubra-o com testes. Não aceite nomes de arquivos ou SQL arbitrário do cliente.

## Frontend

O frontend segue este fluxo:

```text
page/component ──> domain service ──> services/infra/http.ts ──> /api/v1
```

`http.ts` centraliza `credentials: include`, token CSRF, renovação de sessão e conversão do contrato de erro em `ApiError`. `TanStack Query` mantém cache e estado assíncrono. Páginas protegidas passam por `RequireAuth`.

## Como implementar uma mudança

Para um novo caso de uso no backend:

1. Modele entidade, exceção ou interface no domínio.
2. Crie uma classe de caso de uso com entrada tipada na aplicação.
3. Implemente repositório ou gateway na infraestrutura.
4. Registre interface, implementação e caso de uso no provider do app.
5. Adicione serializer, view fina e rota no namespace correto.
6. Exponha um serviço de domínio no frontend, se necessário.
7. Cubra regras, autorização e integração HTTP com testes.
8. Atualize OpenAPI, documentação e changelog quando o contrato público mudar.

Escolha do namespace:

- `auth`: criação e manutenção da sessão;
- `public`: leitura anônima;
- `shared`: capacidades autenticadas compartilhadas;
- `customer`: operações de negócio do jogador;
- `system`: health, versão e webhooks de infraestrutura.

## Contratos transversais

- Erros de API usam `error_code`, `message`, `details` e `request_id`.
- O middleware aceita ou gera `X-Request-ID` e o devolve na resposta.
- Listagens paginadas usam `count`, `total_pages`, `next`, `previous` e `results`.
- O tamanho padrão da página é 20; `page_size` é limitado a 50.
- Endpoints são autenticados por padrão; exceções públicas devem declarar `AllowAny`.
