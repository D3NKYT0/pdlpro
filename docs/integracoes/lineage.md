# Integração com o Lineage 2

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Tutorial do operador](../tutoriais/lineage-game.md) · [Configurador admin](../operacao/integracoes-admin.md)

> **Atualizado:** 25 de setembro de 2026

[Configurador admin](../operacao/integracoes-admin.md)

O banco do PDL permanece separado do banco do jogo. Quando a integração está ativa,
o backend seleciona um catálogo de consultas adequado ao schema configurado.

Módulos disponíveis no core:

- `lucerav2`
- `dreamv3`
- `mobius`

Forks de cliente **não** precisam de um módulo novo no core. Coloque o SQL em
`backend/extensions/<cliente>/infrastructure/lineage/queries/<dialeto>/` e
ative a extensão. Pode ser overlay do mesmo nome (`lucerav2` com só as queries
que mudaram) ou um dialeto completo. Opcional: `manifest.json` com
`core_revision` igual a `LineageQueryCatalog.CONTRACT_REVISION` (hoje `1`);
revisão defasada recusa o catálogo. Detalhe em
[Extensões de cliente](../arquitetura/extensoes.md#dialeto-sql-lineage-na-extensão).

Configure o módulo em `.env`:

```env
LINEAGE_DB_ENABLED=true
LINEAGE_QUERY_MODULE=lucerav2
```

O transporte até o MySQL é escolhido no `.env`: `LINEAGE_DB_SSL=false` mantém o TCP
atual (sem TLS); `LINEAGE_DB_SSL=true` cifra o canal. O guia com certificados, volume
Docker e quando usar cada opção está em [TLS no MySQL do Lineage 2](lineage-mysql-ssl.md).

Cada fork precisa de consultas compatíveis com suas tabelas e colunas. Não selecione
um módulo apenas pelo nome da crônica: confirme o schema e teste primeiro com uma base
de desenvolvimento.

Com `LINEAGE_DB_ENABLED=false`, o painel funciona sem acessar personagens e itens do
jogo. Essa configuração é adequada para desenvolvimento da interface e das funções
que dependem somente do banco do PDL.

## Preparação do schema e colunas do PDL (`ensure_columns`)

O PDL PRO requer três colunas específicas na tabela `accounts` do banco do Lineage 2:

- `email`: `VARCHAR(100) NOT NULL DEFAULT ''` — associação, busca e vínculo por e-mail.
- `created_time`: `INT NULL DEFAULT NULL` — registro do timestamp de criação da conta.
- `linked_uuid`: `VARCHAR(36) NULL DEFAULT NULL` — UUID do usuário no PDL PRO que gerencia a conta do jogo.

### Execução automática transparente

O gateway `SqlAlchemyLineageGateway` implementa `ensure_columns()`. Antes de executar consultas de contas (`get_account`, `find_accounts_by_email`, `register_account`, moderação de personagens, etc.), o sistema inspeciona a tabela `accounts` e adiciona automaticamente as colunas ausentes sem interromper o serviço e sem conflitos (`ALTER TABLE accounts ADD COLUMN ...`). O resultado é memorizado em memória para não onerar as consultas subsequentes.

### Comando management para o operador

O operador também pode rodar a verificação e criação manual a qualquer momento via terminal:

```bash
python manage.py prepare_lineage_database
# Para também provisionar a tabela pdl_exchange_receipts do câmbio de moedas:
python manage.py prepare_lineage_database --with-exchange
```

O probe de teste de conexão em `/panel/admin/integrations` (aba Lineage/Game) também executa a verificação automaticamente e informa no resultado as colunas garantidas.

## Escolha do adaptador

`ServerProvider` registra `ILineageGateway`: sem banco do jogo, usa `NullLineageGateway`, que mantém dados apenas em memória para desenvolvimento; com integração ativa, carrega `LineageQueryCatalog` e `SqlAlchemyLineageGateway`. O status por socket continua separado do acesso SQL.

Os catálogos do core ficam em [queries](../../backend/apps/server/infrastructure/lineage/queries/).
Uma distribuição nova deve manter as consultas obrigatórias e seus contratos de
parâmetros/retorno; veja os [testes de catálogos](../desenvolvimento/testes.md).
SQL de instalação entra na extensão, não nessa pasta.

## Schema Lucera v2

O catálogo `lucerav2` atende distribuições Lucera 2 (Interlude / Classic) em total paridade de consultas com o `dreamv3` (63 consultas SQL):

- **Contas e personagens:** `characters.obj_Id`, `accounts`, vínculos e histórico.
- **Equipamentos e inventário:** `list_character_equipment` lê os itens equipados em `location = 'PAPERDOLL'` utilizando a coluna `slot` (padrão Lucera 2) com contingência automática para `loc_data AS slot` (`list_character_equipment_fallback`) em variantes legadas, alimentando inventário, leilões e vitrine de personagens.
- **Segurança de inventário:** exclusão e decremento de itens (`delete_item_stack`, `update_item_amount`) restritos a `location IN ('INVENTORY', 'WAREHOUSE')`, evitando afetar itens equipados.
- **Lojas offline (Dual Schema):** suporte nativo ao schema oficial Lucera 2:
  - Tabelas: `character_trade_lists` e `character_variables`.
  - Critérios: `characters.online = 0`, variável `offline = '1'`, `storemode` ativo (`1` venda, `3` compra, `4` manufatura/craft) e títulos em `sellstorename`, `buystorename` ou `manufacturename`.
  - Fallback automático: caso a base utilize tabelas legadas (`character_offline_trade` e `character_offline_trade_items`), o gateway aciona automaticamente as consultas de contingência.
  - Ausência de tabelas: quando nenhuma das tabelas de lojas estiver presente, o endpoint `/api/v1/public/server/stores/` responde de forma controlada `{"available": false, "stores": []}` (HTTP 200).

## Schema Dream v3

O catálogo `dreamv3` corresponde à estrutura verificada no banco `l2jdreamv3`:

- Personagens: `characters.obj_Id`; nível/classe base em `character_subclasses`.
- Clãs: nome e líder em `clan_subpledges` com `type = 0`.
- Itens: `item_id` identifica a instância; `item_type` identifica o template;
  quantidade em `amount`, localização em `location` e equipamento em `slot`.
- Entrega: `items_delayed.owner_id`, `enchant_level` e `payment_id` AUTO_INCREMENT.
- Olimpíadas: `oly_nobles.points_current` e `oly_heroes`.
- Contas: `email`, `linked_uuid` e `created_time`.

O catálogo inclui consultas de mundo, clãs, equipamentos e observação administrativa. Não escolha
o módulo apenas pelo nome do banco: outras distribuições chamadas Dream podem
usar estruturas diferentes. As migrações Django não alteram o schema do jogo; o comando administrativo explícito `prepare_game_exchange` cria a tabela de recibos quando executado pelo operador.

Os testes locais usam uma representação do schema em memória. A validação no
MySQL pode usar `EXPLAIN` (sem `ANALYZE`) para conferir os planos das consultas,
sem executar INSERT/UPDATE/DELETE. Isso não substitui um teste de integração
controlado de cadastro, login no jogo e consumo da fila `items_delayed`.
O módulo mantém SHA1 para novas senhas; confirme o algoritmo no loginserver
antes de liberar cadastro/troca de senha, especialmente em bancos com hashes mistos.

## Homologação e operações de escrita

Teste primeiro em um schema de desenvolvimento com a mesma estrutura do servidor. O rollback do Django não desfaz chamadas SQLAlchemy ao jogo. Confirme o algoritmo de senhas, a fila de entrega e a propriedade dos personagens antes de liberar escritas. Para transferências de moedas, siga [o protocolo de câmbio](cambio-painel-jogo.md).

Consulte também [as variáveis de conexão](../configuracao/ambiente.md), [TLS no MySQL](lineage-mysql-ssl.md), [o catálogo de itens](catalogo-de-itens.md) e [a observação de itens](../funcionalidades/observacao-de-itens.md).

## Propriedade e serviços pagos

Nome igual ao login não concede acesso: a conta deve possuir vínculo confirmado no gateway. Nickname, sexo, teleporte, visual, karma e PK reservam saldo antes da chamada externa e aceitam `request_key` para repetição segura. O personagem precisa estar **offline**. UNSTUCK continua gratuito e fixo em Giran; TELEPORT reutiliza o mesmo UPDATE com as coordenadas da vila do catálogo Interlude. APPEARANCE, CLEAR_KARMA, CLEAR_PK e a vitrine de lojas dependem de consultas opcionais no dialeto (`change_appearance`, `clear_karma`, `clear_pk`, `list_private_stores`); se o catálogo não as tiver, o serviço some da ficha e `/stores` informa indisponibilidade. Resultados incertos exigem [conciliação de serviços](../operacao/seguranca.md#serviços-pagos-do-personagem).

A caça do dia só lê o personagem (`pvp`, `pk`, `online_time`, `level`). A vitrine lê as lojas offline quando o dialeto publica essas consultas, devolve sexo/classe para o retrato da raça e as coordenadas XYZ da loja, e o gateway memoriza a lista por 30 segundos. Se as tabelas não existirem no schema, `/stores` responde `available: false` (200) em vez de 500.

## Moderação da equipe

A tela `/panel/admin/moderation` lista personagens (nick, conta, e-mail) e aplica
kick, prisão, banimento e teleporte via SQL do dialeto. Não envia pacotes ao
gameserver: personagem online só reflete posição e flag offline no próximo
login; o banimento da conta (`accessLevel` negativo) impede o relogin. Detalhe
em [Moderação de personagens](../funcionalidades/moderacao.md).
