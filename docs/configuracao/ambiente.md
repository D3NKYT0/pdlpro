# Configuração

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md)

> **Atualizado:** 25 de setembro de 2026

> [!TIP]
> Operador na VPS: instale pela [Release](../operacao/distribuicao.md) e
> preencha provedores pelos [tutoriais](../tutoriais/README.md) /
> `/panel/admin/integrations`. Esta página é o **mapa de variáveis**, não o
> passo a passo.

## Carregamento

O backend lê variáveis do ambiente e também procura arquivos `.env` na raiz do repositório e dentro de `backend/`. Comece copiando `.env.example` para `.env` na raiz.

No Docker Compose, valores definidos em `environment:` têm precedência sobre `env_file`. Por isso, banco e Redis usam hostnames internos como `db` e `redis` mesmo quando alguns valores locais são diferentes.

## Configuração principal

| Variável | Finalidade | Desenvolvimento |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | Seleciona settings de development, test ou production | `core.settings.development` |
| `SECRET_KEY` | Assinatura criptográfica do Django | Trocar o valor de exemplo; produção recusa iniciar com valor vazio, com marcador de exemplo (`django-insecure`, `change-me`) ou menor que 50 caracteres |
| `SECRET_KEY_FALLBACKS` | CSV de chaves anteriores (soft-rotate) | Vazio; preenchido por `--rotate-secret-key` |
| `SECRET_KEY_AUTO_ROTATE_DAYS` | Dias entre rotações automáticas (Beat); `0` desliga | `0` |
| `PDL_DATA_ENCRYPTION_KEY` | Fernet (URL-safe Base64 de 32 bytes) para TOTP, códigos de recuperação 2FA e pacotes LGPD em disco | Vazio no exemplo; o configurador de produção gera. Soft-rotate separado via `--rotate-data-encryption-key` |
| `PDL_DATA_ENCRYPTION_KEY_FALLBACKS` | MultiFernet: chaves antigas ainda abrem o legado | Vazio |
| `PDL_DATA_HMAC_KEY` | HMAC estável dos códigos de recuperação | Gerada uma vez; não acompanha a Fernet |
| `BACKUP_ENCRYPTION_KEY` | Senha AES-256-CBC dos dumps `./setup.sh backup` | Vazio no desenvolvimento (dump em claro com aviso); obrigatória em produção |
| `BACKUP_ENCRYPTION_KEY_FALLBACKS` | Chaves antigas só para decifrar dumps | Vazio |
| `PDL_ALLOW_RUNTIME_SECRET_ROTATION` | Painel/Beat podem gravar o `.env` | `false` |
| `DEBUG` | Modo de debug nos settings base | `true` |
| `ALLOWED_HOSTS` | Hosts HTTP aceitos, separados por vírgula | `localhost,127.0.0.1` |
| `DATABASE_URL` | Banco principal do painel | `sqlite:///db.sqlite3` |
| `REDIS_URL` | Cache, Channels e broker/result backend Celery | `redis://redis:6379/0` no Compose |
| `REDIS_PASSWORD` | Senha exigida pelo Redis em produção (`--requirepass`); entra também na `REDIS_URL` | vazio em desenvolvimento, onde o Redis não é publicado |
| `PRIVATE_MEDIA_ROOT` | Diretório dos arquivos que nunca são publicados (pacote de portabilidade LGPD) | `backend/private/` |
| `PROJECT_TITLE` | Nome exibido pelo projeto (fallback de identidade) | `PDL PRO` |
| `PROJECT_DESCRIPTION` | Descrição pública inicial | `Painel Definitivo Lineage 2.0` |
| `SITE_SEO_TITLE` | Título da aba / SEO quando o admin e o tema não preenchem | vazio (usa `PROJECT_TITLE`) |
| `SITE_SEO_DESCRIPTION` | Meta description inicial | vazio (usa `PROJECT_DESCRIPTION`) |
| `SITE_OG_IMAGE` | Imagem Open Graph inicial | vazio |
| `DISCORD_URL` | Comunidade Discord (`VITE_DISCORD_URL` ainda vale no build) | vazio |
| `TRAILER_YOUTUBE_ID` | Trailer da home (`VITE_TRAILER_YOUTUBE_ID` ainda vale no build) | vazio |
| `PROJECT_URL` | URL pública do backend/proxy | `http://localhost` |
| `FRONTEND_URL` | URL usada em links enviados ao usuário | `http://localhost:3000` |
| `LEGAL_DOCS_VERSION` | Versão aceita dos documentos legais (bump força reaceitação) | `2026-09-10` |
| `LEGAL_CONTROLLER_NAME` | Razão social / nome do controlador LGPD | `Operador do servidor` |
| `LEGAL_TRADE_NAME` | Nome fantasia / marca do painel no deploy | `PDL PRO` |
| `LEGAL_CNPJ` | CNPJ do controlador | `00.000.000/0000-00` |
| `LEGAL_ADDRESS` | Endereço do controlador | `Brasil` |
| `LEGAL_CONTACT_EMAIL` | E-mail de contato geral | `contato@example.com` |
| `LEGAL_DPO_EMAIL` | E-mail do encarregado (DPO) | `dpo@example.com` |
| `LEGAL_LEGAL_EMAIL` | E-mail jurídico | `juridico@example.com` |
| `LEGAL_FORUM` | Foro eleito nos Termos | `Brasil` |
| `PDL_EXTENSION_APPS` | AppConfigs de cliente sob `extensions.*` (vírgula) | vazio no core; ver [Extensões](../arquitetura/extensoes.md) |
| `VITE_PDL_EXTENSIONS` | IDs SPA das pastas em `frontend/src/extensions/` (vírgula) | vazio no core; o build descobre as pastas, o env só ativa |

