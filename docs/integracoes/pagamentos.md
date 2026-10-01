# Pagamentos e webhooks

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Configuração](../configuracao/ambiente.md) · [Tutoriais](../tutoriais/README.md) · [Testes](../desenvolvimento/testes.md)

> **Atualizado:** 1 de outubro de 2026

`apps/payment` coordena compra de moedas; `apps/wallet` mantém saldo e extrato. Os adaptadores disponíveis são mock, Mercado Pago e Stripe. Este guia descreve o fluxo implementado pelo painel; credenciais e homologação devem corresponder ao ambiente do provedor escolhido.

## Fluxo e responsabilidades

No modal da carteira, completar o CPF/CNPJ monta o Payment Brick do Mercado Pago.
O contêiner permanece visível durante a inicialização para permitir que o SDK
calcule suas dimensões; `onReady` remove apenas o indicador de carregamento.
O teste de interação em `WalletCheckoutModal.test.tsx` cobre a digitação do CPF,
a visibilidade antes de `onReady` e a preservação do contêiner após carregar.

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

A loja publicada cobra em BRL e USD. O desenho para o admin ligar outras moedas, com preço por pacote e apresentação da Stripe, está no [plano de moedas de cobrança](../historico/2026-09-30-plano-moedas-de-cobranca.md). Esse texto é planejamento, não o comportamento deste guia.

A listagem do jogador `GET /api/v1/customer/payments/` usa paginação padrão (`page`, `page_size`, envelope com `count`, `total_pages`, `results`) e inclui `created_at` / `paid_at`. O extrato `GET /api/v1/shared/wallet/transactions/` segue o mesmo envelope.

## Promoção de recarga e configurador de bônus

Campanhas de banner na carteira e regras de bônus são centralizadas em `/panel/admin/wallet` (também disponíveis no Jazzmin: **Promoções de recarga** e **Faixas de bônus na compra de moedas**).

- **Campanha sazonal / Evento:** Modelo `CoinPurchasePromo`. Campos: `percent`, `title`, `description`, `badge` (selo visual), `stacking_mode` (`max` para prevalecer o maior entre campanha e faixa, ou `sum` para somar a campanha à faixa progressiva), `active` e vigência opcional (`starts_at` / `ends_at`).
- **Faixas progressivas de moedas:** Modelo `CoinPurchaseBonus`. Permite definir intervalos (`min_amount` até `max_amount` ou sem limite) com percentual e prioridade (`order`). Gerenciáveis diretamente na SPA em `/panel/admin/wallet` via `GET/POST/PUT/DELETE /api/v1/staff/bonus-tiers/`.
- **Incentivos especiais de conversão:**
  - **1ª Recarga:** Bônus configurável (`first_purchase_active` e `first_purchase_percent`) concedido na primeira compra de moedas da conta.
  - **Incentivo PIX:** Bônus percentual adicional (`pix_bonus_percent`) concedido automaticamente em pagamentos processados via PIX.
- **Simulador em tempo real:** Endpoint `POST /api/v1/staff/bonus-simulation/` calcula o total de moedas, bônus acumulado e o detalhamento por regra (faixa, campanha, PIX e 1ª compra) para qualquer quantidade e método selecionados na interface.
- O catálogo público `GET /api/v1/customer/payments/catalog/` devolve `promo` com `percent`, `title` e `description` quando a campanha está vigente; caso contrário `promo` é `null`.
- O efeito econômico é **bônus de moedas** via `IPurchaseBonusPolicy`. O valor cobrado no gateway (`amount`) não muda.
- A liquidação credita o bônus em `bonus_balance` com a composição das descrições das regras aplicadas.

## Configuração

Use `PAYMENT_METHODS` e as chaves na aba **Pagamentos** do
[configurador admin](../operacao/integracoes-admin.md). Tutoriais do
operador: [Mercado Pago](../tutoriais/mercado-pago.md) e
[Stripe](../tutoriais/stripe.md). Mapa de variáveis:
[Ambiente](../configuracao/ambiente.md).

As flags de ativação dos provedores controlam o processamento real. O mock é
exclusivo de desenvolvimento e testes; `core.settings.test` o habilita
explicitamente.

Quando Mercado Pago e Stripe estão ativos ao mesmo tempo, `PAYMENT_BRL_METHOD_PRIORITY`
(aba Pagamentos) decide o BRL: `user_choice` mostra o seletor e deixa Mercado Pago
como padrão; `mercadopago` fixa o Mercado Pago e reserva o Stripe para USD;
`stripe` fixa o cartão e tira o Mercado Pago do catálogo. A mesma regra vale na
criação de pedidos novos: o cliente não escolhe o método que o admin fixou.

Quando um cartão recusa a moeda na Stripe, a carteira reabre a mesma compra em uma
moeda alternativa e mantém a Stripe quando ela aceita essa moeda. Essa repetição
também pode usar BRL com Mercado Pago fixo para compras novas: o catálogo expõe
`retry_currencies`, separado das moedas oferecidas na seleção inicial. O backend
exige `source_order_id` de um pedido Stripe pendente/processando do próprio usuário
em outra moeda, preserva o pacote/quantidade de moedas e recota o valor. Moedas não
configuradas na Stripe continuam bloqueadas. A carteira permite uma única troca
automática por checkout; nova recusa mostra o erro do provedor.

Os testes de `WalletPage.test.tsx` e `test_charge_currencies.py` cobrem o fallback
USD → BRL na Stripe, a remontagem do formulário, repetição do pedido sem duplicação
de checkout e rejeição de moeda não aceita ou tentativa de compra nova pela exceção.

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
