# Economia do jogador

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Pagamentos](../integracoes/pagamentos.md) · [Tutoriais MP](../tutoriais/mercado-pago.md) · [Tutoriais Stripe](../tutoriais/stripe.md)

> **Atualizado:** 9 de outubro de 2026

> [!NOTE]
> Visão do **produto** (o que o jogador e a staff fazem). Detalhe de gateway e
> webhook: [Pagamentos](../integracoes/pagamentos.md). Setup de chaves:
> [Tutoriais](../tutoriais/README.md).

## Mapa rápido

| Área | Rota jogador | Admin |
| --- | --- | --- |
| Carteira / saldo | `/panel/wallet` | `/panel/admin/wallet`, moedas, promo |
| Pedidos de recarga | `/panel/wallet/orders` | Relatórios financeiros |
| Loja (itens do painel) | `/panel/shop` | `/panel/admin/shop` |
| Marketplace (personagens) | `/panel/marketplace` | Moderação / relatórios |
| Leilões | `/panel/auction` | Relatórios operacionais |
| Pacotes de moedas | carteira | `/panel/admin/coin-packages` |

## Carteira

O título do banco/carteira pode ser personalizado em **Admin → Integrações →
Pagamentos → Nome do banco/carteira**, até 80 caracteres. Cada instalação salva
sua própria marca. Vazio mantém `panel.wallet.hero.title` do tema/idioma ativo
(padrão: Banco PDL). O default de ambiente é `WALLET_DISPLAY_NAME`; o valor salvo
no painel tem prioridade. Esse nome visual não altera descrições de cobrança,
extratos de cartão, saldos nem o nome da moeda do jogo. A API autenticada da
carteira expõe `display_name` para a SPA.

Os testes cobrem persistência, limite, acesso, nome na API e renderização do título
customizado ou do fallback durante carregamento, ausência e erro de consulta.

- Saldo principal e bônus; transferência entre usuários quando habilitada.
- Recarga via [Mercado Pago](../tutoriais/mercado-pago.md) (BRL) e/ou
  [Stripe](../tutoriais/stripe.md).
- Promoção de banner: `/panel/admin/wallet` (uma campanha ativa).
- Extrato paginado em `/panel/wallet/transactions`.

## Nome da moeda virtual

Em **Admin → Integrações → Pagamentos → Nome da moeda virtual**, o administrador
pode definir uma marca única por instalação (ex.: `Blablabla Coin`), até 40
caracteres de texto simples. Salvar não altera saldos, preços, IDs de itens,
taxas de conversão ou a moeda real da cobrança. O valor fica separado do nome do
banco e do item configurado para o câmbio com o jogo.

A API pública `/api/v1/public/server/info/` e a carteira autenticada expõem
`coin_name`. A SPA usa essa identidade em saldos, preços internos, pacotes,
fichas, bônus, serviços, transferências, recompensas e relatórios. Nomes
configurados permanecem literais em PT/EN/ES; vazio restaura o fallback do idioma.
O tema permite quebrar nomes extensos, inclusive sem espaços, sem sobrepor as
ações de saldo.
As traduções recebem `coinName`, `coinNameSingular` e `coinNameTitle` globalmente,
com atualização das telas ao recarregar a configuração. Extensões podem usar
essas variáveis ou o formatador compartilhado `formatCoins`.

O default de ambiente é `WALLET_COIN_NAME`; a configuração salva tem prioridade.
Descrições padrão de novas cobranças usam o nome. Templates personalizados
podem usar `{moeda}` / `{coin_name}` / `{moneda}` junto às variáveis de quantidade
e pacote. Textos editoriais, nomes de itens do jogo e descrições já registradas
não são reescritos. Moedas reais de cobrança (BRL, USD etc.) mantêm sua identidade.

Os testes cobrem persistência, limite, texto inválido, acesso exclusivo do
superadmin, publicação do nome, limpeza sem alterar saldos, propagação e troca
de idioma na SPA e payloads dos provedores com gateways simulados.

## Unidade dos preços

Recargas compram moedas da carteira e mostram dinheiro real na moeda da cobrança
(BRL/USD). Loja, marketplace, lances de leilão, serviços de personagem, baús e
compra de fichas usam moedas da carteira. Uma ficha custa uma moeda; o bônus
diário também credita moedas. Os preços internos usam formatação numérica do
idioma ativo com a unidade traduzida (moedas/coins/monedas), sem símbolo de reais.
Isso não converte valores nem altera a taxa de recarga ou o débito existente.

Os testes verificam preços e totais durante compras/lances, a troca de pacote de
fichas, baús, bônus diário, edição de preços de serviços e a formatação PT/EN/ES.
O modal de fichas usa uma coluna em telas de até 560 px, com rolagem vertical
quando necessário para manter pacotes, total e confirmação acessíveis.
A API de fichas verifica o débito exato da carteira; as suítes de comércio cobrem
saldo insuficiente, autorização, repetição e rollback.

## Loja

Catálogo de itens vendidos em moedas do painel (não confundir com lojas L2
offline em `/stores`). Configuração em `/panel/admin/shop` (itens, pacotes,
cupons conforme a instalação).

## Marketplace

Anúncio e compra de **personagens** entre jogadores. Regras de concorrência e
débito estão cobertas pelos testes e pela
[segurança operacional](../operacao/seguranca.md) (liquidação atômica).

## Leilões

Itens do inventário ou personagens com lances. Fechamento pode usar Celery
Beat — veja variáveis de leilão em [Ambiente](../configuracao/ambiente.md).

## Relatórios

Staff: [Relatórios financeiros](../api/relatorios-financeiros.md) e
[operacionais](../api/relatorios-operacionais.md) em `/panel/admin/reports`.

## Segurança e dinheiro

> [!WARNING]
> Qualquer mudança em crédito, webhook ou concorrência de compra exige os
> cenários de [Segurança operacional](../operacao/seguranca.md) e a
> [política de testes](../desenvolvimento/politica-de-testes.md). Não documente
> atalhos que bypassem liquidação ou assinatura de webhook.
