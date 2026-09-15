import pytest

from extensions.resources import (
    ExtensionResource,
    ExtensionResourceCatalog,
    declare_extension_resource,
    sync_extension_resources,
)


def test_extension_resource_rejects_core_codes():
    with pytest.raises(ValueError, match="ext."):
        ExtensionResource(code="shop", name="Loja")


def test_declare_is_idempotent_by_code():
    ExtensionResourceCatalog.reset()
    declare_extension_resource(ExtensionResource(code="ext.acme.ping", name="A"))
    declare_extension_resource(ExtensionResource(code="ext.acme.ping", name="B"))
    items = ExtensionResourceCatalog.all()
    assert len(items) == 1
    assert items[0].name == "B"
    ExtensionResourceCatalog.reset()


@pytest.mark.django_db
def test_sync_creates_system_resource_once():
    from apps.programs.models import SystemResource

    ExtensionResourceCatalog.reset()
    declare_extension_resource(
        ExtensionResource(
            code="ext.acme.ping",
            name="Ping Acme",
            category="Extensões",
            description="Teste",
        )
    )
    assert sync_extension_resources() == 1
    row = SystemResource.objects.get(code="ext.acme.ping")
    row.enabled = False
    row.save(update_fields=["enabled"])
    assert sync_extension_resources() == 0
    assert SystemResource.objects.get(code="ext.acme.ping").enabled is False
    ExtensionResourceCatalog.reset()
    SystemResource.objects.filter(code="ext.acme.ping").delete()
