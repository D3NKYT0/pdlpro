# Integração com o Lineage 2

[← Índice da documentação](../README.md)

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

## Escolha do adaptador

`ServerProvider` registra `ILineageGateway`: sem banco do jogo, usa `NullLineageGateway`, que mantém dados apenas em memória para desenvolvimento; com integração ativa, carrega `LineageQueryCatalog` e `SqlAlchemyLineageGateway`. O status por socket continua separado do acesso SQL.

Os catálogos ficam em [queries](../../backend/apps/server/infrastructure/lineage/queries/). Uma nova distribuição deve manter as consultas obrigatórias e seus contratos de parâmetros/retorno; veja os [testes de catálogos](../desenvolvimento/testes.md).

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

Consulte também [as variáveis de conexão](../configuracao/ambiente.md), [o catálogo de itens](catalogo-de-itens.md) e [a observação de itens](../funcionalidades/observacao-de-itens.md).

## Propriedade e serviços pagos

Nome igual ao login não concede acesso: a conta deve possuir vínculo confirmado no gateway. Nickname e sexo reservam saldo antes da chamada externa e aceitam `request_key` para repetição segura. Resultados incertos exigem [conciliação de serviços](../operacao/seguranca.md#serviços-pagos-do-personagem).
