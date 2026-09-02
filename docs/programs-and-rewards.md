# Conteúdo migrado do SITE para o PRO

Implementação de 02/09/2026. Clãs e rede social permanecem fora do escopo.

## Onde gerenciar

| Módulo | Jogador/site | Administração |
| --- | --- | --- |
| Apoiadores e comissões | `/painel/apoiadores` | `/painel/admin/apoiadores` |
| Roadmap e detalhes | `/roadmap` | `/painel/admin/roadmap` |
| Disponibilidade de módulos | Navegação e bloqueio da API | `/painel/admin/recursos` |
| Carteira ↔ jogo | `/painel/wallet/jogo` | Configuração da moeda + integração Lineage |
| Pacotes, cupons, bônus e histórico | `/painel/shop` | `/painel/admin/comercio` |
| Passe, bônus diário e rankings | `/painel/recompensas` | `/painel/admin/recompensas` |
| Pesca, iscas e coleção | `/painel/games?tab=fishing` | `/painel/admin/recompensas` |

A pescaria tem uma única interface em Jogos, incluindo vara, experiência, iscas, coleção e últimos lançamentos. O endereço antigo `/painel/recompensas?tab=fishing` redireciona para a aba Pesca em Jogos, sem alterar o progresso.

O controle central oferece 11 módulos organizados por categoria. Desativar bloqueia os endpoints correspondentes e a tela; não apaga dados nem bloqueia a administração. Os jogos continuam respeitando também suas configurações individuais.

## Regras importantes

- A candidatura não permite autoaprovação. A aprovação atualiza o papel de jogador para apoiador sem substituir privilégios de equipe.
- Cupons possuem validade, percentual, limite de uso e vínculo opcional com apoiador aprovado. Um apoiador não utiliza o próprio cupom.
- A comissão é calculada sobre o saldo normal efetivamente pago, após desconto e descontado o bônus. A aprovação da solicitação credita a carteira uma única vez; a recusa libera as comissões para nova solicitação.
- O checkout compra itens e pacotes na mesma transação, preserva a composição histórica, entrega na bag e usa chave de idempotência. Alterar um pacote depois não altera compras anteriores.
- Missões contam eventos reais do período diário, semanal ou da temporada. Trocas consomem o item e encantamento exatos da bag. Marcos e prêmios só são resgatados uma vez. Resgate automático atende prêmios de nível, respeitando premium.
- Bônus sazonal usa o dia do calendário da temporada, não uma sequência pessoal de login. Um conjunto extra pode ser sorteado por peso. Sem temporada ativa, o bônus simples anterior permanece disponível. O limite é um resgate por data local.
- Iscas custam fichas, ficam no estoque e são consumidas no lançamento, inclusive quando o peixe escapa. Coleção registra capturas bem-sucedidas. Rankings de cada minigame ordenam resultados positivos e partidas.

## Preparação de carteira ↔ jogo

Não basta habilitar uma tela: os bancos do painel e do jogo precisam manter recibos duráveis para retomar uma operação após falha de rede.

1. Configure a conexão Lineage, o dialeto correto e a moeda ativa (ID, multiplicador e taxa de retirada).
2. Com acesso administrativo autorizado ao banco do jogo, execute `python manage.py prepare_game_exchange`. O comando cria apenas `pdl_exchange_receipts`; não converte tabelas existentes nem altera personagens ou itens.
3. `characters`, `items`, `items_delayed` e `pdl_exchange_receipts` precisam usar InnoDB. A verificação de prontidão é somente leitura e impede novas reservas quando os recibos ou as tabelas não estão preparados.
4. Homologue com uma conta de teste vinculada e personagem offline, usando a menor quantidade representável: envio, consumo da fila de entrega pelo servidor, retorno de moedas e repetição da mesma requisição. Confirme saldos e itens nos dois bancos.

O envio usa a fila `items_delayed`. O retorno consome moedas sem encantamento no inventário/armazém. Saldo bônus não é transferível. A taxa se aplica apenas ao retorno. Quantidades devem corresponder a saldo com duas casas decimais.

Em erro de conexão, a operação fica **pendente** e deve ser retomada com a mesma chave pelo histórico; não é permitido abrir outra enquanto existir uma pendência. Não altere o status nem faça estorno manual sem conciliar o recibo do jogo: o commit externo pode ter ocorrido. Rejeições de negócio também têm recibo terminal, evitando que uma repetição aplique uma operação já estornada.

Os testes locais validam o algoritmo transacional e os contratos SQL. Eles **não substituem a homologação no servidor Lineage real**, que não foi realizada nesta entrega.

## Validação local isolada

`core.settings.preview` usa `backend/preview.sqlite3`, sem acesso ao banco do jogo ou pagamentos reais. Nunca use essas configurações em produção.

```powershell
# Backend, em backend/
.venv/Scripts/python.exe manage.py migrate --settings=core.settings.preview
.venv/Scripts/python.exe manage.py seed_program_preview --settings=core.settings.preview --password "SENHA-LOCAL-DE-TESTE"
.venv/Scripts/python.exe manage.py runserver 127.0.0.1:8001 --settings=core.settings.preview

# Frontend, em frontend/, em outro terminal
$env:PDL_API_TARGET = 'http://127.0.0.1:8001'
npm run dev -- --host 127.0.0.1 --port 3001 --strictPort
```

O comando de dados fictícios é protegido contra uso nas configurações normais. Reexecutá-lo redefine os valores demonstrativos do usuário `preview`.

Verificações automatizadas: `pytest`, `npm run test:run`, `npm run build`, `manage.py check` e `makemigrations --check --dry-run`. A inspeção visual usa o tema existente em desktop e celular, incluindo formulários, histórico, estados vazios, ações desabilitadas e bloqueio de recursos.

### Registro de validação — 02/09/2026

- Backend: 258 testes aprovados. Frontend: 39 testes aprovados. Build de produção concluído; permanece o aviso de tamanho do bundle principal.
- Django sem erros de configuração e sem migrações faltantes na definição dos modelos.
- Navegador: desktop de 1280/1440 px e celular de 390 px. Conferidos painel do apoiador, análise e crédito de comissão, loja e histórico, passe/missões/trocas/marcos/histórico, bônus diário, iscas/coleção/ranking, carteira ↔ jogo, administração dos recursos, editores de recompensas/cupons e roadmap público/detalhe/admin.
- Na base isolada: compra de pacote com cupom e bônus; candidatura analisada e comissão solicitada/creditada; bônus resgatado; isca comprada e consumida; captura registrada; missão resgatada, dois níveis resgatados automaticamente com premium ainda bloqueado; troca e marco registrados no histórico; roadmap publicado; módulo desativado e reativado.
- Corrigidos durante a inspeção: sobreposição do rodapé do menu, checkbox herdando dimensões de campo de texto, alinhamento das métricas, títulos sem contraste no site público, datas com fuso negativo e navegação pública estreita.
- Transferência com o Lineage real: **não homologada**, conforme preparação acima. Nenhum saldo ou inventário real do jogo foi movimentado nesta validação.
- A verificação **somente leitura** do banco Lineage configurado encontrou `characters` e `items_delayed` em **MyISAM**, `items` em InnoDB e nenhuma tabela `pdl_exchange_receipts`. A conexão está acessível, mas faltam os requisitos transacionais. Conversão de engine e criação de recibos no servidor real não foram executadas; exigem autorização, backup e planejamento operacional.
