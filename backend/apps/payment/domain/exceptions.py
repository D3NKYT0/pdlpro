from common.architecture.exceptions import ConflictError, DomainError, EntityNotFoundError, ValidationDomainError


class PaymentOrderNotFoundError(EntityNotFoundError):
    message = "Pedido de pagamento não encontrado."


class PaymentAlreadyConfirmedError(ConflictError):
    message = "Este pedido já foi confirmado."


class PaymentMethodUnavailableError(ValidationDomainError):
    message = "Método de pagamento indisponível."


class PaymentNotPendingError(ValidationDomainError):
    message = "Este pedido não pode ser alterado."


class InvalidPaymentAmountError(ValidationDomainError):
    message = "Valor inválido."


class PaymentGatewayError(DomainError):
    error_code = "PAYMENT_GATEWAY_ERROR"
    status_code = 502
    message = "Falha ao iniciar o pagamento."
