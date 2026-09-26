# Tutorial: hCaptcha

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [← Tutoriais](README.md) · [Configurador admin](../operacao/integracoes-admin.md)

> **Atualizado:** 25 de setembro de 2026

Objetivo: proteger login/cadastro com desafio hCaptcha. Aba
**OAuth / Auth** em `/panel/admin/integrations`.

O site key chega ao navegador pela API `GET /api/v1/auth/capabilities/` —
não precisa rebuildar a imagem `web` da Release.

## No painel do hCaptcha

1. Crie conta em [https://www.hcaptcha.com/](https://www.hcaptcha.com/).
2. Crie um site (hostnames):
   - `seudominio.com`
   - `www.seudominio.com` (se usar)
3. Copie **Site Key** e **Secret Key**.

## No PDL

1. `/panel/admin/integrations` → aba **OAuth / Auth**.
2. Preencha `HCAPTCHA_SITE_KEY` e `HCAPTCHA_SECRET_KEY`.
3. Salve. O hot-apply liga `HCAPTCHA_ENABLED` só quando **as duas** chaves
   existem.
4. Use **Testar** na seção OAuth (relatório de configuração).

## Conferir

1. Abra `/login` e `/register` em aba anônima.
2. O widget hCaptcha deve aparecer quando o captcha estiver exigido.
3. Cadastro/login sem token devem falhar; com desafio resolvido, seguir.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| Widget não aparece | só uma das chaves salva; hostname não cadastrado no hCaptcha |
| “invalid-input-response” | secret errada, ou site key de outro ambiente |
| Funciona no PC e não no domínio | hostname `seudominio.com` ausente na lista do site hCaptcha |

Voltar: [Tutoriais](README.md).
