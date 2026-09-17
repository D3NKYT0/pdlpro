# Programas, comércio e recompensas

[← Índice da documentação](../README.md)

Implementação de 02/09/2026. Clãs e rede social permanecem fora do escopo.

## Onde gerenciar

| Módulo | Jogador/site | Administração |
| --- | --- | --- |
| Apoiadores e comissões | `/panel/supporters` | `/panel/admin/supporters` |
| Roadmap e detalhes | `/roadmap` | `/panel/admin/roadmap` (rich text e PT/EN/ES) |
| Disponibilidade de módulos | Navegação e bloqueio da API | `/panel/admin/resources` |
| Conta L2, perfil e progresso | `/panel/accounts`, `/panel/profile`, `/panel` (nível, conquistas e prêmios da conta) | Controle de recursos; Moderação em `/panel/admin/moderation` |
| Avisos, atendimento e ajuda | sino da barra superior, `/panel/help` (Atendimento só pela Ajuda) | `/panel/admin/notifications`, `/panel/admin/support` |
| Conteúdo público do site | Rankings, lojas do jogo, notícias, wiki, FAQ, downloads, calendário | `/panel/admin/news`, `/panel/admin/wiki`, `/panel/admin/faq`, `/panel/admin/downloads`, `/panel/admin/calendar` (notícias, calendário, FAQ, wiki e roadmap em PT/EN/ES) |
| Carteira ↔ jogo | `/panel/wallet/game` | Configuração da moeda + integração Lineage |
| Pacotes, cupons, bônus e histórico | `/panel/shop` | Itens e pacotes em `/panel/admin/shop` (com **Preencher catálogo low grade**); cupons em `/panel/admin/commerce` |
| Passe, bônus diário, caça do dia e rankings | `/panel/rewards` | `/panel/admin/rewards` (missões da caça em `hunt-quests`) |
| Lojas offline do jogo | `/stores` | Consulta somente leitura; SQL opcional por dialeto |
| Minigames (roleta, baús, dados, pesca, arena) | `/panel/games` | `/panel/admin/games` (ligar/desligar, **Configurar** por jogo e **Configurar todos**) |
| Pesca, iscas e coleção | `/panel/games?tab=fishing` | `/panel/admin/rewards` |

A pescaria tem uma única interface em Jogos (`Pescaria`), incluindo vara, experiência, iscas, coleção e últimos lançamentos. Nomes e descrições de iscas e peixes seguem o idioma da SPA (`X-Language` / campos `*_en` / `*_es`; vazio volta ao português). Pescar gasta 1 isca (comum ou uma das duas encantadas). Fichas só compram **isca comum** (**1 ficha = 10**). Isca do aprendiz custa **3 comuns**; isca encantada custa **8 comuns**. O endereço antigo `/panel/rewards?tab=fishing` redireciona para a aba Pescaria em Jogos, sem alterar o progresso. O lago mostra cardume em pixel art com esteiras, cáusticas e bolhas; o lançamento cai a boia com impacto e anéis, a fisgada afunda a linha e o peixe aparece no centro do lago com spray e brilho (ou foge) e some em seguida (`images/games/fish-*.webp`). A tela segue o módulo dos outros jogos: o lago vai de ponta a ponta; HUD, seletor, lançar e as três iscas em molduras ficam no mesmo painel (a isca do lançamento fica marcada; o texto da troca só no hover); à direita, os últimos lances. A coleção fica embaixo. A coleção usa as mesmas artes, em duas colunas de raridade (comum e raro à esquerda; épico, lendário e divino à direita); espécies novas caem na sprite da faixa. O lago tem
doze espécies: peixes reais do Brasil e três criaturas que não existem (Koi Etéreo,
Boiúna e Serafim de Eva). As duas últimas são **divinas** — rara fisgada, vara alta
e prêmio maior.

