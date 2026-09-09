"""Constantes de domínio de chamados de suporte, sem dependência do ORM."""

from __future__ import annotations


class TicketStatus:
    """Ciclo de vida de um chamado."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_USER = "waiting_user"
    WAITING_TEAM = "waiting_team"
    RESOLVED = "resolved"
    CLOSED = "closed"

    values = frozenset(
        {OPEN, IN_PROGRESS, WAITING_USER, WAITING_TEAM, RESOLVED, CLOSED}
    )
    labels = {
        OPEN: "Aberto",
        IN_PROGRESS: "Em atendimento",
        WAITING_USER: "Aguardando jogador",
        WAITING_TEAM: "Aguardando equipe",
        RESOLVED: "Resolvido",
        CLOSED: "Fechado",
    }


class TicketCategory:
    """Categorias aceitas na abertura de chamado."""

    TECHNICAL = "technical"
    BILLING = "billing"
    ACCOUNT = "account"
    GAME = "game"
    BUG = "bug"
    REPORT = "report"
    SUGGESTION = "suggestion"
    OTHER = "other"

    values = frozenset(
        {TECHNICAL, BILLING, ACCOUNT, GAME, BUG, REPORT, SUGGESTION, OTHER}
    )
    labels = {
        TECHNICAL: "Problema técnico",
        BILLING: "Pagamento e loja",
        ACCOUNT: "Conta e segurança",
        GAME: "Suporte ao jogo",
        BUG: "Relatar um bug",
        REPORT: "Denúncia",
        SUGGESTION: "Sugestão",
        OTHER: "Outro assunto",
    }


class TicketPriority:
    """Prioridades aceitas em um chamado."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

    values = frozenset({LOW, NORMAL, HIGH, URGENT})
    labels = {
        LOW: "Baixa",
        NORMAL: "Normal",
        HIGH: "Alta",
        URGENT: "Urgente",
    }
