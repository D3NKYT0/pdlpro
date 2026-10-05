# Câmbio entre painel e jogo

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md)

> **Atualizado:** 5 de outubro de 2026

Não basta habilitar uma tela: os bancos do painel e do jogo precisam manter recibos duráveis para retomar uma operação após falha de rede.

1. Configure a conexão Lineage, o dialeto correto e a moeda ativa (ID, multiplicador e taxa de retirada).
2. Com acesso administrativo autorizado ao banco do jogo, execute `python manage.py prepare_game_exchange`. O comando cria apenas `pdl_exchange_receipts`; não converte tabelas existentes nem altera personagens ou itens.
3. `characters`, `items`, `items_delayed` e `pdl_exchange_receipts` precisam usar InnoDB. A verificação de prontidão é somente leitura e impede novas reservas quando os recibos ou as tabelas não estão preparados.
4. Homologue com uma conta de teste vinculada e personagem offline, usando a menor quantidade representável: envio, consumo da fila de entrega pelo servidor, retorno de moedas e repetição da mesma requisição. Confirme saldos e itens nos dois bancos.

## Envio para personagem online

Em **Admin → Integrações → Lineage**, habilite **Permitir envio de moedas e itens para personagens online** e salve. A opção `LINEAGE_ALLOW_ONLINE_DELIVERY` começa desligada, pode ser definida no `.env` e recebe o overlay administrativo sem reiniciar os workers. Ela governa o envio da carteira e dos inventários do painel; a retirada de moedas e itens do jogo continua exigindo personagem offline.

Os dialetos Dream v3, Lucera v2 e Mobius usam `items_delayed`. Ative a opção somente quando o game server consumir essa fila com o personagem online. O portal confirma a gravação na fila; a atualização do inventário do jogo depende do consumidor do game server. Um adaptador sem a capacidade de fila continua recusando envio online mesmo com a opção ligada. Extensões devem fornecer as consultas `online_delivery_ready` (verificação de leitura da fila) e `delivery_character` (ID/estado com lock), mantendo `deposit_item` como inserção na fila.

Exemplo: com a opção ligada, selecione um personagem online no envio de saldo ao jogo. Ao trocar para **Trazer moedas do jogo**, a tela limpa a seleção e bloqueia personagens online. Com a opção desligada, ambos os sentidos do câmbio exigem personagem offline.

Homologue o envio de moedas e itens com o personagem online, a entrega real da fila, a repetição da mesma chave de câmbio e a retirada recusada sem alteração de saldo. Os testes de API também cobrem saldo insuficiente, propriedade da conta, quantidades inválidas, rollback e autorização da configuração administrativa.

O envio usa a fila `items_delayed`. O retorno consome moedas sem encantamento no inventário/armazém. Saldo bônus não é transferível. A taxa se aplica apenas ao retorno. Quantidades devem corresponder a saldo com duas casas decimais.

Em erro de conexão, a operação fica **pendente** e deve ser retomada com a mesma chave pelo histórico; não é permitido abrir outra enquanto existir uma pendência. Não altere o status nem faça estorno manual sem conciliar o recibo do jogo: o commit externo pode ter ocorrido. Rejeições de negócio também têm recibo terminal, evitando que uma repetição aplique uma operação já estornada.

Os testes locais validam o algoritmo transacional e os contratos SQL. Eles **não substituem a homologação no servidor Lineage real**, que não foi realizada nesta entrega.

Veja o [registro histórico de homologação](../historico/2026-09-02-validacao.md) e execute uma nova validação no seu ambiente antes da liberação.
