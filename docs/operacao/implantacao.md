# Implantação avançada (clone Git e topologias)

[← Índice da documentação](../README.md) ·
[Instalar a partir da Release (recomendado)](distribuicao.md) ·
[Fonte única](../projeto/fonte-unica.md)

> [!CAUTION]
> **Não use este guia para a instalação típica numa VPS.** O caminho
> suportado é a [Release](distribuicao.md). Clone + build são para quem
> desenvolve, publica releases ou precisa de topologia que o instalador não
> cobre.

Este documento cobre:

- topologias (Compose completo, frontend separado);
- modos dos arquivos Compose;
- primeira subida **a partir do clone Git** (build local);
- checklist e verificação de produção;
- atualização e rollback quando o código vem do Git.

HTTPS, administrador, FTP do launcher e atualização pela latest continuam
descritos só em [Distribuição](distribuicao.md) — não os repita daqui.

## Formas de implantação

### Stack completa em VPS (produção habitual)

Docker Compose executa frontend compilado, Nginx interno, Django, Daphne,
Celery, Redis e PostgreSQL. O MySQL do jogo pode estar na mesma rede ou em
outro host com acesso restrito.

**Operadores:** prefira a [Release](distribuicao.md). **Mantenedores:** o
clone abaixo constrói `pdl_backend:local` / `pdl_web:local` quando as
variáveis de imagem da release não estão no `.env`.

### Frontend separado

O build de `frontend/dist` pode ir para cPanel, CDN ou storage estático. O
backend permanece numa VPS ou infraestrutura centralizada.

Nesse modelo, configure HTTPS, fallback da SPA e encaminhamento de `/api/`,
`/admin/`, `/i18n/`, `/ws/` e `/media/` para o backend. Sem `/i18n/`, o
seletor de idioma do admin (POST `/i18n/setlang/`) cai no estático da SPA e
o Nginx responde **405**. Também ajuste `ALLOWED_HOSTS`, CORS, CSRF,
WebAuthn e as URLs públicas.

Temas instalados não fazem parte de `frontend/dist`: CSS e assets são mídia
dinâmica em `/media/themes/`. Em topologia separada, o frontend precisa
alcançar esse caminho no mesmo domínio lógico da API ou por proxy
compatível.

Para recuperar dados, consulte [Backup e restauração](backup-e-restauracao.md).

## Modos do Compose

- `docker-compose.yml`: desenvolvimento e integração, com Vite no perfil
  `dev` — veja também o [Docker de desenvolvimento](../primeiros-passos/docker.md).
- `docker-compose.prod.yml`: produção, com frontend compilado, Django em
  settings de produção e Nginx interno atrás do proxy HTTPS.
- `docker-compose.ollama.yml`: overlay opcional com Qwen local. Use quando a
  máquina aguentar o modelo; senão, API remota ou geração desligada.

O domínio padrão de exemplo nos scripts é `pdl.denky.dev.br`; altere com
`DOMAIN` / `--domain`.

## Topologia atual

```text
Internet/local host
       │ :80/:443
  Proxy reverso HTTPS (Nginx da máquina ou externo)
       │ HTTP :8080
  Nginx interno
       ├── /api, /admin ──> Gunicorn :8000
       ├── /ws ───────────> Daphne :8001
       ├── /static, /media
       └── / ─────────────> React estático

Gunicorn/Daphne/Celery ──> PostgreSQL + Redis
                       └─> MySQL Lineage 2 (opcional)
```

A porta `8080` **não** deve ficar aberta na internet.

## Primeira subida a partir do clone

Pré-requisitos: DNS `A` (e `AAAA` só se o IPv6 funcionar), Docker Engine com
Compose v2, e o proxy (local ou externo) alcançando a porta `8080` do PDL
somente pela rede privada.

Se o TLS fica num proxy externo, ele deve encaminhar `Host`,
`X-Forwarded-For`, `X-Forwarded-Proto: https` e upgrade de WebSocket.

```bash
sudo mkdir -p /opt/pdlpro
sudo chown "$USER":"$USER" /opt/pdlpro
git clone https://github.com/D3NKYT0/pdlpro.git /opt/pdlpro
cd /opt/pdlpro
./setup.sh configure-production
```

