from apps.content.application.screens import canonical_screen, describe_screen


def test_canonical_screen_accepts_known_panel_paths():
    assert canonical_screen("/panel/wallet") == "/panel/wallet"
    assert canonical_screen("/panel/accounts/alice/123") == "/panel/accounts"
    assert canonical_screen("/panel/admin/themes") == "/panel/admin"
    assert canonical_screen("https://evil.test/panel/wallet") is None
    assert canonical_screen("/panel/wallet?x=1") is None
    assert canonical_screen("/panel/unknown") is None
    assert canonical_screen("/painel/wallet") is None


def test_describe_screen_uses_language_titles():
    assert describe_screen("/panel/wallet", "pt") == {"path": "/panel/wallet", "title": "Carteira"}
    assert describe_screen("/panel/wallet", "en") == {"path": "/panel/wallet", "title": "Wallet"}
    assert describe_screen("/panel/wallet", "es") == {"path": "/panel/wallet", "title": "Cartera"}
