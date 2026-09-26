# Tutorial: Push (VAPID)

[← Tutoriais](README.md) · [Configurador admin](../operacao/integracoes-admin.md)

Objetivo: notificações web push no navegador. Mesma aba **SMTP / Push**.

## Gerar o par de chaves

Em qualquer máquina com Node.js:

```bash
npx --yes web-push generate-vapid-keys
```

Copie a public key e a private key para o configurador. **Nunca** comite as
chaves no Git.

## Campos

| Campo | Valor |
| --- | --- |
| `VAPID_PUBLIC_KEY` | chave pública (browser) |
| `VAPID_PRIVATE_KEY` | chave privada (servidor) — segredo |
| `VAPID_SUBJECT` | `mailto:voce@seudominio.com` ou `https://seudominio.com` |

Salve → **Testar**.

## Conferir

1. Jogador logado permite notificações no navegador.
2. Dispare um aviso pelo admin de notificações e confirme o push.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| Push indisponível | par incompleto; subject inválido |
| Funciona no Chrome e não no Safari | políticas do SO/navegador; HTTPS obrigatório |

Voltar: [Tutoriais](README.md).