`/panel/games` usa arte do tema ativo (`images/games/*`, tokens `--theme-art-games-*`) e anima o palco de cada minigame (tambor da roleta, abertura de baú, mesa da taverna, lago e combate). O saldo de fichas do cabeçalho acompanha o gasto e o crédito em qualquer aba, sem F5. Os nomes de vitrine são **Roda da Fortuna**, **Baús Encantados**, **Mesa da Taverna**, **Pescaria** e **Arena das Feras**. Pacotes podem remapear esses arquivos no mapa `assets` sem alterar o HTML. A **Arena das Feras** divide o card em duas colunas: à esquerda, a forja (fragmentos e Encantar) e a lista de **dez feras** (Keltir, Wolf, Goblin, Orc, Lizardman, Ant Recruit, Werewolf, Ogre, Drake e Death Knight), cada uma com retrato próprio (`images/games/monster-*.webp`); à direita, um palco só para o combate (lutador, retrato da fera, barras, golpes e o resultado). O cabeçalho mostra o encante atual ao lado da trilha até +10. Encantar abre um modal que simula a tentativa e só então revela vitória ou derrota (explosão dourada no acerto, cinzas na falha e celebração extra no +10), sem toast. A arma do palco e do modal usa sprites de +0 a +10 (`images/games/sword-*.webp`), com a luz do encante no estilo Lineage. No celular o palco sobe para não perder a animação. O confronto preenche o palco (chão, colunas, raios, golpes e barras) até o tempo mínimo e só então revela vitória ou derrota, sem toast. `--theme-art-games-arena` aceita textura opcional de fundo. A **Mesa da Taverna** é palco CSS: feltro com cubo de dado 3D (seis faces; o resultado só aparece depois do tombo, de frente, com brilho de escolha; alguns segundos depois o cubo volta ao repouso) e caça-níquel com SVGs dos símbolos, giro em sequência e, nas colunas de jogo, as regras do dado (par/ímpar/alto/baixo · 2×) e dos cilindros (três iguais 10×, par 2×, sem combinação não paga). Vitória e derrota abrem um modal de vidro (mesa escurecida, lavado e anel únicos) em ouro ou alerta, sem toast nem partículas. `--theme-art-games-chance-felt` e `--theme-art-games-chance-cabinet` aceitam textura opcional. A roleta pede o giro na hora: o palco fica no centro vertical do card, com raios e partículas em movimento no fundo da roda. O tambor, a janela de seleção e os efeitos (fogos no acerto, tremor no erro) ficam no miolo. O tambor começa rápido, desacelera perto do fim e só revela o item no miolo após a animação, sem toast. Se a roda não parar em prêmio, o círculo fica vermelho, treme e mostra um X. O card do bônus diário, ao lado, explica como a roda funciona e traz dicas (fichas, chance de falha, inventário e o resgate diário em reais).

Os **Baús Encantados** funcionam diferente da roleta: o **item em mira é sempre lendário** e já está em um dos pacotes. O título da aba tem um atalho “?” que abre o passo a passo (mira, compra, abrir e resetar). Quem compra leva o item se abrir todos — a sorte só decide se sai no primeiro ou no último. A compra do baú é em reais e libera de **20 a 50 pacotes** (comum → lendário); **abrir** um pacote consome 1 ficha. Resetar só vale depois de abrir pelo menos um pacote e pede confirmação; um baú intacto não pode ser rerolado. Os outros pacotes saem só do catálogo do tier (sem outro lendário). O baú do card treme e, em seguida, um modal no centro troca os frames (fechado → entreaberto → aberto) e revela o item centralizado sob o baú aberto, sem toast. Sem fichas, a tela abre um modal de vitrine para comprar (pacotes, total em reais; 1 ficha = R$ 1 da carteira) em vez de só avisar saldo insuficiente. Se o pacote for o da mira, o fundo do modal muda para um lavado dourado-violeta com partículas e faixas em movimento. O autoconfig põe uma mira lendária **diferente** em cada baú, no estilo low rate: Blessed Enchant Weapon A no comum, Armor S no raro, Weapon S no épico e Ring of Baium no lendário. O resto do catálogo é stack Interlude do tier (Adena, soulshot, poção, SoE, crystal, encant D–A, Gold Bar, Coin of Luck). A arte do baú é pixel art da paleta do painel (`images/games/box-*.webp`), não foto.

A **Caça do dia** (`/panel/rewards?tab=hunt`) lê PvP, PK, tempo online e nível no personagem L2. O painel mostra o snapshot do personagem escolhido (nível, presença, PvP/PK e tempo online), o progresso de cada missão em barra e o resgate no mesmo chrome das missões do passe. No primeiro acesso do período (dia ou semana) o painel grava um snapshot; o progresso é a diferença até o valor ao vivo. O resgate entrega recompensas da bag/carteira uma vez por missão e período. Não exige logout. A staff edita as missões em `/panel/admin/rewards` (área Caça do dia), com nome/descrição PT/EN/ES.

