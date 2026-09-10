"""OpenAPI helpers for the PDL PRO API."""

from __future__ import annotations

from typing import Any

from django.utils.translation import gettext_lazy as _

OPENAPI_TITLE = "PDL PRO API"

# Keep leading/trailing newlines: msgid must match locale/*.po exactly (no .strip()).
OPENAPI_DESCRIPTION = _(
    """
API REST do **PDL PRO** (Painel Definitivo Lineage 2.0).

Backend somente API. O frontend React consome estes contratos.

## Autenticação

- **JWT** — cookie HttpOnly (`PDL-auth`) ou header `Authorization: Bearer <token>`.
- Em escritas autenticadas por cookie, envie também `X-CSRFToken`.

## Prefixos

| Prefixo | Uso |
|---|---|
| `/api/v1/auth/` | Cadastro, login, tokens, OAuth e passkeys |
| `/api/v1/shared/` | Perfil, carteira, loja, conteúdo autenticado |
| `/api/v1/public/` | Rankings, status do servidor, notícias e programas públicos |
| `/api/v1/customer/` | Conta Lineage, inventário, jogos e apoiadores |
| `/api/v1/staff/` | Administração do painel |
| `/api/v1/system/` | Health e versão |

## Contrato

- Identificadores públicos são UUID (`id`). O `seq_id` sequencial é interno.
- Erros 4xx/5xx usam o envelope `error_code`, `message`, `details` e `request_id`.
"""
)


pdl_swagger_tags: list[dict[str, Any]] = [
    {
        "name": "Auth",
        "description": _(
            "Cadastro, login, CSRF, refresh, logout, verificação de e-mail, "
            "recuperação de senha, 2FA, OAuth social e capacidades de autenticação."
        ),
    },
    {
        "name": "Passkeys",
        "description": _(
            "Registro, listagem, exclusão e autenticação WebAuthn/passkey "
            "(desafios begin/complete)."
        ),
    },
    {
        "name": "Perfil",
        "description": _(
            "Dados do jogador autenticado, preferências, progresso gamer "
            "e resgate de recompensas de perfil."
        ),
    },
    {
        "name": "Servidor",
        "description": _(
            "Status do servidor Lineage 2, informações públicas, rankings "
            "e consultas de personagens/contas."
        ),
    },
    {
        "name": "Catálogo de itens",
        "description": _(
            "Consulta pública/autenticada ao catálogo de itens do servidor."
        ),
    },
    {
        "name": "Carteira",
        "description": _(
            "Saldo de moedas do painel, transferências entre jogadores, "
            "extrato e câmbio de moedas painel ↔ jogo."
        ),
    },
    {
        "name": "Loja",
        "description": _(
            "Catálogo de itens da loja, carrinho, atualização de itens e checkout."
        ),
    },
    {
        "name": "Comércio",
        "description": _(
            "Pacotes, cotação do carrinho, opções (cupom/bônus) e histórico de compras. "
            "Staff gerencia pacotes e códigos promocionais."
        ),
    },
    {
        "name": "Conteúdo",
        "description": _(
            "Notícias, FAQ, downloads, assistente Denkynho, wardrobe e conteúdo "
            "autenticado do painel."
        ),
    },
    {
        "name": "Wiki",
        "description": _("Artigos da wiki pública do servidor."),
    },
    {
        "name": "Calendário",
        "description": _("Eventos do calendário público do servidor."),
    },
    {
        "name": "Legal",
        "description": _("Documentos legais públicos (termos, privacidade e afins)."),
    },
    {
        "name": "Conta Lineage",
        "description": _(
            "Vínculo e desvínculo de contas do jogo, personagens, senha, "
            "nickname, sexo, unstuck, slots e preços de serviços."
        ),
    },
    {
        "name": "Inventário",
        "description": _(
            "Dashboard do inventário no painel, itens/equipamentos do personagem, "
            "retirada, depósito e troca."
        ),
    },
    {
        "name": "Jogos",
        "description": _(
            "Roleta, bônus diário, bag, caixas, minigames, dados, slots, pesca, "
            "economia, monstro, encantamento, battle pass, detalhes avançados e estatísticas."
        ),
    },
    {
        "name": "Marketplace",
        "description": _(
            "Listagens públicas e do jogador, compra e cancelamento no marketplace."
        ),
    },
    {
        "name": "Leilão",
        "description": _("Leilões públicos, meus leilões, criação e lances."),
    },
    {
        "name": "Pagamento",
        "description": _(
            "Catálogo de métodos, pedidos de recarga, preview de bônus, "
            "cancelamento, confirmação, processamento e status."
        ),
    },
    {
        "name": "Webhooks",
        "description": _(
            "Callbacks de provedores de pagamento (Mercado Pago, Stripe)."
        ),
    },
    {
        "name": "Notificações",
        "description": _("Lista de notificações do jogador e marcação como lidas."),
    },
    {
        "name": "Push",
        "description": _(
            "Chave VAPID pública e inscrição/remoção de push no navegador."
        ),
    },
    {
        "name": "Atendimento",
        "description": _(
            "Tickets de suporte do jogador: listagem, criação, detalhe e mensagens."
        ),
    },
    {
        "name": "Apoiadores",
        "description": _(
            "Inscrição de apoiador, comissões, cupons e solicitação de repasse. "
            "Staff revisa apoiadores e payouts."
        ),
    },
    {
        "name": "Roadmap",
        "description": _(
            "Roadmap público do projeto e CRUD administrativo das entradas."
        ),
    },
    {
        "name": "Recursos",
        "description": _(
            "Flags/recursos do sistema (feature toggles) públicos e administrativos."
        ),
    },
    {
        "name": "Temas",
        "description": _("Tema ativo do painel para o frontend."),
    },
    {
        "name": "Sistema",
        "description": _("Health check e versão da API."),
    },
    {
        "name": "Staff",
        "description": _(
            "Configurações do painel, preços de serviços, moedas, itens da loja, "
            "notícias, jogos, temas, inspeção de contas e demais operações administrativas."
        ),
    },
    {
        "name": "Staff - Atendimento",
        "description": _("Fila e detalhe de tickets para a equipe de suporte."),
    },
    {
        "name": "Staff / Financeiro",
        "description": _(
            "Relatórios de saldo, reconciliação, fluxo de caixa e pagamentos."
        ),
    },
    {
        "name": "Staff / Relatórios",
        "description": _(
            "Relatórios operacionais de inventário, leilões, compras da loja e marketplace."
        ),
    },
    {
        "name": "Staff - Itens customizados",
        "description": _(
            "CRUD administrativo do catálogo de itens customizados (metadados e ícones)."
        ),
    },
    {
        "name": "Staff - Observação de itens",
        "description": _(
            "Observação live de itens no L2, favoritos, capturas (snapshots), "
            "comparação e categorias de organização."
        ),
    },
    {
        "name": "Staff - Conteúdo de jogos",
        "description": _(
            "CRUD administrativo de temporadas, níveis, recompensas, quests, "
            "exchanges, milestones, bônus diário e iscas."
        ),
    },
    {
        "name": "docs",
        "description": _("Interfaces Swagger UI e ReDoc desta documentação OpenAPI."),
    },
]
