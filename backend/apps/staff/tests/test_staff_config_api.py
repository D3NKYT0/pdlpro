import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.fixture
def staff(db):
    return User.objects.create_user(
        username="gm",
        email="gm@pdl.dev",
        password="Secret123",
        is_staff=True,
        role=User.Role.STAFF,
    )


@pytest.mark.django_db
def test_player_cannot_access_staff_panel(api, player):
    api.force_authenticate(user=player)
    response = api.get("/api/v1/staff/panel/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_staff_can_update_panel_and_services(api, staff):
    api.force_authenticate(user=staff)
    panel = api.get("/api/v1/staff/panel/")
    assert panel.status_code == 200
    saved = api.put(
        "/api/v1/staff/panel/",
        {
            "name": "Imperium",
            "slogan": "Reino",
            "chronicle": "High Five",
            "description": "Servidor de testes",
            "rates": {"xp": "x10", "sp": "x10", "adena": "x5", "drop": "x3", "spoil": "x3"},
            "enchant": {"safe": "+4", "max": "+20"},
            "max_level": 85,
            "features": ["Siege", "Olympiad"],
            "notes": {"pvp": "PvP livre", "start": "Crie a conta"},
            "coming_soon": True,
            "coming_soon_show_info": True,
            "coming_soon_show_champions": False,
            "coming_soon_title": "Abertura Imperium",
            "coming_soon_subtitle": "Contagem oficial",
            "coming_soon_at": "2027-01-03T18:00:00Z",
            "staff_only_login": False,
            "allow_registration": False,
            "allow_l2_registration": False,
            "seo_title": "Imperium SEO",
            "seo_description": "Reino de testes",
            "discord_url": "https://discord.gg/imperium",
            "whatsapp_url": "https://wa.me/5511999999999",
            "facebook_url": "https://facebook.com/imperium",
            "instagram_url": "https://instagram.com/imperium",
            "youtube_url": "https://youtube.com/@imperium",
            "trailer_youtube_id": "abcdefghijk",
        },
        format="json",
    )
    assert saved.status_code == 200, saved.data
    assert saved.data["name"] == "Imperium"
    assert saved.data["slogan"] == "Reino"
    assert saved.data["coming_soon"] is True
    assert saved.data["coming_soon_show_info"] is True
    assert saved.data["coming_soon_show_champions"] is False
    assert saved.data["coming_soon_title"] == "Abertura Imperium"
    assert saved.data["coming_soon_at"].startswith("2027-01-03T18:00:00")
    assert saved.data["allow_registration"] is False
    assert saved.data["allow_l2_registration"] is False
    assert saved.data["seo_title"] == "Imperium SEO"
    assert saved.data["discord_url"] == "https://discord.gg/imperium"
    assert saved.data["whatsapp_url"] == "https://wa.me/5511999999999"
    assert saved.data["facebook_url"] == "https://facebook.com/imperium"
    assert saved.data["instagram_url"] == "https://instagram.com/imperium"
    assert saved.data["youtube_url"] == "https://youtube.com/@imperium"
    public = api.get("/api/v1/public/server/info/")
    assert public.data["name"] == "Imperium"
    assert public.data["slogan"] == "Reino"
    assert public.data["rates"]["xp"] == "x10"
    assert public.data["coming_soon"] is True
    assert public.data["coming_soon_show_info"] is True
    assert public.data["coming_soon_show_champions"] is False
    assert public.data["coming_soon_title"] == "Abertura Imperium"
    assert public.data["allow_registration"] is False
    assert public.data["allow_l2_registration"] is False
    assert public.data["staff_only_login"] is False
    assert public.data["seo_title"] == "Imperium SEO"
    assert public.data["discord_url"] == "https://discord.gg/imperium"
    assert public.data["whatsapp_url"] == "https://wa.me/5511999999999"
    assert public.data["facebook_url"] == "https://facebook.com/imperium"
    assert public.data["instagram_url"] == "https://instagram.com/imperium"
    assert public.data["youtube_url"] == "https://youtube.com/@imperium"

    prices = api.put(
        "/api/v1/staff/services/",
        [{"code": "CHANGE_NICKNAME", "name": "Nick", "price": "25.00", "active": True}],
        format="json",
    )
    assert prices.status_code == 200
    nick = next(item for item in prices.data if item["code"] == "CHANGE_NICKNAME")
    assert nick["price"] == "25.00"


@pytest.mark.django_db
def test_coming_soon_requires_launch_datetime(api, staff):
    api.force_authenticate(user=staff)
    response = api.put(
        "/api/v1/staff/panel/",
        {
            "name": "Imperium",
            "coming_soon": True,
            "coming_soon_title": "Em breve",
            "coming_soon_at": None,
        },
        format="json",
    )
    assert response.status_code == 400
    assert "lançamento" in response.data["message"].lower()


@pytest.mark.django_db
def test_staff_can_update_coins_shop_and_news(api, staff):
    api.force_authenticate(user=staff)
    coins = api.put(
        "/api/v1/staff/coins/",
        {
            "name": "Gold Bar",
            "coin_id": 3470,
            "multiplier": "2.00",
            "usd_multiplier": "10.00",
            "withdraw_fee_percent": "1.50",
        },
        format="json",
    )
    assert coins.status_code == 200, coins.data
    assert coins.data["name"] == "Gold Bar"
    assert coins.data["coin_id"] == 3470

    promo = api.put(
        "/api/v1/staff/wallet-promo/",
        {
            "percent": "20.00",
            "title": "Recarga em promoção",
            "description": "20% a mais de moedas",
            "active": True,
            "starts_at": None,
            "ends_at": None,
        },
        format="json",
    )
    assert promo.status_code == 200, promo.data
    assert promo.data["percent"] == "20.00"
    assert promo.data["title"] == "Recarga em promoção"
    assert promo.data["active"] is True
    assert promo.data["currently_active"] is True
    catalog = api.get("/api/v1/customer/payments/catalog/")
    assert catalog.status_code == 200
    assert catalog.data["promo"]["percent"] == "20.00"

    created = api.post(
        "/api/v1/staff/shop/",
        {"name": "Espada", "item_id": 1, "price": "50.00", "quantity": 2, "active": True},
        format="json",
    )
    assert created.status_code == 200, created.data
    from apps.server.infrastructure.lineage.item_catalog import item_metadata
    assert created.data["name"] == item_metadata(1)["name"]

    news = api.post(
        "/api/v1/staff/news/",
        {
            "title": "Patch 1",
            "excerpt": "Notas",
            "body": '<p>Conteúdo do patch.</p><script>alert(1)</script>',
            "is_published": True,
        },
        format="json",
    )
    assert news.status_code == 200, news.data
    assert news.data["title"] == "Patch 1"
    assert "<script>" not in news.data["body"]
    assert "Conteúdo do patch." in news.data["body"]
    listed = api.get("/api/v1/staff/news/")
    assert listed.status_code == 200
    assert listed.data[0]["title"] == "Patch 1"


@pytest.mark.django_db
def test_staff_news_stores_and_serves_translations(api, staff):
    api.force_authenticate(user=staff)
    created = api.post(
        "/api/v1/staff/news/",
        {
            "title": "Patch 1",
            "title_en": "Patch notes",
            "title_es": "Notas del parche",
            "excerpt": "Notas",
            "excerpt_en": "Notes",
            "excerpt_es": "Notas",
            "body": "<p>Conteúdo do patch.</p>",
            "body_en": "<p>Patch content.</p>",
            "body_es": "<p>Contenido del parche.</p>",
            "is_published": True,
        },
        format="json",
    )
    assert created.status_code == 200, created.data
    assert created.data["title_en"] == "Patch notes"
    listed = api.get("/api/v1/staff/news/")
    assert listed.data[0]["body_es"] == "<p>Contenido del parche.</p>"
    english = api.get("/api/v1/public/news/?lang=en")
    assert english.data[0]["title"] == "Patch notes"
    assert "Patch content" in english.data[0]["body"]
    spanish = api.get("/api/v1/public/news/?lang=es")
    assert spanish.data[0]["title"] == "Notas del parche"


@pytest.mark.django_db
def test_me_exposes_staff_flags(api, staff):
    api.force_authenticate(user=staff)
    me = api.get("/api/v1/shared/me/")
    assert me.status_code == 200
    assert me.data["is_staff"] is True
    assert me.data["is_staff_member"] is True
