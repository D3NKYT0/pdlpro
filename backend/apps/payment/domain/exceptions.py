from common.architecture.exceptions import ConflictError, DomainError, EntityNotFoundError, ValidationDomainError


class PaymentOrderNotFoundError(EntityNotFoundError):
    """Falha de domínio: Pedido de pagamento não encontrado."""

    message = "Pedido de pagamento não encontrado."


class PaymentAlreadyConfirmedError(ConflictError):
    """Falha de domínio: Este pedido já foi confirmado."""

    message = "Este pedido já foi confirmado."


class PaymentMethodUnavailableError(ValidationDomainError):
    """Falha de domínio: Método de pagamento indisponível."""

    message = "Método de pagamento indisponível."


class PaymentNotPendingError(ValidationDomainError):
    """Falha de domínio: Este pedido não pode ser alterado."""

    message = "Este pedido não pode ser alterado."


class InvalidPaymentAmountError(ValidationDomainError):
    """Falha de domínio: Valor inválido."""

    message = "Valor inválido."


class PaymentGatewayError(DomainError):
    """Falha de domínio: Falha ao iniciar o pagamento.

    A apresentação expõe o código ``PAYMENT_GATEWAY_ERROR`` com status HTTP 502. Lance esta
    exceção quando a condição ocorrer na regra de negócio.
    """

    error_code = "PAYMENT_GATEWAY_ERROR"
    status_code = 502
    message = "Falha ao iniciar o pagamento."
