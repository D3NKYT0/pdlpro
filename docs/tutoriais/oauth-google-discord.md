# Tutorial: OAuth Google e Discord

[← Tutoriais](README.md) · [Configurador admin](../operacao/integracoes-admin.md)

Objetivo: botões “Entrar com Google/Discord” no login e cadastro. Aba
**OAuth / Auth**.

## Redirect URI (igual nos dois provedores)

O PDL troca o código OAuth usando a URL do **frontend**:

```text
https://seudominio.com/auth/callback/google
https://seudominio.com/auth/callback/discord
```

`FRONTEND_URL` / domínio da instalação devem ser exatamente esse host
(HTTPS, sem barra no final na variável; a URI acima inclui o caminho).

## Google

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs e serviços
   → Credenciais → **Criar credenciais** → ID do cliente OAuth.
2. Tipo: **Aplicativo da Web**.
3. Em **URIs de redirecionamento autorizados**, adicione:
   `https://seudominio.com/auth/callback/google`
4. Copie **Client ID** e **Client secret**.
5. No PDL: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` → Salvar → Testar.

Tela de consentimento OAuth precisa estar publicada (ou usuários de teste
listados) para contas fora da organização.

## Discord

1. [Discord Developer Portal](https://discord.com/developers/applications)
   → New Application → OAuth2.
2. Redirects: `https://seudominio.com/auth/callback/discord`
3. Copie **Client ID** e **Client Secret**.
4. No PDL: `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET` → Salvar → Testar.

Scopes usados pelo painel: identificação básica (e-mail quando o provedor
enviar). Não é necessário bot de servidor.

## Conferir

1. `/login` → botões Google/Discord habilitados
   (`GET /api/v1/auth/capabilities/` com `google` / `discord` true).
2. Fluxo completo: autorizar → voltar a `/auth/callback/...` → sessão no
   painel.
3. Em Conta, vincular/desvincular provedor com usuário já logado.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| `redirect_uri_mismatch` | URI no console diferente (http×https, www×apex, barra final) |
| Botão desabilitado | client id/secret incompletos |
| Conta social não vincula e-mail local | e-mail ainda não verificado no painel — ver [Segurança](../operacao/seguranca.md) |

Voltar: [Tutoriais](README.md).
