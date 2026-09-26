# Pagamentos e webhooks

[Índice](../README.md) · [Configuração](../configuracao/ambiente.md) ·
[Tutoriais](../tutoriais/README.md) · [Testes](../desenvolvimento/testes.md)

`apps/payment` coordena compra de moedas; `apps/wallet` mantém saldo e extrato. Os adaptadores disponíveis são mock, Mercado Pago e Stripe. Este guia descreve o fluxo implementado pelo painel; credenciais e homologação devem corresponder ao ambiente do provedor escolhido.

## Fluxo e responsabilidades

| Etapa | Componente | Efeito |
| --- | --- | --- |
| Cotação | `CoinPricingService` | Converte pacote ou valor em BRL/USD para moedas |
| Bônus | `IPurchaseBonusPolicy` | Calcula bônus e total sem creditar |
| Seleção | `PaymentGatewayRegistry` | Obtém um adaptador disponível |
| Pedido | `CreatePaymentOrderUseCase` | Reutiliza pedido compatível ou cria pedido e checkout |
| Processamento | `ProcessPaymentUseCase` | Solicita processamento ao provedor e aplica seu resultado |
| Consulta | `GetPaymentStatusUseCase` | Sincroniza o estado e pode liquidar um pagamento aprovado |
| Webhook | `WebhookSignatureService` e views | Validam a origem antes de encaminhar o resultado |
| Liquidação | `SettlePaymentUseCase` | Credita moedas/bônus e confirma o pedido no banco do painel |

Os tipos e limites estão em [application/use_cases.py](../../backend/apps/payment/application/use_cases.py). `amount` pertence à moeda indicada por `currency`; `coins` representa saldo do painel. Não some valores de BRL e USD nem confunda bônus com saldo principal.

A listagem do jogador `GET /api/v1/customer/payments/` usa paginação padrão (`page`, `page_size`, envelope com `count`, `total_pages`, `results`) e inclui `created_at` / `paid_at`. O extrato `GET /api/v1/shared/wallet/transactions/` segue o mesmo envelope.

## Promoção de recarga

Campanhas de banner na carteira usam o modelo `CoinPurchasePromo`. Configure em `/panel/admin/wallet` (também disponível no Jazzmin: **Promoções de recarga**). Campos: percentual, título, descrição, ativo e vigência opcional (`starts_at` / `ends_at`). No máximo uma campanha fica marcada como ativa.

- Staff: `GET/PUT /api/v1/staff/wallet-promo/`.
- O catálogo `GET /api/v1/customer/payments/catalog/` devolve `promo` com `percent`, `title` e `description` quando a campanha está vigente; caso contrário `promo` é `null`.
- O efeito econômico é **bônus de moedas** via `IPurchaseBonusPolicy`: a promo eleva o piso do percentual (`max` entre faixa `CoinPurchaseBonus` e a campanha). O valor cobrado no gateway (`amount`) não muda.
- A liquidação já existente credita o bônus em `bonus_balance` com a descrição da campanha ou da faixa, conforme o percentual efetivo.

Configure a campanha em `/panel/admin/wallet`, confira o banner em `/panel/wallet` e valide o crédito confirmando a simulação no admin financeiro.

## Configuração

Use `PAYMENT_METHODS` e as chaves na aba **Pagamentos** do
[configurador admin](../operacao/integracoes-admin.md). Tutoriais do
operador: [Mercado Pago](../tutoriais/mercado-pago.md) e
[Stripe](../tutoriais/stripe.md). Mapa de variáveis:
[Ambiente](../configuracao/ambiente.md).

As flags de ativação dos provedores controlam o processamento real. O mock é
exclusivo de desenvolvimento e testes; `core.settings.test` o habilita
explicitamente.

`PAYMENT_WEBHOOK_BASE_URL` deve ser o HTTPS público da instalação. Rotas:
`/api/v1/system/webhooks/mercadopago/` e `/api/v1/system/webhooks/stripe/`.
Não copie URL de outro ambiente sem conferir o domínio.

## Confirmação, repetição e erros

- `ApplyGatewayPaymentUseCase` localiza o pedido e encaminha eventos aprovados, mas não valida assinatura sozinho.
- `SettlePaymentUseCase` devolve pedidos já confirmados sem aplicar outro crédito nessa execução. A correção sob concorrência depende também do repositório e da transação; não presuma uma garantia distribuída apenas por essa checagem.
- Confirmação de simulação é exclusiva da equipe: `POST /api/v1/staff/payments/{id}/confirm-mock/`. O jogador não confirma nem processa mock; o pedido fica pendente até um membro da equipe creditar no admin (`/panel/admin/reports/financial/payments`). Não use esse caminho para simular recebimento financeiro real em produção.
- `CancelPaymentOrderUseCase` cancela o estado local do pedido. Isso não equivale a cancelar ou estornar uma cobrança no provedor.
- Chamadas HTTP ao gateway não participam do rollback de `DjangoUnitOfWork`. Uma falha após a chamada externa exige verificar o estado no provedor antes de tentar corrigir o pedido.

Para Mercado Pago, o serviço confere a assinatura HMAC e o timestamp. Para Stripe, a validação usa o SDK com os bytes originais do corpo. Preserve corpo e headers necessários no proxy. Segredos privados não devem aparecer no catálogo público nem em logs. O registro persistido do webhook (`sanitize_webhook_payload`) guarda só `id`, tipo, status e `order_id` de metadados — sem e-mail, documento, `client_secret` ou payload completo do provedor. Depois que o pedido confirma, falha ou cancela, `client_secret` e códigos PIX/boleto saem da linha do pedido; o checkout Stripe ainda usa o `client_secret` enquanto o pagamento está pendente.

## Homologação

Em um ambiente de testes do provedor, verifique criação/reutilização de pedido, processamento aprovado e rejeitado, consulta pendente, webhook válido e inválido, repetição e acesso por outro usuário. Confirme pedido, carteira e extrato; não se limite ao texto de sucesso da tela.

Os testes em [payment/tests](../../backend/apps/payment/tests/) e nos fluxos de comércio usam isolamento e simulações. A suíte local não comprova recebimento, estorno nem entrega de um webhook externo real. Registre a homologação com ambiente, revisão e resultados, sem incluir tokens ou dados sensíveis.

## Segurança e concorrência

A liquidação bloqueia o pedido antes de decidir o crédito. Respostas tardias de status não reabrem pedidos encerrados. Consulte [Segurança de contas e operações](../operacao/seguranca.md) para os testes PostgreSQL e o procedimento de atualização.
