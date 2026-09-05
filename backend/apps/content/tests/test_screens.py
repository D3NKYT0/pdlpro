from apps.content.application.screens import canonical_screen, describe_screen


def test_canonical_screen_keeps_known_panel_paths_and_drops_inventions():
    assert canonical_screen("/painel/wallet") == "/painel/wallet"
    assert canonical_screen("/painel/accounts/alice/123") == "/painel/accounts"
    assert canonical_screen("/painel/admin/temas") == "/painel/admin"
    assert canonical_screen("https://evil.test/painel/wallet") is None
    assert canonical_screen("/painel/wallet?x=1") is None
    assert canonical_screen("/painel/unknown") is None
    assert canonical_screen("") is None


def test_describe_screen_uses_the_requested_language():
    assert describe_screen("/painel/wallet", "pt") == {"path": "/painel/wallet", "title": "Carteira"}
    assert describe_screen("/painel/wallet", "en") == {"path": "/painel/wallet", "title": "Wallet"}
    assert describe_screen("/faq", "pt") is None
