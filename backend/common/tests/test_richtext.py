from common.richtext import is_rich_text_empty, sanitize_rich_text


def test_sanitize_rich_text_strips_scripts_and_keeps_formatting():
    html = sanitize_rich_text(
        '<p>Olá <strong>mundo</strong></p><script>alert(1)</script><a href="javascript:alert(1)">x</a>'
    )
    assert "<script>" not in html
    assert "javascript:" not in html
    assert "<strong>mundo</strong>" in html
    assert "Olá" in html


def test_sanitize_rich_text_rejects_empty_markup():
    assert sanitize_rich_text("<p><br></p>") == ""
    assert sanitize_rich_text("   ") == ""
    assert is_rich_text_empty("<p></p>")
    assert not is_rich_text_empty("<p>ok</p>")


def test_sanitize_rich_text_keeps_plain_legacy_text():
    assert sanitize_rich_text("Texto puro\ncom linha") == "Texto puro\ncom linha"
