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
| `/api/v1/auth/` | Cadastro, login, tokens, OAuth e passkeys |
| `/api/v1/shared/` | Perfil, carteira, loja, conteúdo autenticado |
| `/api/v1/public/` | Rankings, status do servidor, notícias e programas públicos |
| `/api/v1/customer/` | Conta Lineage, inventário, jogos e apoiadores |
| `/api/v1/staff/` | Administração do painel |
| `/api/v1/system/` | Health e versão |

## Contrato

- Identificadores públicos são UUID (`id`). O `seq_id` sequencial é interno.
- Erros 4xx/5xx usam o envelope `error_code`, `message`, `details` e `request_id`.
""".strip()


pdl_swagger_tags: list[dict[str, str]] = [
    {
        "name": "Auth",
        "description": (
            "Cadastro, login, CSRF, refresh, logout, verificação de e-mail, "
            "recuperação de senha, 2FA, OAuth social e capacidades de autenticação."
        ),
    },
    {
        "name": "Passkeys",
        "description": (
            "Registro, listagem, exclusão e autenticação WebAuthn/passkey "
            "(desafios begin/complete)."
        ),
    },
    {
        "name": "Perfil",
        "description": (
            "Dados do jogador autenticado, preferências, progresso gamer "
            "e resgate de recompensas de perfil."
        ),
    },
    {
        "name": "Servidor",
        "description": (
            "Status do servidor Lineage 2, informações públicas, rankings "
            "e consultas de personagens/contas."
        ),
    },
    {
        "name": "Catálogo de itens",
        "description": "Consulta pública/autenticada ao catálogo de itens do servidor.",
    },
    {
        "name": "Carteira",
        "description": (
            "Saldo de moedas do painel, transferências entre jogadores, "
            "extrato e câmbio de moedas painel ↔ jogo."
        ),
    },
    {
        "name": "Loja",
        "description": "Catálogo de itens da loja, carrinho, atualização de itens e checkout.",
    },
    {
        "name": "Comércio",
        "description": (
            "Pacotes, cotação do carrinho, opções (cupom/bônus) e histórico de compras. "
            "Staff gerencia pacotes e códigos promocionais."
        ),
    },
    {
        "name": "Conteúdo",
        "description": (
            "Notícias, FAQ, downloads, assistente Denkynho, wardrobe e conteúdo "
            "autenticado do painel."
        ),
    },
    {
        "name": "Wiki",
        "description": "Artigos da wiki pública do servidor.",
    },
    {
        "name": "Calendário",
        "description": "Eventos do calendário público do servidor.",
    },
    {
        "name": "Legal",
        "description": "Documentos legais públicos (termos, privacidade e afins).",
    },
    {
        "name": "Conta Lineage",
        "description": (
            "Vínculo e desvínculo de contas do jogo, personagens, senha, "
            "nickname, sexo, unstuck, slots e preços de serviços."
        ),
    },
    {
        "name": "Inventário",
        "description": (
            "Dashboard do inventário no painel, itens/equipamentos do personagem, "
            "retirada, depósito e troca."
        ),
    },
    {
        "name": "Jogos",
        "description": (
            "Roleta, bônus diário, bag, caixas, minigames, dados, slots, pesca, "
            "economia, monstro, encantamento, battle pass, detalhes avançados e estatísticas."
        ),
    },
    {
        "name": "Marketplace",
        "description": "Listagens públicas e do jogador, compra e cancelamento no marketplace.",
    },
    {
        "name": "Leilão",
        "description": "Leilões públicos, meus leilões, criação e lances.",
    },
    {
        "name": "Pagamento",
        "description": (
            "Catálogo de métodos, pedidos de recarga, preview de bônus, "
            "cancelamento, confirmação, processamento e status."
        ),
    },
    {
        "name": "Webhooks",
        "description": "Callbacks de provedores de pagamento (Mercado Pago, Stripe).",
    },
    {
        "name": "Notificações",
        "description": "Lista de notificações do jogador e marcação como lidas.",
    },
    {
        "name": "Push",
        "description": "Chave VAPID pública e inscrição/remoção de push no navegador.",
    },
    {
        "name": "Atendimento",
        "description": "Tickets de suporte do jogador: listagem, criação, detalhe e mensagens.",
    },
    {
        "name": "Apoiadores",
        "description": (
            "Inscrição de apoiador, comissões, cupons e solicitação de repasse. "
            "Staff revisa apoiadores e payouts."
        ),
    },
    {
        "name": "Roadmap",
        "description": "Roadmap público do projeto e CRUD administrativo das entradas.",
    },
    {
        "name": "Recursos",
        "description": "Flags/recursos do sistema (feature toggles) públicos e administrativos.",
    },
    {
        "name": "Temas",
        "description": "Tema ativo do painel para o frontend.",
    },
    {
        "name": "Sistema",
        "description": "Health check e versão da API.",
    },
    {
        "name": "Staff",
        "description": (
            "Configurações do painel, preços de serviços, moedas, itens da loja, "
            "notícias, jogos, temas, inspeção de contas e demais operações administrativas."
        ),
    },
    {
        "name": "Staff - Atendimento",
        "description": "Fila e detalhe de tickets para a equipe de suporte.",
    },
    {
        "name": "Staff / Financeiro",
        "description": "Relatórios de saldo, reconciliação, fluxo de caixa e pagamentos.",
    },
    {
        "name": "Staff - Itens customizados",
        "description": "CRUD administrativo do catálogo de itens customizados (metadados e ícones).",
    },
    {
        "name": "Staff - Observação de itens",
        "description": (
            "Observação live de itens no L2, favoritos, capturas (snapshots), "
            "comparação e categorias de organização."
        ),
    },
    {
        "name": "Staff - Conteúdo de jogos",
        "description": (
            "CRUD administrativo de temporadas, níveis, recompensas, quests, "
            "exchanges, milestones, bônus diário e iscas."
        ),
    },
    {
        "name": "docs",
        "description": "Interfaces Swagger UI e ReDoc desta documentação OpenAPI.",
    },
]
