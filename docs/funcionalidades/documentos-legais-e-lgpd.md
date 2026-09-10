# Documentos legais, cookies e LGPD

[← Índice da documentação](../README.md)

O PDL PRO publica um pacote legal versionado para o painel Lineage 2: Termos de
uso, Política de privacidade, Acordo do usuário, Política de cookies e página
LGPD, além do histórico público de versões.

## Onde vive o conteúdo

Os corpos HTML (pt/en/es) ficam em
`backend/apps/content/application/legal/`. A API pública expõe:

| Método | Caminho | Função |
| --- | --- | --- |
| GET | `/api/v1/public/legal/` | Lista slugs e títulos + versão vigente |
| GET | `/api/v1/public/legal/<slug>/` | Documento completo (`format: html`) |
| GET | `/api/v1/public/legal/history/` | Histórico de versões |

Rotas SPA: `/terms`, `/privacy`, `/agreement`, `/cookies`, `/lgpd`,
`/legal/history`.

## Identidade do controlador

Cada deploy preenche os dados do operador (controlador LGPD) via env — ver
[Configuração](../configuracao/ambiente.md). O software PDL PRO é o painel; o
operador do servidor é o controlador dos dados daquele deploy.

Antes de produção, revise os textos com assessoria jurídica e substitua os
placeholders (CNPJ, endereço, e-mails).

## Versionamento e reaceitação

- `LEGAL_DOCS_VERSION` define a versão vigente do pacote.
- No cadastro / completar credenciais OAuth, o aceite grava versão, data, IP e
  user-agent.
- `GET /api/v1/shared/me/` expõe `needs_terms_acceptance` quando a versão do
  usuário difere da vigente.
- `POST /api/v1/shared/me/accept-terms/` registra novo aceite.
- A SPA bloqueia o uso autenticado com `TermsReacceptanceGate` até o aceite.

Ao publicar mudanças substanciais: edite os documentos, acrescente entrada em
`LEGAL_DOCS_HISTORY`, atualize `LEGAL_DOCS_VERSION` (e `COOKIE_POLICY_VERSION` no
frontend se a política de cookies mudar).

## Cookies

O banner de cookies é **client-only** (`localStorage` `PDL_cookie_consent`), com
categorias essenciais / funcionais / analíticos / marketing. Cookies JWT de
sessão são essenciais e não podem ser desligados pelo banner.

O chrome visual (banner, modal de preferências e gate de reaceitação) vive em
`css/public/terms.css` (carregado no tema público e no painel, remapeável). O
corpo das páginas legais e o histórico usam `css/pages/public-pages.css`, no
mesmo padrão de Wiki/FAQ/Notícias.

## Direitos do titular (nesta versão)

Pedidos de acesso, correção, portabilidade e exclusão são atendidos via suporte
e e-mail do DPO, conforme a página `/lgpd`. Exportação/exclusão self-service
fica para uma entrega futura.