`DB_NAME`, `DB_USER` e `DB_PASSWORD` configuram o serviço PostgreSQL do Compose. Fora dele, prefira uma `DATABASE_URL` completa.

## Banco e servidor Lineage 2

| Variável | Descrição |
|---|---|
| `LINEAGE_DB_ENABLED` | Ativa o gateway SQLAlchemy para o banco do jogo |
| `LINEAGE_DB_HOST`, `LINEAGE_DB_PORT` | Endereço do MySQL |
| `LINEAGE_DB_NAME`, `LINEAGE_DB_USER`, `LINEAGE_DB_PASSWORD` | Credenciais do schema Lineage |
| `LINEAGE_DB_SSL` | `false` = TCP atual, sem TLS; `true` = TLS até o MySQL. Escolha explícita; o host remoto não liga sozinho. Guia: [TLS no MySQL do Lineage 2](../integracoes/lineage-mysql-ssl.md) |
| `LINEAGE_DB_SSL_VERIFY` | `true` valida o certificado e o hostname; `false` cifra sem verificar (só rede isolada) |
| `LINEAGE_DB_SSL_CA` | Caminho do PEM da CA visto pelo processo Django (no Compose: `/run/secrets/lineage-mysql/ca.pem`) |
| `LINEAGE_DB_SSL_CERT`, `LINEAGE_DB_SSL_KEY` | Cliente mTLS, se o MySQL exigir `REQUIRE X509` |
| `LINEAGE_QUERY_MODULE` | Catálogo SQL: `lucerav2`, `dreamv3`, `mobius` ou dialeto da extensão |
| `LINEAGE_PASSWORD_ALGO` | Hash de senha nova: vazio (convenção do módulo), `whirlpool` ou `sha1` |
| `LINEAGE_DB_POOL_SIZE` | Conexões permanentes no pool |
| `LINEAGE_DB_MAX_OVERFLOW` | Conexões extras permitidas |
| `GAME_SERVER_IP` | Host usado no status do login/game server |
| `GAME_SERVER_PORT`, `LOGIN_SERVER_PORT` | Portas consultadas por socket |
| `SERVER_STATUS_TIMEOUT` | Timeout, em segundos, para a consulta de porta |
| `FAKE_PLAYERS_FACTOR`, `FAKE_PLAYERS_MIN`, `FAKE_PLAYERS_MAX` | Ajustes opcionais da contagem pública |

Use um usuário MySQL com o menor conjunto de permissões possível. Recursos que alteram conta, senha, personagem ou inventário precisam das permissões específicas exigidas pelas consultas do módulo; rankings e status devem permanecer somente leitura sempre que possível.

### Guias da integração

- [Dialetos, schema e homologação do Lineage](../integracoes/lineage.md).
- [TLS no MySQL do Lineage 2](../integracoes/lineage-mysql-ssl.md).
- [Catálogo XML e itens customizados](../integracoes/catalogo-de-itens.md).
- [Observação de itens e permissões](../funcionalidades/observacao-de-itens.md).
- [Câmbio entre carteira e jogo](../integracoes/cambio-painel-jogo.md).

