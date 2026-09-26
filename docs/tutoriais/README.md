# Tutoriais de integração

[← Índice](../README.md) · [Distribuição](../operacao/distribuicao.md) ·
[Configurador admin](../operacao/integracoes-admin.md) ·
[Fonte única](../projeto/fonte-unica.md)

> [!IMPORTANT]
> Faça a [instalação pela Release](../operacao/distribuicao.md) antes. Quase
> tudo abaixo se configura em **`/panel/admin/integrations`** (superadmin),
> sem editar `.env` nem reiniciar containers.

> [!TIP]
> Estes tutoriais são **setup do provedor**. Referência de hot-apply/API:
> [Integrações admin](../operacao/integracoes-admin.md). Lista de variáveis:
> [Ambiente](../configuracao/ambiente.md).

## Ordem sugerida

| # | Tutorial | Precisa? |
| --- | --- | --- |
| 1 | [DNS e Cloudflare](dns-cloudflare.md) | Sim |
| 2 | [E-mail (SMTP)](smtp-email.md) | Quase sempre |
| 3 | [hCaptcha](hcaptcha.md) | Recomendado |
| 4 | [OAuth Google e Discord](oauth-google-discord.md) | Opcional |
| 5 | [Passkeys (WebAuthn)](webauthn-passkeys.md) | Opcional |
| 6 | [Mercado Pago](mercado-pago.md) / [Stripe](stripe.md) | Se vender moedas |
| 7 | [Lineage 2](lineage-game.md) | Se ligar o jogo |
| 8 | [Push (VAPID)](push-vapid.md) | Opcional |
| 9 | [Denkynho (LLM)](denkynho-llm.md) | Opcional |
| 10 | [S3 / R2](storage-s3-r2.md) | Opcional |
| 11 | [Sentry](sentry.md) | Opcional |

## Referência técnica (não são tutoriais)

| Tema | Documento |
| --- | --- |
| Hot-apply e abas | [Configurador admin](../operacao/integracoes-admin.md) |
| Fluxo de pagamento | [Pagamentos](../integracoes/pagamentos.md) |
| Dialetos SQL | [Lineage](../integracoes/lineage.md) |
| Economia no produto | [Economia do jogador](../funcionalidades/economia-jogador.md) |
| Sessões / proxies | [Segurança operacional](../operacao/seguranca.md) |
