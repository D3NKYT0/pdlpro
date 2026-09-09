"""Bootstrap FAQ Spanish fields from English when ES is empty."""

from django.db import migrations


def bootstrap_spanish_from_english(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    for item in Faq.objects.all().iterator():
        updates = {}
        if not (item.question_es or "").strip() and (item.question_en or "").strip():
            updates["question_es"] = item.question_en
        if not (item.short_answer_es or "").strip() and (item.short_answer_en or "").strip():
            updates["short_answer_es"] = item.short_answer_en
        if not (item.answer_es or "").strip() and (item.answer_en or "").strip():
            updates["answer_es"] = item.answer_en
        if not (item.keywords_es or "").strip() and (item.keywords_en or "").strip():
            updates["keywords_es"] = item.keywords_en
        if updates:
            Faq.objects.filter(pk=item.pk).update(**updates)


def clear_bootstrapped_spanish(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    Faq.objects.all().update(
        question_es="",
        short_answer_es="",
        answer_es="",
        keywords_es="",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0023_add_spanish_and_cms_i18n_fields"),
    ]

    operations = [
        migrations.RunPython(bootstrap_spanish_from_english, clear_bootstrapped_spanish),
    ]
