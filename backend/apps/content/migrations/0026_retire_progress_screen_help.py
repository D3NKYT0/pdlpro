"""Atualiza FAQ e handbook após a tela /panel/progress sair do produto."""

from __future__ import annotations

from uuid import UUID

from django.db import migrations

FAQ_ID = UUID("c0100000-0000-4000-8000-000000000029")
HANDBOOK_MENU_ID = UUID("c0300000-0000-4000-8000-000000000002")
HANDBOOK_PROGRESS_ID = UUID("c0300000-0000-4000-8000-000000000034")

FAQ_NEW = {
    "short_answer": "No Painel você vê nível, conquistas e prêmios; Rankings ficam no site público.",
    "answer": (
        "O Painel (/panel) mostra o nível da conta, as conquistas e os prêmios de evolução "
        "para resgate. Rankings públicos (/rankings) exibem as categorias fornecidas pelo servidor; "
        "os jogos também podem ter classificações próprias baseadas em resultados positivos e partidas. "
        "A atualização depende da fonte de cada ranking."
    ),
    "short_answer_en": "The Dashboard shows your level, achievements and prizes; Rankings are on the public site.",
    "answer_en": (
        "The Dashboard (/panel) shows your account level, achievements and progression prizes you can claim. "
        "Public rankings (/rankings) show categories supplied by the server; games may also have their own "
        "boards based on positive results and matches. Updates depend on each ranking’s source."
    ),
    "short_answer_es": "En el Panel ves nivel, logros y premios; los Rankings están en el sitio público.",
    "answer_es": (
        "El Panel (/panel) muestra el nivel de la cuenta, los logros y los premios de evolución para reclamar. "
        "Los rankings públicos (/rankings) muestran las categorías del servidor; los juegos también pueden "
        "tener clasificaciones propias según resultados positivos y partidas. La actualización depende de la "
        "fuente de cada ranking."
    ),
}

FAQ_OLD = {
    "short_answer": "Use Progresso no painel e Rankings no site público.",
    "answer": (
        "Progresso reúne os dados e recompensas ligados ao seu perfil. Rankings públicos exibem as "
        "categorias fornecidas pelo servidor; os jogos também podem ter classificações próprias baseadas "
        "em resultados positivos e partidas. A atualização depende da fonte de cada ranking."
    ),
    "short_answer_en": "Use Progress in the dashboard and Rankings on the public website.",
    "answer_en": "Use Progress in the dashboard and Rankings on the public website.",
    "short_answer_es": "Use Progress in the dashboard and Rankings on the public website.",
    "answer_es": "Use Progress in the dashboard and Rankings on the public website.",
}

HANDBOOK_PROGRESS_NEW = {
    "short_answer": "No Painel você vê nível, conquistas e prêmios; Rankings ficam no site público.",
    "answer": (
        "O Painel (/panel) reúne nível, conquistas e prêmios de evolução ligados ao seu perfil. "
        "Rankings públicos (/rankings) mostram categorias fornecidas pelo servidor. Os jogos podem ter "
        "classificações próprias com base em resultados positivos e partidas. A atualização depende da "
        "fonte de cada ranking. O Denkynho não informa a sua posição atual."
    ),
    "short_answer_en": "The Dashboard shows your level, achievements and prizes; Rankings are on the public site.",
    "answer_en": (
        "The Dashboard (/panel) gathers your account level, achievements and progression prizes. "
        "Public rankings (/rankings) show categories supplied by the server. Games may have their own "
        "boards based on positive results and matches. Updates depend on each ranking’s source. "
        "Denkynho does not tell your current position."
    ),
    "short_answer_es": "En el Panel ves nivel, logros y premios; los Rankings están en el sitio público.",
    "answer_es": (
        "El Panel (/panel) reúne nivel, logros y premios de evolución de tu perfil. "
        "Los rankings públicos (/rankings) muestran categorías del servidor. Los juegos pueden tener "
        "clasificaciones propias según resultados positivos y partidas. La actualización depende de la "
        "fuente de cada ranking. Denkynho no informa tu posición actual."
    ),
}

HANDBOOK_PROGRESS_OLD = {
    "short_answer": "Use Progresso no painel para o seu perfil e Rankings no site público para classificações do servidor.",
    "answer": (
        "Progresso (/panel/progress) reúne dados e recompensas ligados ao seu perfil. Rankings públicos "
        "(/rankings) mostram categorias fornecidas pelo servidor. Os jogos podem ter classificações próprias "
        "com base em resultados positivos e partidas. A atualização depende da fonte de cada ranking. "
        "O Denkynho não informa a sua posição atual."
    ),
    "short_answer_en": "Use Progress in the dashboard for your profile and Rankings on the public site for server boards.",
    "answer_en": (
        "Progress (/panel/progress) gathers data and rewards tied to your profile. Public rankings "
        "(/rankings) show categories supplied by the server. Games may have their own boards based on "
        "positive results and matches. Updates depend on each ranking’s source. Denkynho does not tell "
        "your current position."
    ),
}

MENU_REPLACEMENTS = (
    (", Progresso, Avisos", ", Avisos"),
    (", Progress, Notifications", ", Notifications"),
    (", Progress, Alertas", ", Alertas"),
    (", Progreso, Avisos", ", Avisos"),
    ("/panel/progress", "/panel"),
    ("/painel/progress", "/panel"),
)


def _apply_fields(item, fields: dict[str, str]) -> None:
    updates = []
    for field, value in fields.items():
        if hasattr(item, field):
            setattr(item, field, value)
            updates.append(field)
    if updates:
        item.save(update_fields=updates)


def _rewrite_menu(text: str) -> str:
    for old, new in MENU_REPLACEMENTS:
        text = text.replace(old, new)
    return text


def forwards(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    faq = Faq.objects.filter(id=FAQ_ID).first()
    if faq:
        _apply_fields(faq, FAQ_NEW)

    progress = Faq.objects.filter(id=HANDBOOK_PROGRESS_ID).first()
    if progress:
        _apply_fields(progress, HANDBOOK_PROGRESS_NEW)

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
            if rewritten != current:
                updates[field] = rewritten
        if updates:
            _apply_fields(menu, updates)


def backwards(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    faq = Faq.objects.filter(id=FAQ_ID).first()
    if faq:
        _apply_fields(faq, FAQ_OLD)

    progress = Faq.objects.filter(id=HANDBOOK_PROGRESS_ID).first()
    if progress:
        _apply_fields(progress, HANDBOOK_PROGRESS_OLD)


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0025_english_frontend_urls_in_handbook"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
