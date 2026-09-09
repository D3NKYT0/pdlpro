"""Reserva de saldo antes de serviços que gravam em outro banco de dados."""

from uuid import uuid4

from apps.server.domain.character_rules import require_offline_character
from apps.server.domain.exceptions import (
    CharacterOfflineRequiredError,
    GameAccountNotFoundError,
    NicknameTakenError,
)
from apps.server.domain.repositories import ICharacterServiceOperationRepository
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork
from common.architecture.exceptions import (
    AuthorizationError,
    ConflictError,
    ValidationDomainError,
)


def settle_service(
    operation_id,
    *,
    completed,
    note,
    wallets: IWalletRepository,
    operations: ICharacterServiceOperationRepository,
    unit_of_work: UnitOfWork,
):
    """Concilia uma reserva uma única vez; rejeição confirmada estorna o débito.

    Use somente após resposta inequívoca do gateway ou inspeção pela equipe no jogo.
    O chamador administrativo deve registrar a justificativa e nunca presumir falha por timeout.
    """
    ops = operations
    work = unit_of_work
    with work:
        row = ops.get_locked(operation_id)
        if row.status != "pending":
            return
        if not completed and row.amount > 0:
            wallet = wallets.get_or_create(row.user.id)
            wallets.credit(
                wallet.id,
                row.amount,
                origin="character_service_refund",
                description=f"Estorno de serviço · {row.id}",
            )
        row.status = "completed" if completed else "rejected"
        row.resolution_note = note
        ops.save(row, update_fields=["status", "resolution_note", "updated_at"])


def execute_paid_service(
    actor,
    *,
    service,
    value,
    price,
    lineage,
    access,
    wallets,
    operations: ICharacterServiceOperationRepository,
    unit_of_work: UnitOfWork,
):
    """Reserva e confirma uma operação; repetição não cobra nem chama o jogo novamente."""
    if price < 0:
        raise ValidationDomainError("Preço de serviço inválido.")
    ops = operations
    work = unit_of_work
    request_key = actor.request_key or uuid4()
    with work:
        user = ops.require_user_locked(actor.user_id)
        if not access.can_access(actor.user_id, actor.username, actor.login):
            raise AuthorizationError()
        row = ops.find_by_user_and_request_key(user, request_key)
        if row:
            if (row.login, row.character_id, row.service, row.value) != (
                actor.login,
                actor.char_id,
                service,
                value,
            ):
                raise ConflictError("Esta chave pertence a outro serviço.")
            if row.status == "completed":
                return
            if row.status == "rejected":
                raise ConflictError(
                    "Serviço rejeitado e estornado. Inicie uma nova solicitação."
                )
            raise ConflictError(
                "Serviço pendente de conferência pela equipe. Não envie outra solicitação."
            )
        if ops.has_pending_for_character(login=actor.login, character_id=actor.char_id):
            raise ConflictError(
                "Este personagem tem um serviço pendente de conferência pela equipe."
            )
        char = require_offline_character(
            lineage.get_character(actor.login, actor.char_id)
        )
        already_applied = (
            char.name == value
            if service == "CHANGE_NICKNAME"
            else str(char.sex) == value
        )
        amount = 0 if already_applied else price
        wallet = wallets.get_or_create(actor.user_id)
        row = ops.create(
            user=user,
            request_key=request_key,
            login=actor.login,
            character_id=actor.char_id,
            service=service,
            value=value,
            amount=amount,
            status="completed" if already_applied else "pending",
        )
        if amount > 0:
            wallets.debit(
                wallet.id,
                amount,
                destination="service",
                description=f"Reserva de serviço · {row.id}",
            )
    if already_applied:
        return
    try:
        if service == "CHANGE_NICKNAME":
            lineage.change_nickname(actor.login, actor.char_id, value)
        else:
            lineage.change_sex(actor.login, actor.char_id, int(value))
    except (
        CharacterOfflineRequiredError,
        GameAccountNotFoundError,
        NicknameTakenError,
    ):
        settle_service(
            row.id,
            completed=False,
            note="Rejeição de domínio anterior à gravação no jogo.",
            wallets=wallets,
            operations=ops,
            unit_of_work=work,
        )
        raise
    except Exception as exc:
        # A gravação pode ter sido confirmada pelo jogo antes da conexão cair.
        raise ConflictError(
            "Não foi possível confirmar o serviço. O saldo permanece reservado; solicite conferência à equipe.",
            details={"operation_id": str(row.id)},
        ) from exc
    settle_service(
        row.id,
        completed=True,
        note="Gateway confirmou a operação.",
        wallets=wallets,
        operations=ops,
        unit_of_work=work,
    )
