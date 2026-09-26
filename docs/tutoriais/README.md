# Tutoriais de integração

[← Índice da documentação](../README.md) ·
[Instalar (Release)](../operacao/distribuicao.md) ·
[Configurador admin](../operacao/integracoes-admin.md)

Depois que o painel sobe pela [Release](../operacao/distribuicao.md), a maior
parte das integrações se configura em **`/panel/admin/integrations`**
(superadmin), sem editar `.env` nem reiniciar containers.

Estes tutoriais são o roteiro do operador: conta no provedor → preencher a
aba → **Salvar** → **Testar** → conferir no site.

## Ordem sugerida

| Passo | Tutorial | Obrigatório? |
| --- | --- | --- |
| 1 | [DNS e Cloudflare](dns-cloudflare.md) | Sim (domínio + HTTPS) |
| 2 | [E-mail (SMTP)](smtp-email.md) | Quase sempre (cadastro, reset, 2FA) |
| 3 | [hCaptcha](hcaptcha.md) | Recomendado em produção |
| 4 | [OAuth Google e Discord](oauth-google-discord.md) | Opcional |
| 5 | [Passkeys (WebAuthn)](webauthn-passkeys.md) | Opcional |
| 6 | [Mercado Pago](mercado-pago.md) / [Stripe](stripe.md) | Se vender moedas |
| 7 | [Lineage 2 (MySQL e game)](lineage-game.md) | Se ligar o jogo |
| 8 | [Push (VAPID)](push-vapid.md) | Opcional |
| 9 | [Denkynho (LLM)](denkynho-llm.md) | Opcional |
| 10 | [Mídia S3 / Cloudflare R2](storage-s3-r2.md) | Opcional |
| 11 | [Sentry](sentry.md) | Opcional |

## Referência técnica

- Mapa de chaves e hot-apply: [Configurador admin](../operacao/integracoes-admin.md)
- Variáveis completas: [Ambiente](../configuracao/ambiente.md)
- Pagamentos (fluxo interno): [Pagamentos](../integracoes/pagamentos.md)
- Lineage (dialetos/SQL): [Lineage](../integracoes/lineage.md)
