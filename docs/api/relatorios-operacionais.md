# Relatórios operacionais (staff)

[← Índice da API](README.md) · [Relatórios financeiros](relatorios-financeiros.md)

A área `/panel/admin/reports` agrupa consultas agregadas do painel por categoria. As APIs financeiras permanecem em `/api/v1/staff/financial-reports/`; as operacionais usam `/api/v1/staff/operational-reports/`.

## Categorias

| Categoria UI | API | Fonte |
| --- | --- | --- |
| Financeiro | `financial-reports/{balances\|cash-flow\|payments\|reconciliation}/` | Carteira e pedidos |
| Inventário | `operational-reports/inventory/` | `InventoryLog` (janela de 15 dias) |
| Leilões | `operational-reports/auctions/` | `Auction` / `Bid` |
| Compras | `operational-reports/purchases/` | `ShopPurchase` / carrinhos |
| Marketplace | `operational-reports/marketplace/` | `CharacterListing` |

Todas exigem staff autenticado, respondem com `Cache-Control: no-store` e usam o envelope `count`, `total_pages`, `next`, `previous`, `results`, `summary`.

## Filtros comuns

`username`, `date_from`, `date_to`, `page`, `page_size` (1–50). Filtros específicos:

- Inventário: `action` (`RETIROU_DO_JOGO`, `INSERIU_NO_JOGO`, `TROCA_ENTRE_PERSONAGENS`)
- Leilões: `status` (`open`, `finished`, `cancelled`)
- Compras: `status`
- Marketplace: `status` (`for_sale`, `sold`, `cancelled`, `disputed`)

## UI

- Hub: `/panel/admin/reports`
- Detalhe: `/panel/admin/reports/:category/:report?`
- Compatibilidade: `/panel/admin/financial/:report?` redireciona para a categoria financeira

Os totais do `summary` cobrem todos os registros filtrados, não só a página atual. Não há relatório de rede social (módulo removido no 2.1).
