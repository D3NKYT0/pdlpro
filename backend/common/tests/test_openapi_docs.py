from django.test import Client


def test_swagger_ui_uses_pdl_theme():
    response = Client().get("/api/docs/swagger-ui/")
    assert response.status_code == 200
    body = response.content.decode()
    assert "pdl_admin/css/docs.css" in body
    assert "pdl-docs-topbar" in body
    assert "PDL PRO" in body
    assert "Documentação da API" in body


def test_redoc_uses_pdl_theme():
    response = Client().get("/api/docs/redoc/")
    assert response.status_code == 200
    body = response.content.decode()
    assert "pdl_admin/css/docs.css" in body
    assert "pdl-docs-topbar" in body
    assert "PDL PRO" in body
    assert 'aria-current="page"' in body
