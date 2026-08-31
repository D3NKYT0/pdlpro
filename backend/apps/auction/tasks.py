from celery import shared_task


@shared_task(name="apps.auction.tasks.close_expired_auctions")
def close_expired_auctions():
    from apps.auction.application.use_cases import CloseExpiredAuctionsUseCase
    from common.di.bootstrap import DependencyInjection

    return DependencyInjection.root().resolve(CloseExpiredAuctionsUseCase).execute(None)
