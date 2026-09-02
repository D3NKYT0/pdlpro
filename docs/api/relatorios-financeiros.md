# Relatórios financeiros

[← Índice da documentação](../README.md)

Disponíveis na central administrativa em `/painel/admin/financeiro/saldos`.
As quatro APIs abaixo aceitam apenas leitura e exigem sessão com acesso de equipe
(`IsStaffMember`, incluindo os papéis de staff, admin e moderador do PRO).

| GET `/api/v1/staff/financial-reports/` + | Relatório | Filtros específicos |
|---|---|---|
| `balances/` | Saldos de todos os usuários, incluindo usuários sem carteira | `status`, `minimum`, `maximum` sobre saldo total |
| `cash-flow/` | Movimentação diária de carteiras | `date_from`, `date_to` |
| `payments/` | Pedidos e pagamentos | `date_from`, `date_to`, `status`, `method`, `currency`, `minimum`, `maximum` sobre valor do pedido |
| `reconciliation/` | Conferência das carteiras existentes | `status`, `minimum`, `maximum` sobre diferença assinada |

Todos aceitam `username` (busca parcial sem distinguir maiúsculas), `page` e
`page_size` (padrão 20, máximo 50). Datas usam `YYYY-MM-DD`, limites inclusivos
e o fuso configurado no backend. O período de pagamentos usa a criação do pedido;
`paid_at` é exibido separadamente. Intervalos invertidos e filtros inválidos retornam
400; páginas inexistentes retornam 404.

A resposta contém `count`, `total_pages`, `next`, `previous`, `results` e `summary`.
Totais e contadores de situação em `summary` consideram **todos os registros filtrados**,
independentemente da página. Valores decimais são strings com duas casas; respostas
usam `Cache-Control: no-store`. Os filtros ficam na URL da tela, permitindo compartilhar
um recorte com outro membro da equipe.

Regras de cálculo:

- Saldos e fluxo são expressos em moedas da carteira. O histórico inclui créditos
  de bônus: a reconciliação compara `balance + bonus_balance` com entradas menos saídas.
- `difference` é saldo atual menos saldo calculado. `absolute_difference` no resumo
  soma os módulos das diferenças para que divergências opostas não se ocultem.
  Situações: `consistent` até 0,01; `review` até 1,00; `discrepancy` acima de 1,00;
  `no_wallet` para usuários sem carteira. A consulta não corrige nem cria carteiras.
- O fluxo inclui transferências internas e bônus, portanto não equivale à receita
  em dinheiro. O acumulado começa em zero no período filtrado, em ordem cronológica,
  mesmo quando a tabela é exibida da data mais recente para a mais antiga.
- Pagamentos agrupam valores em `summary.currencies`, separando BRL e USD, com
  `total_amount`, `confirmed_amount` e `pending_amount` (pendente + processando).
  `coins`, `bonus_applied` e `total_credited` no resumo incluem apenas pedidos confirmados.
- A origem indica `simulation` para mock, `gateway` quando há referência externa
  ou `unidentified` quando ela falta. Não se presume confirmação manual. Tokens,
  payloads de gateway, URLs de checkout e IDs sequenciais internos não são expostos.

Os relatórios usam os dados existentes no PRO; não importam o histórico do SITE 1.x.
