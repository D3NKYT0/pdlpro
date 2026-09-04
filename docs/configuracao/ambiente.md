# Configuração

[← Índice da documentação](../README.md)

## Carregamento

O backend lê variáveis do ambiente e também procura arquivos `.env` na raiz do repositório e dentro de `backend/`. Comece copiando `.env.example` para `.env` na raiz.

No Docker Compose, valores definidos em `environment:` têm precedência sobre `env_file`. Por isso, banco e Redis usam hostnames internos como `db` e `redis` mesmo quando alguns valores locais são diferentes.

## Configuração principal

| Variável | Finalidade | Desenvolvimento |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | Seleciona settings de development, test ou production | `core.settings.development` |
| `SECRET_KEY` | Assinatura criptográfica do Django | Trocar o valor de exemplo |
| `DEBUG` | Modo de debug nos settings base | `true` |
| `ALLOWED_HOSTS` | Hosts HTTP aceitos, separados por vírgula | `localhost,127.0.0.1` |
| `DATABASE_URL` | Banco principal do painel | `sqlite:///db.sqlite3` |
| `REDIS_URL` | Cache, Channels e broker/result backend Celery | `redis://redis:6379/0` no Compose |
| `PROJECT_TITLE` | Nome exibido pelo projeto | `PDL PRO` |
| `PROJECT_URL` | URL pública do backend/proxy | `http://localhost` |
| `FRONTEND_URL` | URL usada em links enviados ao usuário | `http://localhost:3000` |
| `LEGAL_DOCS_VERSION` | Versão aceita dos documentos legais | Data ou versão publicada |

`DB_NAME`, `DB_USER` e `DB_PASSWORD` configuram o serviço PostgreSQL do Compose. Fora dele, prefira uma `DATABASE_URL` completa.

## Banco e servidor Lineage 2

| Variável | Descrição |
|---|---|
| `LINEAGE_DB_ENABLED` | Ativa o gateway SQLAlchemy para o banco do jogo |
| `LINEAGE_DB_HOST`, `LINEAGE_DB_PORT` | Endereço do MySQL |
| `LINEAGE_DB_NAME`, `LINEAGE_DB_USER`, `LINEAGE_DB_PASSWORD` | Credenciais do schema Lineage |
| `LINEAGE_QUERY_MODULE` | Catálogo SQL: `lucerav2`, `dreamv3` ou `mobius` |
| `LINEAGE_DB_POOL_SIZE` | Conexões permanentes no pool |
| `LINEAGE_DB_MAX_OVERFLOW` | Conexões extras permitidas |
| `GAME_SERVER_IP` | Host usado no status do login/game server |
| `GAME_SERVER_PORT`, `LOGIN_SERVER_PORT` | Portas consultadas por socket |
| `SERVER_STATUS_TIMEOUT` | Timeout, em segundos, para a consulta de porta |
| `FAKE_PLAYERS_FACTOR`, `FAKE_PLAYERS_MIN`, `FAKE_PLAYERS_MAX` | Ajustes opcionais da contagem pública |

Use um usuário MySQL com o menor conjunto de permissões possível. Recursos que alteram conta, senha, personagem ou inventário precisam das permissões específicas exigidas pelas consultas do módulo; rankings e status devem permanecer somente leitura sempre que possível.

### Guias da integração

- [Dialetos, schema e homologação do Lineage](../integracoes/lineage.md).
- [Catálogo XML e itens customizados](../integracoes/catalogo-de-itens.md).
- [Observação de itens e permissões](../funcionalidades/observacao-de-itens.md).
- [Câmbio entre carteira e jogo](../integracoes/cambio-painel-jogo.md).

## Autenticação e origens

Os settings aceitam as seguintes opções, ainda que nem todas apareçam habilitadas no arquivo de exemplo:

| Variável | Descrição |
|---|---|
| `ACCESS_TOKEN_MINUTES` | Duração do access token; padrão 15 minutos |
| `REFRESH_TOKEN_DAYS` | Duração do refresh token; padrão 7 dias |
| `JWT_AUTH_COOKIE` | Nome do cookie de acesso |
| `JWT_AUTH_REFRESH_COOKIE` | Nome do cookie de renovação |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas, separadas por vírgula |
| `CSRF_TRUSTED_ORIGINS` | Origens confiáveis para CSRF |
| `WEBSOCKET_ALLOWED_ORIGINS` | Origens aceitas pelo ASGI/WebSocket |
| `TRUSTED_PROXY_COUNT` | Quantidade esperada de proxies confiáveis |
| `SITE_ID` | Site do `django.contrib.sites` |

`core.settings.development` libera CORS e usa cookies não seguros para facilitar o uso local. `core.settings.production` ativa cookies seguros e HSTS; ele deve ficar atrás de HTTPS corretamente configurado.

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

Mantenha as flags de ativação como `false` até as credenciais, URLs públicas, assinaturas de webhook e fluxos de estorno terem sido testados. O provedor `mock` é somente para desenvolvimento e testes.

## E-mail e Web Push

| Variável | Descrição |
|---|---|
| `EMAIL_BACKEND` | Backend de e-mail do Django; o padrão escreve no console |
| `DEFAULT_FROM_EMAIL` | Remetente padrão |
| `VAPID_PUBLIC_KEY` | Chave pública entregue ao navegador |
| `VAPID_PRIVATE_KEY` | Chave privada usada para assinar push |
| `VAPID_SUBJECT` | Contato do emissor, normalmente `mailto:` ou URL HTTPS |

As chaves VAPID formam um par e devem ser armazenadas como segredo fora do Git. A funcionalidade de push fica indisponível quando o par não está configurado.

Parâmetros SMTP como host, porta, TLS, usuário e senha também precisam existir nos settings Django usados pela implantação. Confirme a configuração efetiva com `python manage.py diffsettings` antes de depender de envio real.

## Operação

| Variável | Descrição |
|---|---|
| `DJANGO_LOG_LEVEL` | Nível de log do Django |
| `AUCTION_CLOSE_ENABLED` | Habilita a agenda de fechamento automático de leilões |
| `GUNICORN_RELOAD` | Reload do Gunicorn; somente desenvolvimento |
| `RUN_MIGRATIONS` | Executa migrações no entrypoint do container |
| `RUN_COLLECTSTATIC` | Executa coleta de arquivos estáticos no entrypoint |

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
ALLOWED_HOSTS=painel.exemplo.com
PROJECT_URL=https://painel.exemplo.com
FRONTEND_URL=https://painel.exemplo.com
CORS_ALLOWED_ORIGINS=https://painel.exemplo.com
CSRF_TRUSTED_ORIGINS=https://painel.exemplo.com
WEBSOCKET_ALLOWED_ORIGINS=https://painel.exemplo.com
GUNICORN_RELOAD=false
RUN_COLLECTSTATIC=true
```

Não reutilize os valores de exemplo e não armazene o `.env` de produção no repositório.

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
[Ajuda e Denkynho](../funcionalidades/ajuda.md) e
[Implantação](../operacao/implantacao.md).
