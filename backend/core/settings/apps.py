DJANGO_APPS = [
    "daphne",
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_celery_beat",
    "channels",
    "drf_spectacular",
    "rest_framework.authtoken",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "dj_rest_auth",
    "dj_rest_auth.registration",
]

LOCAL_APPS = [
    "common.apps.CommonConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.server.apps.ServerConfig",
    "apps.wallet.apps.WalletConfig",
    "apps.shop.apps.ShopConfig",
    "apps.content.apps.ContentConfig",
    "apps.payment.apps.PaymentConfig",
    "apps.inventory.apps.InventoryConfig",
    "apps.marketplace.apps.MarketplaceConfig",
    "apps.auction.apps.AuctionConfig",
    "apps.games.apps.GamesConfig",
    "apps.social.apps.SocialConfig",
    "apps.communication.apps.CommunicationConfig",
    "apps.staff.apps.StaffConfig",
]

INSTALLED_APPS_PDL = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS
