# PDL PRO

Painel web para comunidades e servidores de **Lineage 2**, reunindo conta do jogo, carteira, loja, inventário, marketplace, leilões e conteúdo em uma única aplicação.

O repositório é um monorepo com backend Django/DRF, frontend React e integrações opcionais com o banco do servidor de jogo. A API segue uma arquitetura em camadas, com casos de uso e injeção de dependência explícita.

> Projeto em desenvolvimento ativo. Antes de publicar em produção, revise a configuração, os provedores externos e a lista de verificação de implantação.

## Principais recursos

- Cadastro, login, cookies JWT, CSRF, recuperação de senha, verificação de e-mail e 2FA.
- Contas e personagens do Lineage 2, rankings e status de login/game server.
- Carteira, transferências, loja e pagamentos por mock, Mercado Pago ou Stripe.
- Inventário, marketplace de personagens e leilões.
- Notícias, wiki, calendário, FAQ, downloads e documentos legais.
- Notificações e Web Push.
- Minigames, recompensas, progresso, economia e passe de batalha.
- Admin Django, documentação OpenAPI e tarefas Celery.

## Stack

| Área | Tecnologias |
|---|---|
| Backend | Python 3.14, Django 6, Django REST Framework |
| Frontend | React 19, TypeScript 6, Vite 8, TanStack Query |
| Dados | PostgreSQL 18 ou SQLite no desenvolvimento; MySQL para o Lineage 2 |
| Assíncrono | Redis, Celery, Django Channels e Daphne |
| Infraestrutura | Docker Compose, Gunicorn e Nginx |
| Qualidade | Pytest, Ruff, Vitest e build TypeScript |

## Início rápido com Docker

Pré-requisitos: Docker com Compose v2 e portas `80` e `3000` livres.

No PowerShell:

```powershell
Copy-Item .env.example .env
docker compose --profile dev up --build
```

No Bash/WSL, os mesmos fluxos estão centralizados no `setup.sh`:

```bash
./setup.sh install
./setup.sh deploy --dev
./setup.sh backup
./setup.sh restore --path backups/db/pdl_YYYYMMDDTHHMMSSZ.dump
```

Execute `./setup.sh help` para listar os comandos encontrados automaticamente
em `scripts/` e `./setup.sh help <comando>` para consultar suas opções.

As migrações são executadas pelo entrypoint do backend. Para criar um administrador:

```powershell
docker compose exec backend python manage.py createsuperuser
```

Serviços disponíveis:

| Serviço | URL |
|---|---|
| Aplicação via Nginx | <http://localhost> |
| Frontend Vite direto | <http://localhost:3000> |
| Admin Django | <http://localhost/admin/> |
| Swagger UI | <http://localhost/api/docs/swagger-ui/> |
| ReDoc | <http://localhost/api/docs/redoc/> |
| Health check | <http://localhost/api/v1/system/health/> |

Para encerrar:

```powershell
docker compose down
```

Os volumes de banco, Redis e mídia são preservados. Consulte [Desenvolvimento](docs/development.md) para instalação nativa, testes e comandos de manutenção.

## Estrutura do repositório

```text
.
├── backend/             # Django, DRF, Celery, Channels e integrações
│   ├── apps/            # Módulos de negócio
│   ├── common/          # DI, contratos, middleware e utilitários
│   └── core/            # Settings, roteamento e composição do projeto
├── frontend/            # SPA React + TypeScript
├── docs/                # Documentação técnica e operacional
├── nginx/               # Proxy reverso para HTTP e WebSocket
├── scripts/             # Instalação, deploy, backup e restauração
├── setup.sh             # Dispatcher dos scripts operacionais
├── docker-compose.yml
└── version.json         # Versões do produto e da API
```

## Documentação

- [Índice da documentação](docs/README.md)
- [Desenvolvimento local](docs/development.md)
- [Configuração e variáveis de ambiente](docs/configuration.md)
- [API, autenticação e contratos](docs/api.md)
- [Arquitetura](docs/architecture.md)
- [Implantação](docs/deployment.md)
- [Como contribuir](CONTRIBUTING.md)
- [Política de segurança](SECURITY.md)
- [Histórico de mudanças](CHANGELOG.md)

## Banco do Lineage 2

Os dados do painel ficam no PostgreSQL/SQLite e permanecem separados do banco do jogo. A porta `ILineageGateway` seleciona uma implementação em tempo de execução:

- `NullLineageGateway` quando `LINEAGE_DB_ENABLED=false`;
- `SqlAlchemyLineageGateway` quando `LINEAGE_DB_ENABLED=true`.

As consultas SQL são mantidas no backend e organizadas por dialeto em `backend/apps/server/infrastructure/lineage/queries/`. Os módulos disponíveis são `lucerav2` e `dreamv3`; selecione um deles com `LINEAGE_QUERY_MODULE`.

## Licença

Copyright © 2026 Daniel Amaral. Todos os direitos reservados.

Este projeto possui [licença proprietária](LICENSE). O acesso ao código-fonte não concede permissão para copiar, modificar, distribuir ou explorar o software sem autorização expressa do titular.
