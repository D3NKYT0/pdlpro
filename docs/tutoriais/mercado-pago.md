# Tutorial: Mercado Pago

[← Tutoriais](README.md) · [Pagamentos (técnica)](../integracoes/pagamentos.md) ·
[Configurador admin](../operacao/integracoes-admin.md)

Objetivo: vender moedas em **BRL** via Mercado Pago. Aba **Pagamentos**.

## URLs de webhook

Com `PAYMENT_WEBHOOK_BASE_URL=https://seudominio.com` (recomendado igual ao
domínio público), o painel notifica:

```text
https://seudominio.com/api/v1/system/webhooks/mercadopago/
```

Essa URL precisa ser alcançável pela internet (HTTPS da Release).

## No Mercado Pago

1. Conta em [https://www.mercadopago.com.br/developers](https://www.mercadopago.com.br/developers).
2. Crie uma aplicação (produção e/ou teste).
3. Copie:
   - **Access Token** → `MERCADO_PAGO_ACCESS_TOKEN`
   - **Public Key** → `MERCADO_PAGO_PUBLIC_KEY`
4. Configure Webhooks / notificações para a URL acima (eventos de pagamento).
5. Segredo de assinatura do webhook → `MERCADO_PAGO_WEBHOOK_SECRET` (quando o
   painel exigir HMAC; use o valor que o console mostrar para a assinatura).

Comece em **credenciais de teste**. Só ative produção depois de homologar.

## No PDL

1. `/panel/admin/integrations` → **Pagamentos**.
2. Preencha token, public key e webhook secret.
3. `MERCADO_PAGO_ACTIVATE_PAYMENTS` = ligado.
4. `PAYMENT_METHODS` deve incluir `mercadopago` (ex.: `mercadopago,stripe`).
5. `PAYMENT_WEBHOOK_BASE_URL` = `https://seudominio.com`.
6. Em produção: `PAYMENT_ALLOW_MOCK` = desligado.
7. Salve → **Testar**.

Pacotes de moedas e promoções: `/panel/admin/wallet` e admin de pacotes —
não ficam nesta aba.

## Conferir

1. Jogador: `/panel/wallet` → comprar com BRL / Mercado Pago (sandbox).
2. Complete o pagamento de teste.
3. Confirme crédito na carteira e extrato.
4. No admin financeiro, o pedido deve aparecer liquidado após o webhook.

Detalhe do fluxo interno: [Pagamentos](../integracoes/pagamentos.md).

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| Pedido fica pendente | webhook não chega (HTTP 404/502, URL errada, firewall) |
| Assinatura inválida | `MERCADO_PAGO_WEBHOOK_SECRET` divergente; proxy alterando o body |
| Método não aparece | `mercadopago` fora de `PAYMENT_METHODS` ou activate desligado |
| Só BRL | esperado — Mercado Pago no PDL é BRL |

Voltar: [Tutoriais](README.md).
