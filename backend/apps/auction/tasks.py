from celery import shared_task


@shared_task(name="apps.auction.tasks.close_expired_auctions")
def close_expired_auctions():
    return {"closed": 0}
