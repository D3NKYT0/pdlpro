"""Atualiza FAQ e handbook após os avisos saírem do menu e irem para a barra superior."""

from __future__ import annotations

import re
from uuid import UUID

from django.db import migrations

FAQ_ID = UUID("c0100000-0000-4000-8000-000000000032")
HANDBOOK_MENU_ID = UUID("c0300000-0000-4000-8000-000000000002")
HANDBOOK_MISSING_ID = UUID("c0300000-0000-4000-8000-000000000004")
HANDBOOK_NOTIFY_ID = UUID("c0300000-0000-4000-8000-000000000037")

FAQ_NEW = {
    "short_answer": "Abra o sino da barra superior do painel e consulte também as notícias públicas.",
    "answer": (
        "O sino na barra superior do painel reúne as notificações da sua conta e mostra as que ainda "
        "não foram lidas. Notícias publica comunicados gerais da comunidade. Quando o navegador e o "
        "servidor oferecerem Web Push, você também pode gerenciar essa permissão pelo fluxo apresentado "
        "no próprio sino."
    ),
    "short_answer_en": "Open the bell on the dashboard top bar and also check public News.",
    "answer_en": (
        "The bell on the dashboard top bar gathers notifications for your account and shows which are "
        "still unread. News publishes general community announcements. When the browser and server offer "
        "Web Push, you can also manage that permission from the same notification panel."
    ),
    "short_answer_es": "Abre la campana de la barra superior del panel y consulta también las noticias públicas.",
    "answer_es": (
        "La campana de la barra superior del panel reúne las notificaciones de tu cuenta y muestra las "
        "que aún no leíste. Noticias publica comunicados generales de la comunidad. Cuando el navegador "
        "y el servidor ofrezcan Web Push, también puedes gestionar ese permiso en el mismo panel."
    ),
}

FAQ_OLD = {
    "short_answer": "Abra Avisos no painel e consulte também as notícias públicas.",
    "answer": (
        "Avisos reúne notificações relacionadas à sua conta e mostra as que ainda não foram lidas. "
        "Notícias publica comunicados gerais da comunidade. Quando o navegador e o servidor oferecerem "
        "Web Push, você também pode gerenciar essa permissão pelo fluxo apresentado."
    ),
    "short_answer_en": "Open Notifications in the dashboard and check public News.",
    "answer_en": "Open Notifications in the dashboard and check public News.",
    "short_answer_es": "Open Notifications in the dashboard and check public News.",
    "answer_es": "Open Notifications in the dashboard and check public News.",
}

HANDBOOK_NOTIFY_NEW = {
    "short_answer": "Abra o sino da barra superior para notificações da conta e gerencie Web Push pelo fluxo do navegador.",
    "answer": (
        "1) Toque no sino da barra superior do painel para ver o que ainda não foi lido. "
        "2) Consulte também Notícias para comunicados gerais. 3) Se o navegador e o servidor "
        "oferecerem Web Push, siga o pedido de permissão no próprio painel do sino. 4) Você pode "
        "recusar ou revogar depois nas configurações do navegador. O Denkynho não envia push e não "
        "marca avisos como lidos."
    ),
    "short_answer_en": "Open the top-bar bell for account alerts and manage Web Push through the browser prompt.",
    "answer_en": (
        "1) Tap the bell on the dashboard top bar to see unread items. 2) Also check News for general "
        "announcements. 3) If the browser and server offer Web Push, follow the permission prompt in "
        "that panel. 4) You can refuse or revoke later in browser settings. Denkynho does not send push "
        "and does not mark alerts as read."
    ),
    "short_answer_es": "Abre la campana de la barra superior para avisos de la cuenta y gestiona Web Push en el navegador.",
    "answer_es": (
        "1) Toca la campana de la barra superior del panel para ver lo que aún no leíste. "
        "2) Consulta también Noticias para comunicados generales. 3) Si el navegador y el servidor "
        "ofrecen Web Push, sigue el permiso en ese mismo panel. 4) Puedes rechazar o revocar después "
        "en la configuración del navegador. Denkynho no envía push ni marca avisos como leídos."
    ),
}