## Autenticação e origens

Os settings aceitam as seguintes opções, ainda que nem todas apareçam habilitadas no arquivo de exemplo:

| Variável | Descrição |
|---|---|
| `ACCESS_TOKEN_MINUTES` | Duração do access token e do cookie `PDL-auth`; padrão 15 minutos |
| `REFRESH_TOKEN_DAYS` | Duração do refresh token e do cookie `PDL-refresh`; padrão 7 dias |
| `JWT_AUTH_COOKIE` | Nome do cookie de acesso |
| `JWT_AUTH_REFRESH_COOKIE` | Nome do cookie de renovação |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas, separadas por vírgula |
| `CSRF_TRUSTED_ORIGINS` | Origens confiáveis para CSRF |
| `WEBSOCKET_ALLOWED_ORIGINS` | Origens aceitas pelo ASGI/WebSocket |
| `TRUSTED_PROXY_COUNT` | Quantidade esperada de proxies confiáveis |
| `OPENAPI_DOCS_PUBLIC` | `true` libera schema, Swagger e ReDoc; `false` restringe à equipe. `core.settings.production` força `false` mesmo se a variável estiver ligada |
| `SITE_ID` | Site do `django.contrib.sites` |

`core.settings.development` libera CORS e usa cookies não seguros para facilitar o uso local. `core.settings.production` ativa cookies seguros e HSTS; ele deve ficar atrás de HTTPS corretamente configurado.

Os tokens de sessão são entregues somente em cookies `HttpOnly`; respostas de autenticação não
incluem access ou refresh no JSON. O cookie de acesso (`PDL-auth`) usa o `Max-Age` de
`ACCESS_TOKEN_MINUTES`; o de renovação (`PDL-refresh`) usa `REFRESH_TOKEN_DAYS`. Login e cadastro usam, respectivamente, os limites dedicados
de 10/minuto e 10/hora. A CSP é definida em `core.settings.security.build_content_security_policy`:
`script-src` da API e da SPA não inclui `'unsafe-inline'` (o bootstrap da SPA é um arquivo
estático). Admin, schema, Swagger e ReDoc usam `CONTENT_SECURITY_POLICY_HTML`, que ainda
permite script inline do Jazzmin/Spectacular. Produção acrescenta
`upgrade-insecure-requests` e deve permanecer alinhada às configurações Nginx.

## Pagamentos

| Variável | Descrição |
|---|---|
| `PAYMENT_METHODS` | Provedores expostos, como `mock,mercadopago,stripe` |
| `PAYMENT_REUSE_HOURS` | Janela de reaproveitamento de pedidos pendentes |
| `PAYMENT_WEBHOOK_BASE_URL` | Base pública usada para montar callbacks |
| `COINS_PER_USD` | Conversão padrão quando não há configuração no banco |
| `MERCADO_PAGO_ACCESS_TOKEN` | Token privado do Mercado Pago |
| `MERCADO_PAGO_PUBLIC_KEY` | Chave pública do Mercado Pago |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Segredo para validar notificações |
| `MERCADO_PAGO_ACTIVATE_PAYMENTS` | Libera processamento real no provedor |
| `STRIPE_SECRET_KEY` | Chave secreta da Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Chave publicável da Stripe |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do endpoint |
| `STRIPE_ACTIVATE_PAYMENTS` | Libera processamento real no provedor |

Mantenha as flags de ativação como `false` até as credenciais, URLs públicas, assinaturas de webhook e fluxos de estorno terem sido testados. O provedor `mock` é somente para desenvolvimento e testes: mesmo habilitado, só a equipe confirma o crédito no admin financeiro (`/panel/admin/reports/financial/payments`). `PAYMENT_MOCK_AUTO_CONFIRM` não credita o jogador.

## E-mail e Web Push

| Variável | Descrição |
|---|---|
| `EMAIL_BACKEND` | Backend de e-mail do Django; o padrão escreve no console |
| `EMAIL_HOST` | Host SMTP (quando o backend é SMTP) |
| `EMAIL_PORT` | Porta SMTP (padrão `587`) |
| `EMAIL_USE_TLS` | STARTTLS (padrão `true`) |
| `EMAIL_USE_SSL` | SSL implícito (padrão `false`; não combine com TLS) |
| `EMAIL_HOST_USER` | Usuário SMTP |
| `EMAIL_HOST_PASSWORD` | Senha SMTP |
| `DEFAULT_FROM_EMAIL` | Remetente padrão |
| `VAPID_PUBLIC_KEY` | Chave pública entregue ao navegador |
| `VAPID_PRIVATE_KEY` | Chave privada usada para assinar push |
| `VAPID_SUBJECT` | Contato do emissor, normalmente `mailto:` ou URL HTTPS |

