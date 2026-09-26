# Economia do jogador

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Pagamentos](../integracoes/pagamentos.md) · [Tutoriais MP](../tutoriais/mercado-pago.md) · [Tutoriais Stripe](../tutoriais/stripe.md)

> **Atualizado:** 25 de setembro de 2026

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

- Saldo principal e bônus; transferência entre usuários quando habilitada.
- Recarga via [Mercado Pago](../tutoriais/mercado-pago.md) (BRL) e/ou
  [Stripe](../tutoriais/stripe.md).
- Promoção de banner: `/panel/admin/wallet` (uma campanha ativa).
- Extrato paginado em `/panel/wallet/transactions`.

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
