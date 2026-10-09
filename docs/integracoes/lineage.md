# Integração com o Lineage 2

Os retratos ilustrativos do painel e suas variações por classe/sexo estão descritos em [Retratos de personagens](retratos-personagens.md).

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


## Atributos e kit na criação de personagem

O módulo **Servidor** na central **Administração** possui o atalho **Criação de personagens**, que abre `/panel/admin/server#character-creation` em uma visualização dedicada aos atributos e kits iniciais, com foco na seção após o carregamento. Os demais valores do servidor são preservados ao salvar. O atalho segue a permissão `settings.manage` de **Painel e servidor**. A tela organiza atributos, ponto de partida e kit em blocos, com resumo em tempo real do perfil, retrato ilustrativo da raça e contagem de equipamentos/inventário. A troca de classe e a inclusão de itens têm transições suaves; `prefers-reduced-motion` desativa os efeitos. Em telas menores, o resumo se move para cima do editor. A prévia não salva nem cria personagens.

Em **Admin → Servidor → Criação de personagens**, quem possui `settings.manage`
configura o padrão geral e perfis para cada classe inicial. Classes sem perfil
herdam o padrão geral. Ao editar uma classe, o painel cria um snapshot independente
com todos os atributos e itens; alterações posteriores no padrão não modificam
esse perfil. **Voltar ao padrão geral** remove a substituição da classe.

Campos disponíveis: level, XP, SP, título, coordenadas X/Y/Z e uma lista de até
100 itens. Cada item recebe ID, quantidade, enchant e destino: inventário ou slot
do equipamento. Equipamentos têm quantidade 1 e não podem repetir slot no mesmo
perfil. Confira os IDs e slots do seu datapack e a compatibilidade dos equipamentos
com a classe. Adena pode ser incluída como item 57. Exemplo: padrão com 500 Adena;
perfil Humano Mago com arma no slot 7 e enchant +3. O perfil substitui o kit inteiro,
portanto adicione também a Adena ao perfil do mago se ele precisar recebê-la.

XP/SP trafegam como strings decimais para preservar precisão. O level não pode
superar o máximo configurado do servidor. **XP deve ser compatível com o level na
tabela da crônica**; o painel não calcula a curva de experiência customizada.
Os padrões preservam level 1, XP/SP zero, título vazio e a posição de unstuck.
Personagens existentes e personagens criados diretamente pelo cliente de jogo
não recebem esse kit retroativamente.

O jogador continua enviando somente nome, conta, classe/raça e aparência; o backend
seleciona o perfil autorizado. Nenhum valor inicial enviado pelo jogador substitui
a configuração administrativa. A criação do personagem, subclasse base e itens
ocorre na mesma transação SQL. Falha em qualquer item desfaz todas essas gravações.
As tabelas `characters`, `character_subclasses` e `items` precisam usar InnoDB.

Os catálogos do core incluem `creation_lock`, `creation_unlock`, `creation_storage`,
`creation_next_id` e `insert_initial_item`. Overlays devem preservar os parâmetros
`:title`, `:x`, `:y`, `:z` no insert do personagem e `:level`, `:xp`, `:sp` na subclasse;
um insert legado sem esses parâmetros é recusado. Lucera usa `items.slot`; schemas
com `loc_data` precisam sobrescrever `insert_initial_item` na extensão do cliente.
O lock MySQL serializa criações pelo painel e o alocador consulta IDs de personagens
e itens. O gameserver não participa desse lock: homologue a alocação externa de IDs,
o schema e a leitura dos equipamentos em uma instância controlada antes de ativar.

Validação automatizada: `test_character_start.py` cobre perfis, limites, permissões,
propriedade, persistência e repetição; `test_character_creation_sql.py` executa os
três catálogos em SQLite, incluindo rollback do segundo item. SQLite substitui lock,
metadados de engine e relógio MySQL e não comprova concorrência com o gameserver.
A SPA cobre edição, herança/restauração, kit, precisão de XP, carregamento, erro,
salvamento, resumo em tempo real sem perda de precisão do XP, ilustração da raça, estado de herança e contagem de equipamentos/inventário, além do bloqueio de envios duplicados. `AdminCharacterCreationNavigation.test.tsx` cobre o atalho na central, permissão, foco da tela dedicada e preservação dos demais dados do servidor ao salvar.
