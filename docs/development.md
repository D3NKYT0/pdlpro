# Desenvolvimento

Para entender como usar e estender as classes do backend, consulte os guias de [apps](../backend/apps/README.md) e [common](../backend/common/README.md), além das docstrings no código.

## Pré-requisitos

Escolha Docker ou instalação nativa.

### Docker

- Docker Desktop ou Docker Engine com Compose v2.
- Portas `80` e `3000` livres.

### Instalação nativa

- Python 3.14 recomendado, igual à imagem do backend.
- Node.js 22 e npm compatível.
- Redis apenas para Celery, Channels compartilhado ou configuração semelhante à produção.
- PostgreSQL opcional; o ambiente de desenvolvimento usa SQLite por padrão.

## Preparar o ambiente

Na raiz do repositório, crie o arquivo local de configuração:

```powershell
Copy-Item .env.example .env
```

Em Bash:

```bash
cp .env.example .env
```

O `.env` é ignorado pelo Git. Nunca faça commit de segredos reais.

## Executar com Docker Compose

```powershell
docker compose --profile dev up --build
```

O perfil `dev` inclui o servidor Vite. Os demais serviços — PostgreSQL, Redis, backend WSGI, backend ASGI, worker Celery e Nginx — são iniciados pelo Compose.

Comandos úteis:

```powershell
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py makemigrations --check --dry-run
docker compose exec backend pytest
docker compose logs -f backend
docker compose down
```

Use `docker compose down -v` somente quando quiser apagar deliberadamente os volumes locais de PostgreSQL, Redis, mídia e módulos do frontend.

## Executar nativamente

### Backend no Windows

```powershell
cd backend
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Se o launcher não reconhecer `-3.14`, use o executável Python disponível no sistema. O `manage.py` seleciona `core.settings.development` por padrão.

### Backend em Linux/macOS

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

No modo development, cache e channel layer ficam em memória. Para executar Celery nativamente, disponibilize Redis em `127.0.0.1:6379`, ajuste `REDIS_URL` e inicie processos separados:

```powershell
celery -A core worker -l info
celery -A core beat -l info
```

### Frontend

Em outro terminal:

```powershell
cd frontend
npm ci
npm run dev
```

O Vite abre em <http://localhost:3000> e encaminha `/api` e `/admin` para o backend local na porta `8000`.

## Testes e verificações

Backend:

```powershell
cd backend
ruff check .
pytest
pytest --cov=apps --cov=common --cov-report=term-missing
python manage.py check
python manage.py makemigrations --check --dry-run
```

Frontend:

```powershell
cd frontend
npm run build
npm run test:run -- --passWithNoTests
```

O frontend ainda não possui arquivos `*.test.*` ou `*.spec.*` versionados. A opção `--passWithNoTests` evita uma falha apenas por essa ausência; remova-a assim que a primeira suíte for adicionada. O comando `npm run test` mantém o Vitest em modo interativo.

## Migrações e dados iniciais

Após mudar models:

```powershell
cd backend
python manage.py makemigrations
python manage.py migrate
```

Revise o arquivo de migração antes do commit. Algumas migrações do projeto também semeiam configurações, recompensas, minigames e pacotes de moedas; não as edite depois de publicadas.

## Solução de problemas

### O hostname `redis` não resolve fora do Docker

O `.env.example` é orientado ao Compose. Para Celery ou Redis nativo, use:

```dotenv
REDIS_URL=redis://127.0.0.1:6379/0
```

### O frontend recebe erro de conexão

Confirme que o backend responde em <http://127.0.0.1:8000/api/v1/system/health/> e que o Vite foi iniciado pelo script `npm run dev`.

### O banco do Lineage não está disponível

Mantenha `LINEAGE_DB_ENABLED=false` para desenvolver sem o banco do jogo. Para ativá-lo, confira o módulo de consultas e a conectividade conforme [Configuração](configuration.md).

### Cookies ou CSRF falham

Use o mesmo hostname durante todo o fluxo (`localhost` ou `127.0.0.1`) e verifique as origens CORS/CSRF. Misturar hostnames cria cookies e políticas de origem diferentes.