Esse comando cria o `.env`, gera os segredos sem exibi-los e salva o arquivo
anterior em `backups/config/`. A senha do Redis é gravada antes de qualquer
`docker compose`, porque o YAML de produção interpola `REDIS_PASSWORD` mesmo
só para subir o Postgres. O Docker deve estar em execução para sincronizar a
senha do banco com o PostgreSQL. Para substituir segredos expostos:

```bash
./setup.sh configure-production --rotate-secrets
```

Também é possível rotacionar só um segredo (soft-rotate da `SECRET_KEY` com
fallbacks):

```bash
./setup.sh configure-production --rotate-secret-key
./setup.sh configure-production --prune-secret-fallbacks
./setup.sh configure-production --rotate-db-password
./setup.sh configure-production --apply-pending-rotations
```

`PDL_DATA_ENCRYPTION_KEY` e `BACKUP_ENCRYPTION_KEY` são geradas se estiverem
vazias ou fracas. `--rotate-secret-key` e `--rotate-secrets` **não** as
trocam: use `--rotate-data-encryption-key` + reencrypt. Detalhes em
[Rotação de segredos](rotacao-de-segredos.md).

Em instalação existente, a rotação atualiza o role PostgreSQL, grava o novo
`.env` e recria os serviços dependentes. Se alguma etapa falhar, o comando
tenta restaurar a senha anterior do banco e o arquivo de configuração.

O configurador não apaga chaves que já existem no `.env`, exceto as de
produção que ele gerencia (`DEBUG`, hosts, URLs públicas, settings Django) e
as flags do Denkynho que você passar. Variáveis novas do `.env.example` são
acrescentadas no final. `DENKYNHO_EMBEDDINGS_ENABLED`, se ainda não existir,
entra como `false` para não baixar MiniLM no primeiro chat. A geração
continua desligada até você passar `--denkynho-provider`.

API remota (Groq, OpenAI ou outro endpoint `/v1`) sem mexer no domínio nem
nos segredos já definidos:

```bash
./setup.sh configure-production --yes \
  --denkynho-provider remote \
  --denkynho-api-url https://api.groq.com/openai/v1 \
  --denkynho-api-key gsk-... \
  --denkynho-model openai/gpt-oss-20b
```

Ollama local: `--denkynho-provider ollama`. Só acrescentar chaves ausentes:
rode sem flags do Denkynho. A chave da API nunca é impressa nos logs.

Resultado típico (valores ilustrativos):

```dotenv
DOMAIN=pdl.denky.dev.br
APP_BIND_ADDRESS=0.0.0.0
APP_HTTP_PORT=8080
SECRET_KEY=valor-aleatorio-com-no-minimo-50-caracteres
DB_NAME=pdl
DB_USER=pdl
DB_PASSWORD=valor-aleatorio-com-no-minimo-16-caracteres
REDIS_PASSWORD=valor-aleatorio-com-no-minimo-16-caracteres
REDIS_URL=redis://:valor-aleatorio-com-no-minimo-16-caracteres@redis:6379/0
ALLOWED_HOSTS=pdl.denky.dev.br
CORS_ALLOWED_ORIGINS=https://pdl.denky.dev.br
CSRF_TRUSTED_ORIGINS=https://pdl.denky.dev.br
PROJECT_URL=https://pdl.denky.dev.br
FRONTEND_URL=https://pdl.denky.dev.br
WEBAUTHN_RP_ID=pdl.denky.dev.br
WEBAUTHN_ORIGINS=https://pdl.denky.dev.br
GUNICORN_RELOAD=false
RUN_COLLECTSTATIC=true
OPENAPI_DOCS_PUBLIC=false
```

