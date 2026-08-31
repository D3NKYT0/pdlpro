# PDL PRO — Painel Definitivo Lineage 2.0

Monorepo com **frontend React** e **backend Django API-only**, usando a topologia do CARDGAME e **arquitetura limpa com injeção de dependência**. Tudo que importa é classe: use cases, repositórios, gateways, providers e controllers.

## Estrutura

```
PRO/
├── backend/          # Django 6 + DRF — somente API
├── frontend/         # React 19 + Vite + TanStack Query
├── nginx/
└── docker-compose.yml
```

### Backend (clean architecture)

Cada domínio em `backend/apps/<domínio>/`:

| Camada | Pasta | Responsabilidade |
|---|---|---|
| Domínio | `domain/` | Entidades, exceções, interfaces (ABC) |
| Aplicação | `application/` | Use cases (classes) |
| Infraestrutura | `infrastructure/` | ORM, repositórios, gateways, `*Provider` de DI |
| Apresentação | `presentation/` | Views DRF, serializers, URLs |

O container (`common/di`) faz **constructor injection**. Cada request abre um **scope**. Views herdam `InjectedAPIView` e resolvem use cases com `self.resolve(GetWalletUseCase)`.

API:

| Prefixo | Uso |
|---|---|
| `/api/v1/auth/` | Cadastro, login, refresh, logout, CSRF |
| `/api/v1/public/` | Status, rankings, notícias, FAQ, downloads |
| `/api/v1/shared/` | Perfil, carteira, loja |
| `/api/v1/customer/` | Conta Lineage (expansão) |
| `/api/v1/system/` | Health e versão |

Identificadores públicos são UUID. Erros usam `{ error_code, message, details, request_id }`.

### Frontend

Features consomem só `services/api.ts`. HTTP, CSRF e refresh de JWT ficam em `services/infra/`. Páginas não falam com `fetch` direto.

## Como rodar

```bash
copy .env.example .env
cd backend
py -3 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
py -3 manage.py migrate
py -3 manage.py createsuperuser
py -3 manage.py runserver
```

```bash
cd frontend
npm install
npm run dev
```

Admin: http://127.0.0.1:8000/admin/  
Swagger: http://127.0.0.1:8000/api/docs/swagger-ui/  
SPA: http://localhost:3000

Docker:

```bash
docker compose --profile dev up --build
```

## Banco Lineage 2

O painel (PostgreSQL) é separado do banco do jogo (MySQL). A porta é `ILineageGateway`:

- `NullLineageGateway` se `LINEAGE_DB_ENABLED=false`
- `SqlAlchemyLineageGateway` se `true`

Rankings e status nunca vazam SQL para o frontend.

## Qualidade

- Sem duplicação: bases em `common/architecture` e `common/di`
- Use case é a única entrada da regra de negócio
- Novo módulo: entidade → interface → use case → repositório → provider → view

Apps já modelados para expansão: payment, inventory, marketplace, auction, games, social, communication, clans.
