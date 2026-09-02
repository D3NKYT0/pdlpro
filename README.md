# PDL PRO 2.0

Painel web completo para comunidades e servidores de **Lineage 2**.

O PDL reúne site público, área do jogador e central operacional da staff em uma
única aplicação. Contas do jogo, personagens, carteira, loja, inventário,
marketplace, leilões, pagamentos, conteúdo e acompanhamento da economia compartilham
as mesmas regras e fontes de dados.

O código é publicamente acessível sob uma licença **source-available**: pode ser
estudado, instalado, modificado para uso próprio e utilizado em servidores de
Lineage 2, mas não pode ser comercializado por terceiros. Consulte a seção
[Licença](#licença).

> [!WARNING]
> O PDL 2.0 está em desenvolvimento ativo. Antes de usar em produção, revise as
> configurações, prepare o banco do jogo, configure provedores reais e execute o
> checklist de implantação.

## O que mudou no PDL 2.0

O PDL 2.0 não é apenas uma atualização visual do PDL 1.x. A aplicação foi
reestruturada para separar completamente frontend e backend:

- **Backend:** Django 6 e Django REST Framework, com API versionada em `/api/v1/`.
- **Frontend:** React 19, TypeScript e Vite.
- **Site público, jogador e staff:** uma única aplicação React consumindo a mesma API.
- **Banco do painel:** PostgreSQL em produção, separado do MySQL do Lineage 2.
- **Integração com forks:** catálogos de consultas independentes para cada schema.

Essa separação permite manter toda a stack em uma VPS ou publicar o frontend estático
em cPanel, CDN ou outro serviço, deixando o backend em infraestrutura separada. No
segundo cenário, o servidor web precisa encaminhar as rotas de API, WebSocket e mídia
para o backend.

O antigo sistema de temas baseado em templates Django e arquivos ZIP não faz parte
do 2.0. Um novo sistema de temas está planejado para permitir a personalização de toda
a interface — área pública, autenticação, painel do jogador e central da staff.

Não há migração automática do PDL 1.x. Uma mudança para o 2.0 deve ser tratada como
uma nova implantação e testada em paralelo antes da liberação aos jogadores.

## Recursos

### Conta e segurança

- Cadastro, login, recuperação de senha e verificação de e-mail.
- Autenticação por cookies JWT com proteção CSRF.
- 2FA e passkeys.
- Conta mestra vinculada a um ou mais logins do Lineage 2.
- Notificações no painel e Web Push.

### Jogador e servidor

- Personagens, equipamentos, inventário e rankings.
- Status do Login Server e Game Server.
- Carteira, bônus e troca segura entre painel e jogo.
- Recibos e retomada de operações interrompidas para evitar duplicidades.
- Catálogo unificado de itens XML e itens customizados.
- Loja, carrinho, pacotes, cupons e histórico de pedidos.
- Marketplace de personagens e leilões.
- Notícias, wiki, calendário, FAQ, downloads e documentos legais.

### Programas e entretenimento

- Bônus diário e temporadas.
- Passe de batalha com missões, marcos, trocas e recompensas.
- Pesca, caixas, roleta, dados, slots e outros minigames.
- Programa de apoiadores, cupons e comissões.

### Staff e operação

- Central operacional dentro do próprio painel.
- Gestão de loja, rates, notícias, cupons, recompensas e módulos.
- Cadastro de itens customizados sem rebuild do frontend.
- Chamados de suporte com fila e histórico.
- Relatórios de saldo, fluxo, pedidos, pagamentos e reconciliação.
- Observação de itens e snapshots da economia do servidor.
- Django Admin com Jazzmin para manutenção e operações específicas.
- OpenAPI com Swagger UI e ReDoc.

Os módulos compatíveis podem ser desativados sem apagar seus dados. Ao desligar um
recurso, suas rotas são bloqueadas e as telas correspondentes deixam de aparecer para
o jogador.

## Arquitetura

```text
Navegador
   │
   ▼
React + TypeScript
   │  HTTP / WebSocket
   ▼
Django REST Framework ─────► PostgreSQL
   │             │
   │             └─────────► Redis + Celery + Channels
   │
   └───────────────────────► MySQL do Lineage 2 (opcional)
```

O frontend não consulta o banco do jogo diretamente. Todas as regras, permissões e
integrações passam pela API. O backend é organizado em camadas de domínio, aplicação,
infraestrutura e apresentação, com casos de uso e injeção de dependência explícita.

### Stack

| Área | Tecnologias |
|---|---|
| Backend | Python 3.14, Django 6 e Django REST Framework |
| Frontend | React 19, TypeScript 6, Vite 8 e TanStack Query |
| Dados do painel | PostgreSQL 18; SQLite no desenvolvimento nativo |
| Banco do jogo | MySQL, habilitado opcionalmente |
| Processamento | Redis, Celery, Django Channels e Daphne |
| Produção | Docker Compose, Gunicorn e Nginx |
| Qualidade | Pytest, Ruff, Vitest e build TypeScript |

## Compatibilidade com o Lineage 2

O banco do PDL permanece separado do banco do jogo. Quando a integração está ativa,
o backend seleciona um catálogo de consultas adequado ao schema configurado.

Módulos disponíveis atualmente:

- `lucerav2`
- `dreamv3`
- `mobius`

Configure o módulo em `.env`:

```env
LINEAGE_DB_ENABLED=true
LINEAGE_QUERY_MODULE=lucerav2
```

Cada fork precisa de consultas compatíveis com suas tabelas e colunas. Não selecione
um módulo apenas pelo nome da crônica: confirme o schema e teste primeiro com uma base
de desenvolvimento.

Com `LINEAGE_DB_ENABLED=false`, o painel funciona sem acessar personagens e itens do
jogo. Essa configuração é adequada para desenvolvimento da interface e das funções
que dependem somente do banco do PDL.

## Formas de implantação

### Stack completa em VPS

É o modo principal de produção. Docker Compose executa frontend compilado, Nginx,
Django, Daphne, Celery, Redis e PostgreSQL na mesma infraestrutura. O MySQL do jogo
pode estar na própria rede ou em outro servidor com acesso restrito.

### Frontend separado

O build de `frontend/dist` pode ser publicado como conteúdo estático em cPanel, CDN
ou storage estático. O backend permanece em uma VPS ou infraestrutura centralizada.

Nesse modelo, configure HTTPS, fallback da SPA e encaminhamento de `/api/`, `/ws/` e
`/media/` para o backend. Também ajuste `ALLOWED_HOSTS`, CORS, CSRF, WebAuthn e as URLs
públicas para os domínios reais.

Consulte o guia de [implantação](docs/deployment.md) antes de escolher a topologia.

## Início rápido com Docker

### Pré-requisitos

- Git.
- Docker Engine ou Docker Desktop com Compose v2.
- Portas `80` e `3000` disponíveis para o ambiente de desenvolvimento.

### Windows PowerShell

```powershell
git clone https://github.com/D3NKYT0/pdlpro.git
Set-Location pdlpro
Copy-Item .env.example .env
docker compose --profile dev up --build
```

### Linux, macOS ou WSL

```bash
git clone https://github.com/D3NKYT0/pdlpro.git
cd pdlpro
cp .env.example .env
docker compose --profile dev up --build
```

As migrações são executadas pelo entrypoint do backend. Depois que os containers
estiverem saudáveis, crie o primeiro administrador:

```bash
docker compose exec backend python manage.py createsuperuser
```

### Endereços locais

| Serviço | URL |
|---|---|
| Aplicação via Nginx | <http://localhost> |
| Frontend Vite | <http://localhost:3000> |
| Django Admin | <http://localhost/admin/> |
| Swagger UI | <http://localhost/api/docs/swagger-ui/> |
| ReDoc | <http://localhost/api/docs/redoc/> |
| Health check | <http://localhost/api/v1/system/health/> |

Para encerrar o ambiente sem apagar os volumes:

```bash
docker compose down
```

> [!CAUTION]
> Não use `docker compose down -v` sem intenção explícita de apagar bancos, Redis,
> mídia e outros volumes locais.

## Configuração inicial

O arquivo `.env.example` documenta as variáveis disponíveis. Antes de qualquer
implantação, revise pelo menos:

- `SECRET_KEY`, `DEBUG` e `DJANGO_SETTINGS_MODULE`;
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` e `CSRF_TRUSTED_ORIGINS`;
- PostgreSQL e Redis;
- acesso ao MySQL do Lineage 2 e `LINEAGE_QUERY_MODULE`;
- domínio, URLs públicas e WebAuthn;
- SMTP, Web Push e provedores de autenticação;
- Mercado Pago, Stripe e métodos de pagamento habilitados.

Não reutilize os valores de desenvolvimento em produção. Segredos, credenciais e
dumps de jogadores nunca devem ser enviados ao repositório.

Os scripts operacionais também podem preparar e manter uma instalação:

```bash
./setup.sh help
./setup.sh install
./setup.sh deploy --dev
./setup.sh configure-production
./setup.sh deploy --production
./setup.sh backup
```

## Testes e qualidade

Backend:

```bash
cd backend
ruff check .
pytest
python manage.py check
python manage.py makemigrations --check --dry-run
```

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm run test:run -- --passWithNoTests
npm run build
```

Consulte [Desenvolvimento](docs/development.md) para execução nativa, testes e comandos
de manutenção.

## Estrutura do repositório

```text
.
├── backend/
│   ├── apps/            # Módulos e regras de negócio
│   ├── common/          # DI, contratos, middleware e utilitários
│   ├── core/            # Settings, URLs, ASGI e composição
│   └── data/items/      # Catálogo XML de itens
├── frontend/            # SPA React + TypeScript
├── docs/                # Documentação técnica e operacional
├── nginx/               # Proxy HTTP e WebSocket
├── scripts/             # Instalação, deploy, backup e restauração
├── docker-compose.yml   # Desenvolvimento e integração
├── docker-compose.prod.yml
├── setup.sh
└── version.json         # Versões do produto e da API
```

## Documentação

| Documento | Conteúdo |
|---|---|
| [Índice](docs/README.md) | Mapa da documentação e fontes da verdade |
| [Desenvolvimento](docs/development.md) | Instalação nativa, execução e testes |
| [Configuração](docs/configuration.md) | Variáveis, itens, integrações e permissões |
| [API](docs/api.md) | Rotas, autenticação, paginação e erros |
| [Arquitetura](docs/architecture.md) | Camadas, módulos, DI e fluxo de implementação |
| [Implantação](docs/deployment.md) | Produção, proxy, segurança, backup e rollback |
| [Programas e recompensas](docs/programs-and-rewards.md) | Apoiadores, passe, bônus, pesca e carteira ↔ jogo |
| [Catálogo de itens](backend/data/items/README.md) | XMLs, customs, API, ícones e cache |
| [Changelog](CHANGELOG.md) | Histórico de alterações |

## Contribuição e segurança

Leia [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir uma alteração. Pull requests
devem explicar o problema, a solução, os riscos e os testes executados.

Vulnerabilidades não devem ser publicadas em issues. Use o processo descrito em
[SECURITY.md](SECURITY.md).

## Licença

Copyright © 2026 Daniel Amaral.

O PDL PRO utiliza uma [licença source-available](LICENSE):

- é permitido acessar, baixar e estudar o código;
- é permitido instalar e usar o PDL em servidor próprio ou administrado pelo usuário;
- é permitido modificar o código para uso próprio;
- é permitida a redistribuição gratuita nas condições da licença;
- é proibido vender, revender, sublicenciar ou incluir o PDL em produto pago;
- é proibido oferecer o próprio PDL ou suas funcionalidades principais como serviço
  pago sem autorização expressa do autor.

Receber doações ou pagamentos relacionados ao jogo não caracteriza, por si só,
comercialização do PDL. A restrição se aplica à comercialização do painel, do código,
do acesso, da hospedagem ou de serviços baseados no próprio PDL.

Esta licença disponibiliza o código-fonte, mas não é uma licença de software livre
nem uma licença open source aprovada pela Open Source Initiative. Leia o arquivo
[LICENSE](LICENSE) completo antes de usar ou redistribuir o projeto.
