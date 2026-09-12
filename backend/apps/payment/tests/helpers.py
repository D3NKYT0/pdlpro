from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


def confirm_mock_payment(order_id):
    """Confirma um pedido mock pelo endpoint da equipe, sem creditar pelo jogador."""
    User = get_user_model()
    staff = User.objects.filter(username="mock-confirm-staff").first()
    if staff is None:
        staff = User.objects.create_user(
            username="mock-confirm-staff",
            email="mock-confirm-staff@pdl.test",
            password="Secret123",
            is_staff=True,
        )
    elif not staff.is_staff:
        staff.is_staff = True
        staff.save(update_fields=["is_staff"])
    client = APIClient()
    client.force_authenticate(staff)
    return client.post(f"/api/v1/staff/payments/{order_id}/confirm-mock/")