As **Lojas do jogo** (`/stores`) listam private stores offline publicadas no servidor (`character_offline_trade`). A tela é pública e somente leitura: busca por item ou vendedor e filtro por tipo (venda, compra, pacote, craft). Cada tipo pinta o cartão (borda, selo, preço e retrato) com uma cor própria — ouro na venda, azul na compra, violeta no pacote e verde no craft — para o jogador reconhecer a loja de relance. Nas lojas de craft, receitas mostram o ícone do item produzido ao lado do pergaminho. Sem as consultas no catálogo SQL, a API devolve `available: false` e a SPA esconde o módulo.

O controle central oferece 25 módulos organizados por categoria (economia, jogos, conta, comunicação e conteúdo do site). Desativar bloqueia os endpoints correspondentes e a tela; não apaga dados nem bloqueia a administração. Perfil e segurança de autenticação ficam acessíveis no menu conforme a política de cada módulo; Conta e segurança permanece sempre disponível. Os jogos continuam respeitando também suas configurações individuais.

Em `/panel/admin/games`, cada card abre um **configurador** (parâmetros +
catálogo jogável). **Preencher conteúdo** / **Configurar todos** aplica IDs
reais do XML Interlude em stacks de servidor **low rate** (Adena 50k–5M,
Soulshot NG/D/C, Spiritshot, poções, Blessed SoE/SoR, Crystal/Gemstone D,
Enchant Weapon/Armor D–B, Life Stone 46/61, Gold Bar, Coin of Luck e
Blessed Enchant Weapon S), com quantidade no prêmio da roleta, do baú e do
peixe. Não sobrescreve nomes customizados nem chaves de `settings` já
definidas; desativa sobras do catálogo antigo (unidade isolada e Necklace of
Valakas).
A operação é idempotente. Baús também têm **Configurar baús**, porque não
usam `GameConfig`.

Em `/panel/admin/shop`, o **configurador da loja** edita itens avulsos e
pacotes. **Preencher catálogo low grade** aplica IDs reais do XML Interlude
em stacks NG/D/C (Adena 1M–10M, soulshot/spiritshot NG–C, poções, SoE/SoR,
crystal/gemstone D–C, encantes D–C, Gold Bar e Coin of Luck) e monta
pacotes com desconto (iniciante, mago NG, farm D, PvP, encante D, C-Grade,
semanal e premium). Não sobrescreve preço, nome, ativação nem pacotes já
existentes com o mesmo nome. A operação é idempotente.

## Regras importantes

- A candidatura não permite autoaprovação. A aprovação atualiza o papel de jogador para apoiador sem substituir privilégios de equipe.
- Cupons possuem validade, percentual, limite de uso e vínculo opcional com apoiador aprovado. Um apoiador não utiliza o próprio cupom.
- A comissão é calculada sobre o saldo normal efetivamente pago, após desconto e descontado o bônus. A aprovação da solicitação credita a carteira uma única vez; a recusa libera as comissões para nova solicitação.
- O checkout compra itens e pacotes na mesma transação, preserva a composição histórica, entrega na bag e usa chave de idempotência. Alterar um pacote depois não altera compras anteriores.
- Missões contam eventos reais do período diário, semanal ou da temporada. Trocas consomem o item e encantamento exatos da bag. Marcos e prêmios só são resgatados uma vez. Resgate automático atende prêmios de nível, respeitando premium.
- A caça do dia mede o delta do personagem desde o snapshot do período (PvP, PK, tempo online ou nível). Cada missão resgata uma vez por período e usuário. Sem personagem acessível a lista vem vazia.
- Bônus sazonal usa o dia do calendário da temporada, não uma sequência pessoal de login. Um conjunto extra pode ser sorteado por peso. Sem temporada ativa, o bônus simples anterior permanece disponível. O limite é um resgate por data local.
- O lançamento consome 1 isca comum ou 1 das duas encantadas, não fichas. Fichas só compram isca comum (**1 ficha = 10**). Aprendiz e encantada saem das comuns (3 e 8). Sem isca no estoque a linha não sai. A isca é gasta mesmo quando o peixe escapa. Coleção registra capturas bem-sucedidas. Rankings de cada minigame ordenam resultados positivos e partidas.

## Integração da carteira

Consulte [Câmbio entre painel e jogo](../integracoes/cambio-painel-jogo.md) para preparação, recibos e retomada de operações.

## Desenvolvimento e validação

- [Ambiente de demonstração](../desenvolvimento/preview.md).
- [Testes e qualidade](../desenvolvimento/testes.md).
- [Registro de validação de 02/09/2026](../historico/2026-09-02-validacao.md).
