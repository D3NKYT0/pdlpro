# Desenvolvimento

[← Índice da documentação](../README.md)

Para entender como usar e estender as classes do backend, consulte os guias de [apps](../arquitetura/apps.md) e [common](../arquitetura/common.md), além das docstrings no código.

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

O [guia de testes](testes.md) explica os ambientes isolados, os comandos de Pytest e Vitest, a cobertura e os critérios de validação. Execute a suíte relevante antes de propor uma mudança.

## Migrações e dados iniciais

Após mudar models:

```powershell
cd backend
python manage.py makemigrations
python manage.py migrate
```

Revise o arquivo de migração antes do commit. Algumas migrações do projeto também semeiam configurações, recompensas, minigames e pacotes de moedas; não as edite depois de publicadas.

## Solução de problemas

Consulte o [guia de diagnóstico](../operacao/solucao-de-problemas.md) para falhas de conexão, sessão, Redis, ícones e integrações.

### Inicialização pelo BAT no Windows

Execute `start-dev.bat` na raiz. Antes de iniciar os servidores, ele chama
`scripts/setup-python.bat`, cria `backend/.venv` se necessário, atualiza o pip,
executa `pip install --upgrade -r backend/requirements.txt` e verifica conflitos
com `pip check`. Essa sincronização acontece em toda inicialização, mesmo quando
o arquivo de dependências não mudou. Uma falha interrompe a inicialização.

As versões fixadas com `==` no `requirements.txt` são respeitadas. Para adotar
uma versão mais recente da aplicação, atualize esse arquivo e valide a suíte;
o BAT instalará essa versão na próxima execução. A preparação exige acesso ao
índice de pacotes. Para preparar somente o Python, execute `scripts/setup-python.bat`.

O teste isolado do bootstrap roda com
`backend\.venv\Scripts\python.exe scripts\test_setup_python.py` no Windows.
Ele cria um ambiente temporário, simula somente o pip e verifica criação,
repetição da sincronização e interrupção em falhas, sem instalar pacotes pela rede.
