# Câmbio entre painel e jogo

[← Índice da documentação](../README.md)

Não basta habilitar uma tela: os bancos do painel e do jogo precisam manter recibos duráveis para retomar uma operação após falha de rede.

1. Configure a conexão Lineage, o dialeto correto e a moeda ativa (ID, multiplicador e taxa de retirada).
2. Com acesso administrativo autorizado ao banco do jogo, execute `python manage.py prepare_game_exchange`. O comando cria apenas `pdl_exchange_receipts`; não converte tabelas existentes nem altera personagens ou itens.
3. `characters`, `items`, `items_delayed` e `pdl_exchange_receipts` precisam usar InnoDB. A verificação de prontidão é somente leitura e impede novas reservas quando os recibos ou as tabelas não estão preparados.
4. Homologue com uma conta de teste vinculada e personagem offline, usando a menor quantidade representável: envio, consumo da fila de entrega pelo servidor, retorno de moedas e repetição da mesma requisição. Confirme saldos e itens nos dois bancos.

O envio usa a fila `items_delayed`. O retorno consome moedas sem encantamento no inventário/armazém. Saldo bônus não é transferível. A taxa se aplica apenas ao retorno. Quantidades devem corresponder a saldo com duas casas decimais.

Em erro de conexão, a operação fica **pendente** e deve ser retomada com a mesma chave pelo histórico; não é permitido abrir outra enquanto existir uma pendência. Não altere o status nem faça estorno manual sem conciliar o recibo do jogo: o commit externo pode ter ocorrido. Rejeições de negócio também têm recibo terminal, evitando que uma repetição aplique uma operação já estornada.

Os testes locais validam o algoritmo transacional e os contratos SQL. Eles **não substituem a homologação no servidor Lineage real**, que não foi realizada nesta entrega.

Veja o [registro histórico de homologação](../historico/2026-09-02-validacao.md) e execute uma nova validação no seu ambiente antes da liberação.
