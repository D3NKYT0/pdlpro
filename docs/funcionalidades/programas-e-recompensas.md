# Programas, comércio e recompensas

[← Índice da documentação](../README.md)

Implementação de 02/09/2026. Clãs e rede social permanecem fora do escopo.

## Onde gerenciar

| Módulo | Jogador/site | Administração |
| --- | --- | --- |
| Apoiadores e comissões | `/panel/supporters` | `/panel/admin/supporters` |
| Roadmap e detalhes | `/roadmap` | `/panel/admin/roadmap` (descrição em rich text) |
| Disponibilidade de módulos | Navegação e bloqueio da API | `/panel/admin/resources` |
| Conta L2, perfil e progresso | `/panel/accounts`, `/panel/profile`, `/panel/progress` | Controle de recursos |
| Avisos, atendimento e ajuda | `/panel/notifications`, `/panel/support`, `/panel/help` | Controle de recursos |
| Conteúdo público do site | Rankings, notícias, wiki, FAQ, downloads, calendário | Controle de recursos |
| Carteira ↔ jogo | `/panel/wallet/game` | Configuração da moeda + integração Lineage |
| Pacotes, cupons, bônus e histórico | `/panel/shop` | `/panel/admin/commerce` |
| Passe, bônus diário e rankings | `/panel/rewards` | `/panel/admin/rewards` |
| Pesca, iscas e coleção | `/panel/games?tab=fishing` | `/panel/admin/rewards` |

A pescaria tem uma única interface em Jogos (`Pescaria`), incluindo vara, experiência, iscas, coleção e últimos lançamentos. O endereço antigo `/panel/rewards?tab=fishing` redireciona para a aba Pescaria em Jogos, sem alterar o progresso.

`/panel/games` usa arte do tema ativo (`images/games/*`, tokens `--theme-art-games-*`) e anima o palco de cada minigame (giro, abertura de baú, dado/slots, lago e combate). Os nomes de vitrine são **Roda da Fortuna**, **Baús Encantados**, **Mesa da Taverna**, **Pescaria** e **Arena das Feras**. Pacotes podem remapear esses arquivos no mapa `assets` sem alterar o HTML.

O controle central oferece 23 módulos organizados por categoria (economia, jogos, conta, comunicação e conteúdo do site). Desativar bloqueia os endpoints correspondentes e a tela; não apaga dados nem bloqueia a administração. Perfil e segurança de autenticação ficam acessíveis no menu conforme a política de cada módulo; Conta e segurança permanece sempre disponível. Os jogos continuam respeitando também suas configurações individuais.

## Regras importantes

- A candidatura não permite autoaprovação. A aprovação atualiza o papel de jogador para apoiador sem substituir privilégios de equipe.
- Cupons possuem validade, percentual, limite de uso e vínculo opcional com apoiador aprovado. Um apoiador não utiliza o próprio cupom.
- A comissão é calculada sobre o saldo normal efetivamente pago, após desconto e descontado o bônus. A aprovação da solicitação credita a carteira uma única vez; a recusa libera as comissões para nova solicitação.
- O checkout compra itens e pacotes na mesma transação, preserva a composição histórica, entrega na bag e usa chave de idempotência. Alterar um pacote depois não altera compras anteriores.
- Missões contam eventos reais do período diário, semanal ou da temporada. Trocas consomem o item e encantamento exatos da bag. Marcos e prêmios só são resgatados uma vez. Resgate automático atende prêmios de nível, respeitando premium.
- Bônus sazonal usa o dia do calendário da temporada, não uma sequência pessoal de login. Um conjunto extra pode ser sorteado por peso. Sem temporada ativa, o bônus simples anterior permanece disponível. O limite é um resgate por data local.
- Iscas custam fichas, ficam no estoque e são consumidas no lançamento, inclusive quando o peixe escapa. Coleção registra capturas bem-sucedidas. Rankings de cada minigame ordenam resultados positivos e partidas.

## Integração da carteira

Consulte [Câmbio entre painel e jogo](../integracoes/cambio-painel-jogo.md) para preparação, recibos e retomada de operações.

## Desenvolvimento e validação

- [Ambiente de demonstração](../desenvolvimento/preview.md).
- [Testes e qualidade](../desenvolvimento/testes.md).
- [Registro de validação de 02/09/2026](../historico/2026-09-02-validacao.md).
