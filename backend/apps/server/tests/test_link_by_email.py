import re

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

from apps.server.domain.gateways import ILineageGateway
from common.di.bootstrap import DependencyInjection

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.mark.django_db
def test_link_lineage_account_by_email(api):
    user = User.objects.create_user(username="linker", email="linker@pdl.dev", password="Secret123")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    gateway.register_account("l2alt", "GamePass1", "l2alt@pdl.dev")
    api.force_authenticate(user=user)
    requested = api.post("/api/v1/customer/server/accounts/link-email/", {"email": "l2alt@pdl.dev"}, format="json")
    assert requested.status_code == 200, requested.data
    token = re.search(r"link_token=([^\s]+)", mail.outbox[-1].body).group(1)
    confirmed = api.post("/api/v1/customer/server/accounts/link-email/confirm/", {"token": token}, format="json")
    assert confirmed.status_code == 200, confirmed.data
    assert confirmed.data["login"] == "l2alt"
    account = gateway.get_account("l2alt")
    assert account.linked_user_id == str(user.id)