As chaves VAPID formam um par e devem ser armazenadas como segredo fora do Git. A funcionalidade de push fica indisponível quando o par não está configurado.

Stripe, Mercado Pago (credenciais e política), Lineage/game, SMTP/VAPID,
OAuth/hCaptcha/WebAuthn, Denkynho, S3/R2 e Sentry também podem ser
gerenciados em runtime pelo painel **Integrações** (`/panel/admin/integrations`),
com blobs Fernet no banco e hot-apply sem restart. O `.env` continua obrigatório
para o bootstrap (`SECRET_KEY`, `DATABASE_URL`, `REDIS_*`, `PDL_DATA_ENCRYPTION_KEY`).
Guia: [Configurador admin de integrações](../operacao/integracoes-admin.md).

## Armazenamento S3 / Cloudflare R2

| Variável | Descrição |
|---|---|
| `USE_S3` | Liga o backend S3-compatível para mídia pública |
| `AWS_ACCESS_KEY_ID` | Access key (R2 ou AWS) |
| `AWS_SECRET_ACCESS_KEY` | Secret key |
| `AWS_STORAGE_BUCKET_NAME` | Nome do bucket |
| `AWS_S3_REGION_NAME` | Região (`auto` no R2) |
| `AWS_S3_ENDPOINT_URL` | Endpoint R2/S3, ex. `https://<accountid>.r2.cloudflarestorage.com` |
| `AWS_S3_CUSTOM_DOMAIN` | Domínio CDN público (opcional) |
| `AWS_S3_PRIVATE_MEDIA` | Usa URLs assinadas (`AWS_QUERYSTRING_AUTH`) |
| `AWS_QUERYSTRING_EXPIRE` | TTL das URLs assinadas (segundos) |
| `AWS_LOCATION` | Prefixo no bucket (padrão `media`) |

Com `USE_S3=false` (padrão), a mídia fica em `MEDIA_ROOT`. Arquivos privados LGPD
permanecem em `PRIVATE_MEDIA_ROOT` no filesystem, mesmo com S3 ativo.

## OAuth e hCaptcha

| Variável | Descrição |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID OAuth do Google (também espelhável via `VITE_GOOGLE_CLIENT_ID`) |
| `GOOGLE_CLIENT_SECRET` | Client secret OAuth do Google |
| `DISCORD_CLIENT_ID` | Client ID OAuth do Discord (também espelhável via `VITE_DISCORD_CLIENT_ID`) |
| `DISCORD_CLIENT_SECRET` | Client secret OAuth do Discord |
| `HCAPTCHA_SITE_KEY` | Site key do hCaptcha (também espelhável via `VITE_HCAPTCHA_SITEKEY`) |
| `HCAPTCHA_SECRET_KEY` | Secret key do hCaptcha; `HCAPTCHA_ENABLED` fica `true` só com o par completo |

## Operação

| Variável | Descrição |
|---|---|
| `DJANGO_LOG_LEVEL` | Nível de log do Django |
| `AUCTION_CLOSE_ENABLED` | Habilita a agenda de fechamento automático de leilões |
| `GUNICORN_RELOAD` | Reload do Gunicorn; somente desenvolvimento |
| `RUN_MIGRATIONS` | Executa migrações no entrypoint do container |
| `RUN_COLLECTSTATIC` | Executa coleta de arquivos estáticos no entrypoint |
| `PDL_IMAGE_REGISTRY` | Registro GHCR das imagens publicadas (`ghcr.io/d3nkyt0/pdlpro`) |
| `PDL_IMAGE_TAG` | Tag SemVer que o instalador grava a partir da latest |
| `PDL_BACKEND_IMAGE` | Imagem completa do backend; vazio usa `pdl_backend:local` |
| `PDL_WEB_IMAGE` | Imagem completa do frontend/Nginx; vazio usa `pdl_web:local` |
| `PDL_IMAGE_PULL_POLICY` | `never` no clone local; `always` no instalador da release |

Temas instalados não exigem uma variável própria. Eles usam `MEDIA_ROOT/themes/` e
`MEDIA_URL`, definidos nos settings Django. Em produção, preserve e compartilhe esse diretório
entre o backend e o proxy que atende `/media/`; `collectstatic` e o build do frontend não copiam
os pacotes. Consulte [Temas instaláveis](../funcionalidades/temas.md).

