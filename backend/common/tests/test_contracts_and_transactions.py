"""Contratos compartilhados, isolamento de escopos e transações compostas."""
import pytest
from django.contrib.auth import get_user_model

from common.di.container import Container
from common.di.exceptions import CircularDependencyError, MissingAnnotationError, UnregisteredServiceError
from common.error_contract import build_error_payload, normalize_error_code
from common.infrastructure.unit_of_work import DjangoUnitOfWork


@pytest.mark.parametrize("raw,expected", [("not_found", "RESOURCE_NOT_FOUND"), ("not authenticated", "AUTHENTICATION_REQUIRED"), ("a-b.c", "A_B_C"), (None, "ERROR"), ("!!!", "ERROR"), ("throttled", "RATE_LIMIT_EXCEEDED")])
def test_error_codes_are_stable(raw, expected):
    assert normalize_error_code(raw) == expected


@pytest.mark.parametrize("data,details", [(None, {}), (["falhou"], {"errors": ["falhou"]}), ("falhou", {"detail": "falhou"}), ({"details": ["falhou"]}, {"errors": ["falhou"]}), ({"details": {"field": "falhou"}}, {"field": "falhou"}), ({"details": "falhou"}, {"detail": "falhou"})])
def test_error_envelope_keeps_structured_details(data, details):
    result = build_error_payload(data, status_code=400, request_id="trace-123")
    assert result["details"] == details
    assert result["error_code"] == "VALIDATION_ERROR"
    assert result["request_id"] == "trace-123"
    assert result["error"] == "validation_error"
    assert result["message"]


def test_error_override_and_nested_validation_message():
    assert build_error_payload({"email": ["E-mail inválido"]}, status_code=400)["message"] == "E-mail inválido"
    result = build_error_payload({"message": "original", "error": "invalid"}, status_code=400, message="Público", error_code="custom")
    assert result["message"] == "Público"
    assert result["error_code"] == "CUSTOM"
    assert "request_id" not in result


class Dependency:
    pass


class OptionalService:
    def __init__(self, dependency: Dependency | None = None):
        self.dependency = dependency


class Circular:
    def __init__(self, child: "Circular"):
        self.child = child


def test_transient_factory_and_scope_resolution():
    def factory(dependency: Dependency):
        return [dependency]
    root = Container().register_self(Dependency).register(list, factory=factory)
    child = root.create_scope()
    assert child.resolve(Container) is child
    assert isinstance(child.resolve(list)[0], Dependency)
    assert child.resolve(list)[0] is not child.resolve(list)[0]
    assert child.is_registered(Dependency)
    assert not root.is_registered(str)


def test_optional_dependencies_preserve_defaults():
    container = Container().register_self(Dependency).register_self(OptionalService)
    assert container.resolve(OptionalService).dependency is None


def test_cycle_reports_chain_and_does_not_poison_other_resolutions():
    container = Container().register_self(Circular).register_self(Dependency)
    for _ in range(2):
        with pytest.raises(CircularDependencyError) as error:
            container.resolve(Circular)
        assert error.value.chain == ["Circular", "Circular"]
    assert isinstance(container.resolve(Dependency), Dependency)


def test_missing_registration_is_actionable():
    with pytest.raises(UnregisteredServiceError) as error:
        Container().resolve(Dependency)
    assert error.value.interface is Dependency


def test_missing_annotation_is_rejected():
    class Invalid:
        def __init__(self, dependency):
            pass
    with pytest.raises(MissingAnnotationError, match="dependency"):
        Container().register_self(Invalid).resolve(Invalid)


@pytest.mark.django_db
@pytest.mark.parametrize("mode", ["success", "exception", "rollback"])
def test_unit_of_work_commits_or_rolls_back_as_one_operation(mode):
    users = get_user_model().objects
    try:
        with DjangoUnitOfWork() as work:
            users.create_user(username="transaction", email="transaction@test.dev")
            work.commit()
            if mode == "exception":
                raise ValueError("failure after commit call")
            if mode == "rollback":
                work.rollback()
    except ValueError:
        assert mode == "exception"
    assert users.filter(username="transaction").exists() == (mode == "success")


@pytest.mark.django_db
def test_inner_rollback_preserves_outer_work():
    users = get_user_model().objects
    with DjangoUnitOfWork():
        users.create_user(username="outer", email="outer@test.dev")
        with DjangoUnitOfWork() as inner:
            users.create_user(username="inner", email="inner@test.dev")
            inner.rollback()
    assert users.filter(username="outer").exists()
    assert not users.filter(username="inner").exists()
