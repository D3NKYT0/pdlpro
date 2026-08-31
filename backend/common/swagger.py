"""OpenAPI helpers for the PDL PRO API."""

OPENAPI_TITLE = "PDL PRO API"

OPENAPI_DESCRIPTION = """
API REST do **PDL PRO** (Painel Definitivo Lineage 2.0).

Backend somente API. O frontend React consome estes contratos.

## Autenticação

- **JWT** — cookie HttpOnly (`PDL-auth`) ou header `Authorization: Bearer <token>`.
- Em escritas autenticadas por cookie, envie também `X-CSRFToken`.

## Prefixos

| Prefixo | Uso |
|---|---|
| `/api/v1/auth/` | Cadastro, login, tokens |
| `/api/v1/shared/` | Perfil, carteira, loja, conteúdo autenticado |
| `/api/v1/public/` | Rankings, status do servidor, notícias públicas |
| `/api/v1/customer/` | Conta Lineage, inventário, jogos |
| `/api/v1/system/` | Health e versão |

## Contrato

- Identificadores públicos são UUID (`id`). O `seq_id` sequencial é interno.
- Erros 4xx/5xx usam o envelope `error_code`, `message`, `details` e `request_id`.
""".strip()


pdl_swagger_tags: list[dict[str, str]] = [
    {"name": "Auth", "description": "Cadastro, login, refresh e logout."},
    {"name": "Perfil", "description": "Dados do jogador autenticado."},
    {"name": "Servidor", "description": "Status e rankings do Lineage 2."},
    {"name": "Carteira", "description": "Saldo, transferências e extrato."},
    {"name": "Loja", "description": "Itens, pacotes, carrinho e checkout."},
    {"name": "Conteúdo", "description": "Notícias, FAQ e páginas públicas."},
    {"name": "Sistema", "description": "Health check e versão da API."},
]