## Produção

No mínimo:

```dotenv
DJANGO_SETTINGS_MODULE=core.settings.production
DEBUG=false
SECRET_KEY=<segredo-longo-e-aleatorio>
PDL_DATA_ENCRYPTION_KEY=<fernet-urlsafe-32-bytes>
BACKUP_ENCRYPTION_KEY=<senha-longa-dos-dumps>
REDIS_PASSWORD=<senha-longa-e-aleatoria>
ALLOWED_HOSTS=seudominio.com
PROJECT_URL=https://seudominio.com
FRONTEND_URL=https://seudominio.com
CORS_ALLOWED_ORIGINS=https://seudominio.com
CSRF_TRUSTED_ORIGINS=https://seudominio.com
WEBSOCKET_ALLOWED_ORIGINS=https://seudominio.com
GUNICORN_RELOAD=false
RUN_COLLECTSTATIC=true
```

Não reutilize os valores de exemplo e não armazene o `.env` de produção no repositório.
`./setup.sh configure-production --rotate-secret-key --rotate-redis-password` soft-rotaciona a
`SECRET_KEY` (antiga em `SECRET_KEY_FALLBACKS`) e gera a senha do Redis; no Windows,
`scripts/configure-production.ps1` preenche valores fracos ou ausentes.
`PDL_DATA_ENCRYPTION_KEY` e `BACKUP_ENCRYPTION_KEY` são geradas se estiverem vazias ou
fracas e **não** acompanham `--rotate-secret-key`. Use `--rotate-data-encryption-key` +
reencrypt no painel antes de `--prune-data-fallbacks`. Guia:
[Rotação de segredos](../operacao/rotacao-de-segredos.md).
O `deploy.sh` recusa subir sem `REDIS_PASSWORD` e os settings de produção recusam iniciar com
`SECRET_KEY` de exemplo ou sem Fernet válido.

## Denkynho

| Variável | Descrição |
|---|---|
| `DENKYNHO_LLM_ENABLED` | Liga a geração. `false` = só FAQ. Padrão `false` |
| `DENKYNHO_LLM_PROVIDER` | `ollama` (local) ou `remote` (API OpenAI-compatível). Padrão `ollama` |
| `DENKYNHO_EMBEDDINGS_ENABLED` | Liga o MiniLM no worker. Padrão `true` em desenvolvimento e `false` em produção |
| `DENKYNHO_OLLAMA_URL` | Endereço do Ollama; só loopback ou `http://ollama:11434` com o Compose opcional |
| `DENKYNHO_OLLAMA_DOCKER` | Autoriza o hostname Docker `ollama`; não libera outros servidores no modo local |
| `DENKYNHO_LLM_MODEL` | Tag local do Ollama, ou id do modelo remoto (`gpt-4o-mini`, `openai/gpt-4o-mini`, …) |
| `DENKYNHO_LLM_TIMEOUT` | Tempo máximo, em segundos, da chamada ao modelo |
| `DENKYNHO_LLM_API_URL` | Base `…/v1` ou URL completa `…/chat/completions` no modo `remote` |
| `DENKYNHO_LLM_API_KEY` | Bearer da API remota; vazio se o provedor não exigir |
| `DENKYNHO_EMBEDDING_MODEL` | Identificador Hugging Face usado só quando os embeddings estão ligados |

Os três modos (desligado, Ollama local, API remota) permanecem disponíveis em qualquer ambiente. Escolha conforme o hardware e a política de privacidade; não apague o Ollama só porque a VPS atual é pequena. MiniLM é independente: ligue-o se quiser busca semântica, mesmo com a geração desligada.

Em produção, `./setup.sh configure-production` acrescenta chaves ausentes do
`.env.example` sem alterar valores já definidos. Use `--denkynho-provider remote`
(com URL, modelo e chave) ou `--denkynho-provider ollama` para ligar a geração.
Sem essas flags a geração permanece como estava. Consulte
[Ajuda e Denkynho](../funcionalidades/ajuda.md). Em instalação pela Release o
`.env` já nasce pelo instalador; o configurador do `setup.sh` e o
[painel de integrações](../operacao/integracoes-admin.md) cobrem ajustes
posteriores. Detalhe de clone/build:
[Implantação avançada](../operacao/implantacao.md).
