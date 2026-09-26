# Tutorial: Passkeys (WebAuthn)

[← Tutoriais](README.md) · [Configurador admin](../operacao/integracoes-admin.md)

Objetivo: login sem senha com chave do dispositivo (Windows Hello, Face ID,
YubiKey, etc.). Campos na aba **OAuth / Auth**.

## Campos

| Campo | Valor típico |
| --- | --- |
| `WEBAUTHN_RP_ID` | `seudominio.com` (sem `https://`, sem caminho) |
| `WEBAUTHN_RP_NAME` | Nome público do servidor (ex.: marca do painel) |
| `WEBAUTHN_ORIGINS` | `https://seudominio.com` (vírgula se houver mais de um) |

O RP ID deve ser o **domínio efetivo** que o navegador mostra na barra. Se o
jogador abre `www.seudominio.com`, ou você redireciona www→apex, ou inclui a
origem correspondente.

O instalador da Release já preenche esses valores a partir do `--domain`.
Só ajuste se mudar o domínio ou o proxy.

## Conferir

1. Entre na conta → Conta e segurança (`/panel/security`).
2. Registre uma passkey.
3. Saia e entre de novo só com a passkey.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| Registro falha | RP ID ≠ host atual; origem HTTP em produção; Cloudflare/proxy cortando |
| Funciona no PC e não no celular | dispositivo sem plataforma autenticadora; use chave de segurança |
| Depois de mudar o domínio | atualize RP ID/origens e peça novo registro das passkeys |

Voltar: [Tutoriais](README.md).
