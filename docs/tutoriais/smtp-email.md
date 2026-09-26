# Tutorial: e-mail (SMTP)

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [← Tutoriais](README.md) · [Configurador admin](../operacao/integracoes-admin.md)

> **Atualizado:** 25 de setembro de 2026

Objetivo: o painel envia e-mail de verificação, recuperação de senha, códigos
e avisos. Configure na aba **SMTP / Push** em `/panel/admin/integrations`.

## Antes

- Painel instalado com HTTPS ([DNS](dns-cloudflare.md)).
- Conta SMTP do provedor (Amazon SES, Mailgun, Brevo, Resend, Google Workspace
  com senha de app, etc.).

## Campos na aba SMTP / Push

| Campo | Exemplo |
| --- | --- |
| `EMAIL_HOST` | `smtp.seudominio.com` ou o host do provedor |
| `EMAIL_PORT` | `587` (STARTTLS) ou `465` (SSL) |
| `EMAIL_USE_TLS` | ligado com porta 587 |
| `EMAIL_USE_SSL` | ligado com porta 465 (não ligue TLS e SSL juntos) |
| `EMAIL_HOST_USER` | usuário SMTP |
| `EMAIL_HOST_PASSWORD` | senha / app password |
| `DEFAULT_FROM_EMAIL` | `noreply@seudominio.com` (domínio alinhado ao provedor) |
| `EMAIL_BACKEND` | deixe o backend SMTP do Django salvo pelo instalador, salvo se o provedor exigir outro |

Salve e use **Testar** na seção SMTP: o painel envia um e-mail de prova (informe
o destinatário se a UI pedir).

## Conferir no produto

1. Cadastre um usuário de teste com e-mail real (ou peça reenvio de verificação).
2. Peça “esqueci a senha” e abra o link.
3. Confira a pasta de spam na primeira vez.

## Problemas comuns

| Sintoma | O que checar |
| --- | --- |
| Teste falha com auth | usuário/senha, senha de app, IP da VPS liberado no provedor |
| Envia mas cai em spam | SPF/DKIM/DMARC do domínio no DNS; `DEFAULT_FROM_EMAIL` no mesmo domínio autenticado |
| Timeout | firewall de saída 587/465; host/porta errados |

Push (VAPID) é outro tutorial: [Push](push-vapid.md) — mesma aba, campos
separados.

Voltar: [Tutoriais](README.md).
