from django.test import Client


def test_responses_include_content_security_policy():
    response = Client().get("/api/v1/system/health/")

    assert response.status_code == 200
    policy = response["Content-Security-Policy"]
    assert "default-src 'self'" in policy
    assert "object-src 'none'" in policy
    assert "frame-ancestors 'none'" in policy
    assert "https://js.stripe.com" in policy
    assert "https://hcaptcha.com" in policy
