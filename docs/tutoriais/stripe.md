# Tutorial: Stripe

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [← Tutoriais](README.md) · [Pagamentos (técnica)](../integracoes/pagamentos.md) · [Configurador admin](../operacao/integracoes-admin.md)

> **Atualizado:** 25 de setembro de 2026

Objetivo: vender moedas via Stripe (USD/BRL conforme o catálogo). Aba
**Pagamentos**.

## URL de webhook

```text
https://seudominio.com/api/v1/system/webhooks/stripe/
```

`PAYMENT_WEBHOOK_BASE_URL` deve ser `https://seudominio.com` (sem path).

## No Stripe

1. [https://dashboard.stripe.com/](https://dashboard.stripe.com/) — mode **Test**.
2. Developers → API keys:
   - Secret key → `STRIPE_SECRET_KEY` (`sk_test_…`)
   - Publishable key → `STRIPE_PUBLISHABLE_KEY` (`pk_test_…`)
3. Developers → Webhooks → Add endpoint:
   - URL: `https://seudominio.com/api/v1/system/webhooks/stripe/`
   - Eventos: no mínimo os de PaymentIntent / checkout que o painel processa
     (comece com `payment_intent.succeeded` e `payment_intent.payment_failed`;
     amplie se o dashboard sugerir outros usados pelo fluxo).
4. Signing secret (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.

Homologue em teste. Troque para chaves **live** só depois.

## No PDL

1. Aba **Pagamentos**: secret, publishable, webhook secret.
2. `STRIPE_ACTIVATE_PAYMENTS` ligado.
3. `PAYMENT_METHODS` inclui `stripe`.
4. `PAYMENT_WEBHOOK_BASE_URL=https://seudominio.com`.
5. `PAYMENT_ALLOW_MOCK` desligado em produção.
6. `COINS_PER_USD` se usar cotação em USD — alinhe à política comercial.
7. Salve → **Testar**.

## Conferir

1. Compra de teste no painel (cartão de teste Stripe).
2. Webhook entregue (Dashboard → Webhooks → tentativas 2xx).
3. Carteira creditada; pedido no admin financeiro.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| `Webhook signature verification failed` | `whsec` errado; body modificado pelo proxy |
| 404 no endpoint | domínio/HTTPS; path sem `/api/v1/system/webhooks/stripe/` |
| Chaves live no ambiente de teste | misturou modos — use só `sk_test` / `pk_test` até homologar |

Voltar: [Tutoriais](README.md).
