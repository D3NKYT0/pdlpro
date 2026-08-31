from common.architecture.exceptions import AuthorizationError, ConflictError, EntityNotFoundError, ValidationDomainError


class ClanNotFoundError(EntityNotFoundError):
    message = "Clã não encontrado."


class ClanNameTakenError(ConflictError):
    error_code = "CLAN_NAME_TAKEN"
    message = "Já existe um clã com este nome."


class AlreadyAppliedError(ConflictError):
    error_code = "ALREADY_APPLIED"
    message = "Você já enviou uma inscrição para este clã."


class ClanNotRecruitingError(ValidationDomainError):
    message = "Este clã não está recrutando."


class NotClanOwnerError(AuthorizationError):
    message = "Apenas o líder do clã pode fazer isso."
