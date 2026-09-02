from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from apps.programs.models import Commission, CommissionPayout, Supporter
from apps.wallet.infrastructure.models import Wallet, WalletTransaction


@transaction.atomic
def request_commission(user):
    supporter = (
        Supporter.objects.select_for_update()
        .filter(user=user, status="approved")
        .first()
    )
    if not supporter:
        raise ValidationError("Seu cadastro precisa estar aprovado.")
    rows = Commission.objects.filter(supporter=supporter, payout__isnull=True)
    amount = rows.aggregate(total=Sum("amount"))["total"] or Decimal(0)
    if amount <= 0:
        raise ValidationError("Não há comissões disponíveis para solicitar.")
    payout = CommissionPayout.objects.create(supporter=supporter, amount=amount)
    rows.update(payout=payout)
    return payout


@transaction.atomic
def review_payout(payout_id, decision, note):
    payout = (
        CommissionPayout.objects.select_for_update()
        .select_related("supporter__user")
        .get(id=payout_id)
    )
    if payout.status != "pending":
        raise ValidationError("Esta solicitação já foi processada.")
    if decision == "paid":
        wallet, _ = Wallet.objects.get_or_create(user=payout.supporter.user)
        wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
        wallet.balance += payout.amount
        wallet.save(update_fields=["balance", "updated_at"])
        WalletTransaction.objects.create(
            wallet=wallet,
            kind="ENTRADA",
            amount=payout.amount,
            origin="supporter_commission",
            description="Comissão de apoiador aprovada",
        )
    elif decision == "rejected":
        Commission.objects.filter(payout=payout).update(payout=None)
    else:
        raise ValidationError("Decisão inválida.")
    payout.status, payout.note = decision, note
    payout.save()
    return payout