HANDBOOK_NOTIFY_OLD = {
    "short_answer": "Abra Avisos no painel para notificações da conta e gerencie Web Push pelo fluxo apresentado no navegador.",
    "answer": (
        "1) Abra Avisos (/panel/notifications) para ver o que ainda não foi lido. 2) Consulte também "
        "Notícias para comunicados gerais. 3) Se o navegador e o servidor oferecerem Web Push, siga o "
        "pedido de permissão na própria tela. 4) Você pode recusar ou revogar depois nas configurações "
        "do navegador. O Denkynho não envia push e não marca avisos como lidos."
    ),
    "short_answer_en": "Open Notifications in the dashboard for account alerts and manage Web Push through the browser prompt.",
    "answer_en": (
        "1) Open Notifications (/panel/notifications) to see unread items. 2) Also check News for general "
        "announcements. 3) If the browser and server offer Web Push, follow the permission prompt on that "
        "screen. 4) You can refuse or revoke later in browser settings. Denkynho does not send push and "
        "does not mark alerts as read."
    ),
}

MENU_PATTERN_REPLACEMENTS = (
    (re.compile(r", Avisos(?=,| e | y )"), ""),
    (re.compile(r", Notifications(?=,| and )"), ""),
    (re.compile(r", Alertas(?=,| y )"), ""),
    (re.compile(r"/panel/notifications"), ""),
)

MISSING_REPLACEMENTS = (
    ("1) Veja Avisos e as notícias públicas.", "1) Veja o sino de notificações na barra superior e as notícias públicas."),
    ("1) Check Notifications and public news.", "1) Check the notification bell on the top bar and public news."),
    ("1) Check Notifications and public News.", "1) Check the notification bell on the top bar and public news."),
)


def _apply_fields(item, fields: dict[str, str]) -> None:
    updates = []
    for field, value in fields.items():
        if hasattr(item, field):
            setattr(item, field, value)
            updates.append(field)
    if updates:
        item.save(update_fields=updates)


def _rewrite(text: str, replacements: tuple[tuple[str, str], ...]) -> str:
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def _rewrite_menu(text: str) -> str:
    for pattern, new in MENU_PATTERN_REPLACEMENTS:
        text = pattern.sub(new, text)
    return text


def forwards(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    faq = Faq.objects.filter(id=FAQ_ID).first()
    if faq:
        _apply_fields(faq, FAQ_NEW)

    notify = Faq.objects.filter(id=HANDBOOK_NOTIFY_ID).first()
    if notify:
        _apply_fields(notify, HANDBOOK_NOTIFY_NEW)

    menu = Faq.objects.filter(id=HANDBOOK_MENU_ID).first()
    if menu:
        updates = {}
        for field in (
            "answer",
            "answer_en",
            "answer_es",
            "short_answer",
            "short_answer_en",
            "short_answer_es",
        ):
            if not hasattr(menu, field):
                continue
            current = getattr(menu, field) or ""
            rewritten = _rewrite_menu(current)
            extra = (
                " As notificações da conta ficam no sino da barra superior."
                if field.startswith("answer") and "sino da barra superior" not in rewritten and field == "answer"
                else " Account notifications are in the bell on the top bar."
                if field == "answer_en" and "top bar" not in rewritten
                else " Las notificaciones de la cuenta están en la campana de la barra superior."
                if field == "answer_es" and "barra superior" not in rewritten
                else ""
            )
            rewritten = (rewritten + extra).replace("  ", " ")
            if rewritten != current:
                updates[field] = rewritten
        if updates:
            _apply_fields(menu, updates)

    missing = Faq.objects.filter(id=HANDBOOK_MISSING_ID).first()
    if missing:
        updates = {}
        for field in (
            "answer",
            "answer_en",
            "answer_es",
            "short_answer",
            "short_answer_en",
            "short_answer_es",
        ):
            if not hasattr(missing, field):
                continue
            current = getattr(missing, field) or ""
            rewritten = _rewrite(current, MISSING_REPLACEMENTS)
            if rewritten != current:
                updates[field] = rewritten
        if updates:
            _apply_fields(missing, updates)


def backwards(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    faq = Faq.objects.filter(id=FAQ_ID).first()
    if faq:
        _apply_fields(faq, FAQ_OLD)

    notify = Faq.objects.filter(id=HANDBOOK_NOTIFY_ID).first()
    if notify:
        _apply_fields(notify, HANDBOOK_NOTIFY_OLD)


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0026_retire_progress_screen_help"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
