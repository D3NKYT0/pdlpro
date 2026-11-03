"""VST-06: o vínculo por e-mail não revela contas e o link só serve para quem o pediu."""

import re

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

from apps.server.domain.gateways import ILineageGateway
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db
URL = "/api/v1/customer/server/accounts/link-email/"


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def people():
    User = get_user_model()
    owner = User.objects.create_user(username="owner", email="owner@test.dev")
    other = User.objects.create_user(username="other", email="other@test.dev")
    DependencyInjection.root().resolve(ILineageGateway).register_account("oldacc", "l2pass123", "game@test.dev")
    return owner, other


def test_unknown_and_known_emails_get_the_same_answer(people):
    owner, _ = people

    unknown = _client(owner).post(URL, {"email": "nobody@test.dev"}, format="json")
    known = _client(owner).post(URL, {"email": "game@test.dev"}, format="json")

    assert (unknown.status_code, unknown.data) == (known.status_code, known.data) == (200, {"sent": True})
    assert len(mail.outbox) == 1


def test_forwarded_link_does_not_link_the_account_to_another_user(people):
    owner, other = people
    _client(owner).post(URL, {"email": "game@test.dev"}, format="json")
    token = re.search(r"link_token=([^\s]+)", mail.outbox[0].body).group(1)

    stolen = _client(other).post(f"{URL}confirm/", {"token": token}, format="json")
    assert stolen.status_code == 400
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert gateway.get_account("oldacc").linked_user_id is None

    mine = _client(owner).post(f"{URL}confirm/", {"token": token}, format="json")
    assert mine.status_code == 200, mine.data
    assert str(gateway.get_account("oldacc").linked_user_id) == str(owner.id)
