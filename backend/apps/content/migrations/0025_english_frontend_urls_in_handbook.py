"""Atualiza paths do handbook/FAQ para URLs do frontend em inglês."""

from __future__ import annotations

from django.db import migrations

# Longest-first so nested segments rewrite correctly.
_PATH_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    ("/painel/wallet/jogo", "/panel/wallet/game"),
    ("/painel/wallet/pedidos", "/panel/wallet/orders"),
    ("/painel/wallet/extrato", "/panel/wallet/statement"),
    ("/painel/recompensas", "/panel/rewards"),
    ("/painel/apoiadores", "/panel/supporters"),
    ("/painel/ajuda", "/panel/help"),
    ("/painel/admin/atendimento", "/panel/admin/support"),
    ("/painel/admin/recursos", "/panel/admin/resources"),
    ("/painel/admin/apoiadores", "/panel/admin/supporters"),
    ("/painel/admin/comercio", "/panel/admin/commerce"),
    ("/painel/admin/recompensas", "/panel/admin/rewards"),
    ("/painel/admin/relatorios", "/panel/admin/reports"),
    ("/painel/admin/itens", "/panel/admin/items"),
    ("/painel/admin/servidor", "/panel/admin/server"),
    ("/painel/admin/contas", "/panel/admin/accounts"),
    ("/painel/admin/servicos", "/panel/admin/services"),
    ("/painel/admin/moedas", "/panel/admin/coins"),
    ("/painel/admin/carteira", "/panel/admin/wallet"),
    ("/painel/admin/loja", "/panel/admin/shop"),
    ("/painel/admin/noticias", "/panel/admin/news"),
    ("/painel/admin/jogos", "/panel/admin/games"),
    ("/painel/admin/temas", "/panel/admin/themes"),
    ("/painel", "/panel"),
    ("/informacoes", "/info"),
)


_TEXT_FIELDS = (
    "question",
    "question_en",
    "question_es",
    "short_answer",
    "short_answer_en",
    "short_answer_es",
    "answer",
    "answer_en",
    "answer_es",
    "keywords",
    "keywords_en",
    "keywords_es",
)


def _rewrite(text: str) -> str:
    if not text:
        return text
    for old, new in _PATH_REPLACEMENTS:
        text = text.replace(old, new)
    return text


def forwards(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    for item in Faq.objects.all().iterator():
        updates: dict[str, str] = {}
        for field in _TEXT_FIELDS:
            if not hasattr(item, field):
                continue
            current = getattr(item, field) or ""
            rewritten = _rewrite(current)
            if rewritten != current:
                updates[field] = rewritten
        if updates:
            for field, value in updates.items():
                setattr(item, field, value)
            item.save(update_fields=list(updates))


def backwards(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    reverse = tuple((new, old) for old, new in reversed(_PATH_REPLACEMENTS))
    for item in Faq.objects.all().iterator():
        updates: dict[str, str] = {}
        for field in _TEXT_FIELDS:
            if not hasattr(item, field):
                continue
            current = getattr(item, field) or ""
            rewritten = current
            for old, new in reverse:
                rewritten = rewritten.replace(old, new)
            if rewritten != current:
                updates[field] = rewritten
        if updates:
            for field, value in updates.items():
                setattr(item, field, value)
            item.save(update_fields=list(updates))


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0024_bootstrap_faq_spanish_from_english"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
