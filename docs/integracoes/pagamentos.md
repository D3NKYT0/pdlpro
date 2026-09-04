# Pagamentos e webhooks

[Índice](../README.md) · [Configuração](../configuracao/ambiente.md) · [Testes](../desenvolvimento/testes.md)

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

## Configuração

Use `PAYMENT_METHODS` para selecionar métodos expostos e configure as chaves e segredos de webhook conforme [Variáveis de ambiente](../configuracao/ambiente.md). As flags de ativação dos provedores controlam disponibilidade do processamento real. O mock é exclusivo de desenvolvimento e testes; `core.settings.test` o habilita explicitamente.

`PAYMENT_WEBHOOK_BASE_URL` deve apontar para o endereço público correto da instalação. Consulte as rotas efetivas em [URLs do pagamento](../../backend/apps/payment/presentation/urls/) e o schema OpenAPI; não copie URLs de outro ambiente sem conferir o prefixo publicado pelo proxy.

## Confirmação, repetição e erros

- `ApplyGatewayPaymentUseCase` localiza o pedido e encaminha eventos aprovados, mas não valida assinatura sozinho.
- `SettlePaymentUseCase` devolve pedidos já confirmados sem aplicar outro crédito nessa execução. A correção sob concorrência depende também do repositório e da transação; não presuma uma garantia distribuída apenas por essa checagem.
- Confirmação manual pelo fluxo atual é restrita ao método mock habilitado. Não use esse caminho para simular recebimento financeiro real em produção.
- `CancelPaymentOrderUseCase` cancela o estado local do pedido. Isso não equivale a cancelar ou estornar uma cobrança no provedor.
- Chamadas HTTP ao gateway não participam do rollback de `DjangoUnitOfWork`. Uma falha após a chamada externa exige verificar o estado no provedor antes de tentar corrigir o pedido.

Para Mercado Pago, o serviço confere a assinatura HMAC e o timestamp. Para Stripe, a validação usa o SDK com os bytes originais do corpo. Preserve corpo e headers necessários no proxy. Segredos privados não devem aparecer no catálogo público nem em logs.

## Homologação

Em um ambiente de testes do provedor, verifique criação/reutilização de pedido, processamento aprovado e rejeitado, consulta pendente, webhook válido e inválido, repetição e acesso por outro usuário. Confirme pedido, carteira e extrato; não se limite ao texto de sucesso da tela.

Os testes em [payment/tests](../../backend/apps/payment/tests/) e nos fluxos de comércio usam isolamento e simulações. A suíte local não comprova recebimento, estorno nem entrega de um webhook externo real. Registre a homologação com ambiente, revisão e resultados, sem incluir tokens ou dados sensíveis.

## Segurança e concorrência

A liquidação bloqueia o pedido antes de decidir o crédito. Respostas tardias de status não reabrem pedidos encerrados. Consulte [Segurança de contas e operações](../operacao/seguranca.md) para os testes PostgreSQL e o procedimento de atualização.
