# Implantação

[← Índice da documentação](../README.md)

Para instalar uma **tag publicada** (ZIP + imagens no GHCR, sem build no
servidor), use o [guia de distribuição](distribuicao.md). As seções abaixo
descrevem o deploy a partir do clone Git.

## Formas de implantação

### Stack completa em VPS

É o modo principal de produção. Docker Compose executa frontend compilado, Nginx,
Django, Daphne, Celery, Redis e PostgreSQL na mesma infraestrutura. O MySQL do jogo
pode estar na própria rede ou em outro servidor com acesso restrito.

### Frontend separado

O build de `frontend/dist` pode ser publicado como conteúdo estático em cPanel, CDN
ou storage estático. O backend permanece em uma VPS ou infraestrutura centralizada.

Nesse modelo, configure HTTPS, fallback da SPA e encaminhamento de `/api/`, `/admin/`,
`/i18n/`, `/ws/` e `/media/` para o backend. Sem `/i18n/`, o seletor de idioma do admin
(POST `/i18n/setlang/`) cai no estático da SPA e o Nginx responde **405**. Também ajuste
`ALLOWED_HOSTS`, CORS, CSRF, WebAuthn e as URLs públicas para os domínios reais.

As próximas seções detalham a implantação pelo Compose de produção. Para recuperar dados, consulte [Backup e restauração](backup-e-restauracao.md).

Temas instalados não fazem parte de `frontend/dist`: CSS e assets são mídia dinâmica
servida em `/media/themes/`. Em uma topologia separada, o frontend precisa alcançar esse
caminho no mesmo domínio lógico da API ou por proxy compatível.

## Modos do Compose

- `docker-compose.yml`: desenvolvimento e integração, com Vite no perfil `dev`.
- `docker-compose.prod.yml`: produção, com frontend compilado, Django em settings
  de produção e Nginx interno atrás do proxy reverso HTTPS.
- `docker-compose.ollama.yml`: complemento opcional com Qwen local. Use quando a
  máquina aguentar o modelo; caso contrário, configure a API remota ou deixe a
  geração desligada. O overlay não é removido da implantação.

O domínio padrão da produção é `pdl.denky.dev.br`, mas pode ser alterado pela
variável `DOMAIN`.

## Topologia atual

```text
Internet/local host
       │ :80
  Proxy reverso HTTPS
       │ HTTP :8080
  Nginx interno
       ├── /api, /admin ──> Gunicorn :8000
       ├── /ws ───────────> Daphne :8001
       ├── /static, /media
       └── / ─────────────> React estático

Gunicorn/Daphne/Celery ──> PostgreSQL + Redis
                       └─> MySQL Lineage 2 (opcional)
```

## Primeira implantação

Antes do deploy:

1. Crie um registro DNS `A` para `pdl.denky.dev.br` apontando para o IPv4 do
   servidor (e `AAAA` somente se o IPv6 funcionar no servidor).
2. Permita que o servidor do proxy reverso alcance a porta TCP `8080` do PDL.
   Essa porta não deve ser publicada para toda a internet.
3. Instale Docker Engine com o plugin Docker Compose v2.

O certificado e a configuração Cloudflare ficam sob responsabilidade do proxy
reverso externo. Ele deve encaminhar `Host`, `X-Forwarded-For` e
`X-Forwarded-Proto: https`, além de suportar upgrade de WebSocket.

No servidor:

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
só para subir o Postgres. O Docker deve estar em execucao para que a senha
do banco seja sincronizada com o PostgreSQL. Para substituir segredos expostos:

```bash
./setup.sh configure-production --rotate-secrets
```

Tambem e possivel rotacionar apenas um segredo:

```bash
./setup.sh configure-production --rotate-secret-key
./setup.sh configure-production --rotate-db-password
```

`PDL_DATA_ENCRYPTION_KEY` e `BACKUP_ENCRYPTION_KEY` são geradas se estiverem vazias
ou fracas. `--rotate-secret-key` e `--rotate-secrets` **não** as trocam: rotacionar a
Fernet sem regravar TOTP, códigos de recuperação e pacotes LGPD impede a leitura.

Em uma instalacao existente, a rotacao atualiza o role PostgreSQL, grava o novo
`.env` e recria os servicos dependentes. Se alguma etapa falhar, o comando tenta
restaurar tanto a senha anterior do banco quanto o arquivo de configuracao.

