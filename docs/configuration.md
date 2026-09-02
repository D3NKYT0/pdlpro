# Configuração

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

### Schema Dream v3

O catálogo `dreamv3` corresponde à estrutura verificada no banco `l2jdreamv3`:

- Personagens: `characters.obj_Id`; nível/classe base em `character_subclasses`.
- Clãs: nome e líder em `clan_subpledges` com `type = 0`.
- Itens: `item_id` identifica a instância; `item_type` identifica o template;
  quantidade em `amount`, localização em `location` e equipamento em `slot`.
- Entrega: `items_delayed.owner_id`, `enchant_level` e `payment_id` AUTO_INCREMENT.
- Olimpíadas: `oly_nobles.points_current` e `oly_heroes`.
- Contas: `email`, `linked_uuid` e `created_time`.

O catálogo contém 42 consultas, incluindo mundo, clãs, equipamentos e observação administrativa. Não escolha
o módulo apenas pelo nome do banco: outras distribuições chamadas Dream podem
usar estruturas diferentes. Nenhuma alteração de schema do jogo é aplicada pelo painel.

Os testes locais usam uma representação do schema em memória. A validação no
MySQL pode usar `EXPLAIN` (sem `ANALYZE`) para conferir os planos das consultas,
sem executar INSERT/UPDATE/DELETE. Isso não substitui um teste de integração
controlado de cadastro, login no jogo e consumo da fila `items_delayed`.
O módulo mantém SHA1 para novas senhas; confirme o algoritmo no loginserver
antes de liberar cadastro/troca de senha, especialmente em bancos com hashes mistos.

### Observar itens no painel administrativo

Em `/painel/admin`, acesse **Servidor → Observar itens** (`/painel/admin/itens`).
Esta é uma tela operacional nativa do frontend, não uma tela do Django Admin.
O painel traz a
observação de inflação do projeto SITE: totais por localização, busca por nome/ID,
quantidade mínima, categorias, ordenação, favoritos pessoais e comparação entre
snapshots diários. Os nomes vêm do catálogo XML configurado em `LINEAGE_ITEM_XML_DIR`, agregado aos customs ativos do banco;
itens sem nome conhecido aparecem como `Item <ID>`.
Todas as telas e autocompletes consomem o catálogo canônico em
`/api/v1/public/items/catalog/`. A API resolve ID, nome, tipo, grau, negociação e
`icon_url`, incluindo aliases e imagem padrão. O frontend não monta URLs de ícones
nem mantém JSON próprio. Ícones XML permanecem assets estáticos em `/item-icons/`; imagens dos customs ficam em `/media/custom-items/`.
Itens desconhecidos
mostram “Fora do catálogo”. O grau/tipo exibido no histórico é do catálogo atual; nomes e quantidades
salvos no snapshot são preservados. Após trocar arquivos XML, reinicie o backend
para recarregar o catálogo em cache. O cache compartilhado do navegador tem validade
de 60 segundos e revalida ao voltar à aba ou montar um consumidor.
APIs de loja/carrinho, inventário, equipamentos, leilões, marketplace, jogos/recompensas
e configuração staff enriquecem seus dados com o mesmo catálogo; preços, quantidades,
IDs de registros e valores históricos não são alterados.
O XML contém referências a texturas do cliente,
não as imagens: itens definidos por XML precisam de seu JPG em `frontend/public/item-icons/`.
Customs cadastrados no painel usam a imagem enviada para media, sem rebuild do frontend.

### Cadastro de itens customizados

Em **Servidor → Itens customizados** (`/painel/admin/itens/customs`), informe ID no jogo,
nome, imagem, tipo, grau, negociação e metadados adicionais em JSON. O JSON é público:
não inclua senhas, tokens ou informações privadas. Limite: objeto de até 16 KB.

A migration `server.0004` cria `CustomCatalogItem` no banco PDL. Não cria tabelas nem itens
no L2. O mesmo ID precisa ser configurado no game server e no cliente para uso no jogo.
O ID é único, positivo, permanente e não pode coincidir com um ID do XML. Se novos XML
passarem a definir esse ID posteriormente, o XML prevalece e o editor indica o conflito.

Imagens PNG/JPEG/WebP estáticas de até 2 MB e 1024 × 1024 são verificadas e regravadas
como PNG, sem metadados embutidos ou nomes de arquivo do usuário, em
`media/custom-items/<ID>/<uuid>.png`. Os volumes de media devem estar persistidos e
incluídos nos backups junto ao banco. Imagens substituídas são preservadas; limpeza
de versões antigas exige uma operação de manutenção separada.

O catálogo único agrega XML e customs ativos, com uma leitura do banco por requisição
e sem cache de customs entre requisições/processos. O cadastro invalida o cache ativo
do frontend; as consultas do catálogo revalidam o cache HTTP. Não exige reiniciar o
backend para criar, editar ou desativar customs. Outros clientes atualizam ao voltar
à aba/remontar o catálogo após seu stale-time de 60 segundos.

Desativar remove do catálogo, sem excluir dados ou imagens; IDs inativos continuam
reservados e podem ser reativados. Itens ausentes do catálogo não são considerados
negociáveis pelo fluxo de inventário. O acesso exige staff e `server.view_customcatalogitem`;
cadastrar exige `server.add_customcatalogitem`, editar/ativar/desativar exige
`server.change_customcatalogitem`. Superusuários possuem todas essas permissões.

As consultas são SELECTs executados em uma transação MySQL somente leitura.
Os módulos `dreamv3`, `lucerav2` e `mobius` possuem SQL específico para seus schemas.
O recorte inclui INVENTORY, WAREHOUSE e PAPERDOLL de personagens com accesslevel=0,
além de CLANWH com dono válido em clan_data. Pets, correio, itens de GM e itens
órfãos não fazem parte desse recorte. O inventário do painel aparece separado como SITE.
Uma captura com mais de 100 mil grupos é recusada, nunca salva parcialmente.

Favoritos são privados por usuário e origem L2. Categorias e snapshots são salvos
somente no banco do painel; nenhuma migration modifica o banco do jogo. Há no máximo
um snapshot por dia/origem. Categorias são preservadas pelo nome no histórico, mesmo
se forem excluídas depois. Comparações exigem a mesma origem e datas crescentes.
Uma entrada sem quantidade anterior aparece como “Novo”, sem percentual artificial.

Além do acesso à área staff, a equipe precisa de `server.view_itemobservationsnapshot` para
consultar o painel e `server.capture_itemobservationsnapshot` para criar snapshots.
Criar, editar e excluir categorias exige respectivamente `server.add_itemobservationcategory`,
`server.change_itemobservationcategory` e `server.delete_itemobservationcategory`.
Excluir snapshots exige `server.delete_itemobservationsnapshot`.
Superusuários já possuem todas essas permissões. Elas podem ser atribuídas a grupos
ou usuários; os dados de observação não são gerenciados pelo Django Admin.
As APIs em `/api/v1/staff/item-observation/` verificam as permissões em cada operação;
as escritas autenticadas por cookie exigem CSRF. Quantidades são retornadas como texto
para preservar a precisão de inteiros grandes no navegador.
O deploy de produção aplica a migration `server.0003` e recompila o frontend.
Quem já aplicou essa migration mantém categorias, favoritos e snapshots existentes.

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