Reserve disco para imagens, cache de build e, se usar Ollama, os pesos do
modelo. Um `pip install` com PyTorch CUDA esgota VPS pequenas; o backend
pinna a wheel CPU. Se o build falhar com `No space left on device`, veja
[espaço em disco no build](solucao-de-problemas.md#espaço-em-disco-no-build-docker).

```bash
./setup.sh install --production
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100 web backend
```

Sem `PDL_BACKEND_IMAGE` / `PDL_WEB_IMAGE`, o Compose constrói
`pdl_backend:local` e `pdl_web:local`. Com as variáveis preenchidas pelo
instalador da [Release](distribuicao.md), `deploy --production` puxa as
imagens publicadas.

HTTPS, `createsuperuser` e FTP do launcher: use os mesmos comandos da
[Distribuição](distribuicao.md) na pasta do projeto (`./setup.sh nginx`,
etc.).

## Atualizações

| Origem da instalação | Como atualizar |
| --- | --- |
| Release (`install.sh`) | [Distribuição → Atualizar](distribuicao.md#atualizar) |
| Clone Git | Backup, `git pull --ff-only`, `./setup.sh deploy --production` |

```bash
cd /opt/pdlpro
./setup.sh backup
git pull --ff-only
./setup.sh deploy --production
```

Para publicar uma versão nova para os operadores, siga
[Publicar uma versão](distribuicao.md#publicar-uma-versão-mantenedor).

## Checklist de produção

### Aplicação

- Defina `DJANGO_SETTINGS_MODULE=core.settings.production`.
- Gere um `SECRET_KEY` longo, aleatório e exclusivo; produção recusa valor
  vazio, marcador de exemplo ou menos de 50 caracteres.
- Defina `REDIS_PASSWORD`: o Compose sobe o Redis com `--requirepass` e o
  `deploy.sh` interrompe com senha com menos de 16 caracteres.
- Configure `ALLOWED_HOSTS`, CORS, CSRF e WebSocket com os domínios reais.
- Use `GUNICORN_RELOAD=false`.
- Execute `python manage.py check --deploy`.
- Decida como migrações serão serializadas entre réplicas.
- Execute e verifique `collectstatic`.

### Frontend e proxy

- Gere o frontend com `npm ci && npm run build` (ou use a imagem `web` da
  release).
- Sirva `frontend/dist` por Nginx, CDN ou storage; não use Vite em produção.
- Configure fallback da SPA para `index.html`.
- Ajuste `server_name` e limites de upload.
- Preserve o `limit_req` da API.
- Preserve a CSP do proxy alinhada a `CONTENT_SECURITY_POLICY` e
  `CONTENT_SECURITY_POLICY_HTML`.
- Termine TLS no proxy e preserve `X-Forwarded-*`.
- Garanta upgrade em `/ws/`.
- Encaminhe `/media/themes/` ao backend/Nginx de mídia; uploads ZIP de tema
  até 32 MB na rota administrativa.

### Dados e filas

- PostgreSQL e Redis com persistência, autenticação e rede privada.
- Restrinja o MySQL do Lineage.
- Worker Celery e Beat separados se o fechamento automático de leilões
  estiver habilitado.
- Backups de banco e mídia com restauração ensaiada.
- Preserve `media_files` (temas e uploads) e `private_files` (LGPD).

### Integrações

- Remova `mock` de `PAYMENT_METHODS` em produção.
- Valide webhooks em HTTPS públicos.
- Ative Mercado Pago/Stripe só após testes de pagamento.
- SMTP real e monitoramento de rejeições.
- Proteja a chave VAPID privada.
- Denkynho: Ollama, API remota ou desligado; embeddings são independentes.
- Segredos de pagamento/L2/SMTP/OAuth/S3/Sentry também podem ir pelo
  [configurador admin](integracoes-admin.md) após o bootstrap do `.env`.

### Segurança e observabilidade

Não duplique hardening aqui. Siga:

- [Segurança operacional](seguranca.md) — proxies, sessões, OpenAPI, liquidação
- [Política de segurança](../projeto/seguranca.md) — relato de vulnerabilidade
- [Observabilidade](observabilidade.md) — logs, Sentry, correlação
- [Rotação de segredos](rotacao-de-segredos.md) — soft-rotate e Fernet

## Verificação após subir

1. `/api/v1/system/health/` e `/api/v1/system/version/`.
2. Cadastro/login e cookies `Secure` / `HttpOnly` / `SameSite`.
3. Requisição mutável com CSRF.
4. Renovação e logout da sessão.
5. WebSocket autenticado e rejeição de origem indevida.
6. Lineage somente leitura, se aplicável.
7. Pagamento em sandbox antes do modo real.
8. E-mail, push, Celery e restauração de backup.
9. Tema público: instalar, ativar e restaurar o default.

## Rollback

Mantenha imagens versionadas. Em instalação pela Release, use
`--version X.Y.Z` no instalador após backup. Em clone, trate migrações
destrutivas em etapas compatíveis com a versão anterior. Antes de cada
release:

- registre a versão de `version.json`;
- crie backup verificável;
- documente se a migração permite downgrade;
- reverta frontend, backend e workers juntos;
- não reverta código que dependa de migração irreversível sem plano de dados.