O configurador nao apaga nem sobrescreve chaves que ja existem no `.env`,
exceto as de producao que ele mesmo gerencia (`DEBUG`, hosts, URLs publicas,
Django settings) e as flags do Denkynho que voce passar. Variaveis novas do
`.env.example` sao acrescentadas no final. `DENKYNHO_EMBEDDINGS_ENABLED`, se
ainda nao existir, entra como `false` para nao baixar MiniLM no primeiro chat.
A geracao continua desligada ate voce passar `--denkynho-provider`.

Para ligar uma API remota (Groq, OpenAI ou outro endpoint `/v1`) sem mexer
no dominio nem nos segredos ja definidos:

```bash
./setup.sh configure-production --yes \
  --denkynho-provider remote \
  --denkynho-api-url https://api.groq.com/openai/v1 \
  --denkynho-api-key gsk-... \
  --denkynho-model openai/gpt-oss-20b
```

Ollama local: `--denkynho-provider ollama`. Para so acrescentar chaves
ausentes, rode o comando sem flags do Denkynho. A chave da API nunca e
impressa nos logs.

O resultado relevante sera equivalente aos valores abaixo:

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

Inicie a aplicação. Reserve disco para imagens, cache de build e, se usar
Ollama, os pesos do modelo. Um `pip install` com PyTorch CUDA esgota VPS
pequenas; o backend pinna a wheel CPU. Se o build falhar com
`No space left on device`, siga [espaço em disco no build](solucao-de-problemas.md#espaço-em-disco-no-build-docker)
antes de repetir o `up --build`.

```bash
./setup.sh install --production
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100 web backend
```

Sem `PDL_BACKEND_IMAGE` / `PDL_WEB_IMAGE`, o Compose constrói
`pdl_backend:local` e `pdl_web:local`. Com as variáveis da [release](distribuicao.md),
`deploy --production` passa a puxar as imagens publicadas.

O Compose publica o painel em `http://127.0.0.1:8080`. Na mesma máquina Ubuntu,
o Nginx do sistema faz o HTTPS:

```bash
cd /opt/pdlpro
./setup.sh nginx --yes --ssl --email voce@painel.exemplo.com
```

Sem flags o comando pergunta domínio, porta, `www` e SSL. `--domain` e `--port`
vêm do `.env` se você omitir. `--ssl` emite Let's Encrypt sem o Certbot
reescrever o site. O DNS `A` precisa apontar para este servidor.

O arquivo único fica em `/etc/nginx/sites-available/pdlpro` (HTTP, HTTPS,
WebSocket, ACME e recusa de outros `Host`). Não publique a porta `8080` na
internet.

Se o proxy estiver em outro host, aponte-o para `http://IP_PRIVADO_DO_PDL:8080`
com os mesmos cabeçalhos. Depois acesse `https://painel.exemplo.com` e crie o admin:

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

O launcher (arquivos para download) usa o mesmo estilo: um comando e um
`vsftpd.conf`. Sem flags o assistente pergunta pasta, usuário e senha.

```bash
./setup.sh ftp --yes --password-file /root/ftp.secret
./setup.sh ftp --yes --http --domain launcher.painel.exemplo.com --ssl --email voce@painel.exemplo.com
```

`--http` publica `/var/www/launcher` com index no Nginx (`pdlpro-launcher`), sem
misturar com o site do painel. FTPS opcional: `--ftps`.

## Atualizações

Faça backup antes de aplicar uma nova versão:

```bash
cd /opt/pdlpro
./setup.sh backup
git pull --ff-only
./setup.sh deploy --production
```

## Checklist de produção

### Aplicação

- Defina `DJANGO_SETTINGS_MODULE=core.settings.production`.
- Gere um `SECRET_KEY` longo, aleatório e exclusivo; os settings de produção recusam iniciar com
  valor vazio, marcador de exemplo ou menos de 50 caracteres.
- Defina `REDIS_PASSWORD`: o Compose de produção sobe o Redis com `--requirepass` e o
  `deploy.sh` interrompe quando a senha tem menos de 16 caracteres.
- Configure `ALLOWED_HOSTS`, CORS, CSRF e WebSocket com os domínios reais.
- Use `GUNICORN_RELOAD=false`.
- Execute `python manage.py check --deploy`.
- Decida como migrações serão serializadas entre réplicas; evite múltiplos containers migrando simultaneamente.
- Execute e verifique `collectstatic`.

### Frontend e proxy

- Gere o frontend com `npm ci && npm run build`.
- Sirva `frontend/dist` por Nginx, CDN ou storage estático; não use Vite em produção.
- Configure fallback da SPA para `index.html`.
- Ajuste `server_name` e os limites de upload.
- Preserve o `limit_req` da API e dimensione sua zona somente após observar tráfego legítimo.
- Preserve a CSP do proxy alinhada a `CONTENT_SECURITY_POLICY` (SPA/API) e
  `CONTENT_SECURITY_POLICY_HTML` (admin/docs) do Django; teste pagamentos,
  CAPTCHA, fontes e vídeo ao acrescentar ou remover uma origem.
- Termine TLS no proxy e preserve corretamente os cabeçalhos `X-Forwarded-*`.
- Garanta upgrade de conexão em `/ws/`.
- Encaminhe `/media/themes/` ao backend/Nginx de mídia e aceite uploads ZIP de até 32 MB
  na rota administrativa, sem tornar `/app/media` gravável pelo processo do frontend.

### Dados e filas

- Use PostgreSQL e Redis gerenciados ou com persistência, autenticação e rede privada.
- Restrinja o MySQL do Lineage aos hosts e permissões necessários.
- Execute worker Celery e Celery Beat separadamente se o fechamento automático de leilões estiver habilitado.
- Defina política de retry, observabilidade e fila de falhas para tarefas críticas.
- Faça backups automáticos de banco e mídia e teste a restauração.
- Preserve o volume `media_files`: ele contém versões de temas instaladas e outros uploads.
  O entrypoint cria `/app/media/themes` e ajusta sua permissão no primeiro deploy.
- Preserve o volume `private_files` (`/app/private`, modo 700): guarda os pacotes de
  portabilidade LGPD, que só saem pela view com token assinado e não são servidos em `/media/`.

### Integrações

- Remova `mock` de `PAYMENT_METHODS` em produção.
- Valide assinaturas de webhooks e use endpoints HTTPS públicos.
- Ative Mercado Pago/Stripe somente após testes de pagamento, duplicidade, cancelamento e estorno.
- Configure backend SMTP real e monitore rejeições.
- Proteja a chave VAPID privada como segredo.
- Escolha o modo do Denkynho: Ollama local, API remota (`DENKYNHO_LLM_API_KEY` no
  cofre) ou geração desligada. `DENKYNHO_EMBEDDINGS_ENABLED` é independente; o
  padrão de produção evita baixar MiniLM no primeiro chat, mas pode ser ligado.

### Segurança e observabilidade

- Armazene segredos em cofre/secret manager, nunca na imagem ou no Git.
- Centralize logs sem tokens, senhas ou dados de pagamento.
- Monitore latência, erros 5xx, fila Celery, conexões e espaço em disco.
- Use `X-Request-ID` para correlação entre proxy e aplicação.
- Restrinja ou proteja admin e documentação OpenAPI conforme o ambiente.
- Confirme que `OPENAPI_DOCS_PUBLIC=false` devolve 401 ao visitante e permite acesso à equipe.
- Aplique atualizações de segurança e siga [SECURITY.md](../projeto/seguranca.md).

## Verificação após implantação

1. Consulte `/api/v1/system/health/` e `/api/v1/system/version/`.
2. Faça cadastro/login e confirme cookies `Secure`, `HttpOnly` e política `SameSite`.
3. Exercite uma requisição mutável para validar CSRF.
4. Teste a renovação e o logout da sessão.
5. Abra um WebSocket autenticado e confirme rejeição de origem indevida.
6. Verifique conectividade do Lineage com uma operação somente leitura.
7. Faça transação de pagamento em sandbox antes de ativar o modo real.
8. Confirme envio de e-mail, push, tarefa Celery e restauração de backup.
9. Consulte `/api/v1/public/theme/`, instale um pacote de homologação, ative-o e restaure
   o default; confira páginas públicas, login, jogador e administração em desktop/celular.

## Rollback

Mantenha imagens versionadas e trate migrações destrutivas em etapas compatíveis com a versão anterior. Antes de cada release:

- registre a versão implantada de `version.json`;
- crie backup verificável;
- documente se a migração permite downgrade;
- defina como reverter frontend, backend e workers juntos;
- não reverta código que dependa de uma migração irreversível sem um plano de dados.
