import pytest
from django.test import Client

from common.middleware import uses_html_content_security_policy
from core.settings.security import build_content_security_policy


def _csp_directive(policy: str, name: str) -> str:
    for part in policy.split(";"):
        chunk = part.strip()
        if chunk.startswith(f"{name} ") or chunk == name:
            return chunk
    raise AssertionError(f"diretiva {name} ausente em {policy}")


def test_responses_include_content_security_policy():
    response = Client().get("/api/v1/system/health/")

    assert response.status_code == 200
    policy = response["Content-Security-Policy"]
    assert "default-src 'self'" in policy
    assert "object-src 'none'" in policy
    assert "frame-ancestors 'none'" in policy
    assert "https://js.stripe.com" in policy
    assert "https://hcaptcha.com" in policy
    assert "'unsafe-inline'" not in _csp_directive(policy, "script-src")
    assert "'unsafe-inline'" in _csp_directive(policy, "style-src")


@pytest.mark.django_db
def test_admin_html_keeps_inline_scripts_in_csp():
    response = Client().get("/admin/login/")

    assert response.status_code == 200
    script = _csp_directive(response["Content-Security-Policy"], "script-src")
    assert "'unsafe-inline'" in script


def test_html_csp_paths_cover_admin_docs_and_i18n():
    assert uses_html_content_security_policy("/admin/")
    assert uses_html_content_security_policy("/admin/login/")
    assert uses_html_content_security_policy("/api/docs/swagger-ui/")
    assert uses_html_content_security_policy("/api/schema/")
    assert uses_html_content_security_policy("/i18n/setlang/")
    assert not uses_html_content_security_policy("/api/v1/system/health/")
    assert not uses_html_content_security_policy("/stores")


def test_strict_policy_builder_omits_script_unsafe_inline():
    policy = build_content_security_policy()
    assert "'unsafe-inline'" not in _csp_directive(policy, "script-src")
    html = build_content_security_policy(script_unsafe_inline=True)
    assert "'unsafe-inline'" in _csp_directive(html, "script-src")
    production = build_content_security_policy(upgrade_insecure_requests=True)
    assert "upgrade-insecure-requests" in production
