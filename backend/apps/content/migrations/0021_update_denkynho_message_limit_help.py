from uuid import UUID

from django.db import migrations

# Handbook item 41 — "Como conversar com o Denkynho na Ajuda"
CHAT_HELP_ID = UUID("c0300000-0000-4000-8000-000000000041")

ANSWER_PT = (
    "1) Abra /painel/ajuda. 2) Escreva até 400 caracteres. 3) Enter envia; Shift+Enter quebra a linha. "
    "4) Você pode filtrar sugestões por assunto ou tocar numa pergunta. 5) Nova conversa limpa o "
    "histórico desta tela. Clique no Denkynho para dicas, idioma, animações e FAQ público. Conversar "
    "só foca o campo, sem enviar. Não envie senhas. O contexto vale enquanto a conversa estiver aberta "
    "e some ao recarregar."
)
ANSWER_EN = (
    "1) Open /painel/ajuda. 2) Write up to 400 characters. 3) Enter sends; Shift+Enter adds a line. "
    "4) You can filter suggestions by topic or tap a question. 5) New conversation clears this "
    "screen’s history. Click Denkynho for tips, language, animations, and the public FAQ. Chat only "
    "focuses the field, without sending. Never send passwords. Context lasts while this conversation "
    "stays open and disappears on reload."
)
ANSWER_PT_OLD = ANSWER_PT.replace("400 caracteres", "1.000 caracteres")
ANSWER_EN_OLD = ANSWER_EN.replace("400 characters", "1,000 characters")


def update_limit(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    item = Faq.objects.filter(id=CHAT_HELP_ID).first()
    if item is None:
        return
    item.answer = ANSWER_PT
    item.answer_en = ANSWER_EN
    item.save(update_fields=["answer", "answer_en"])


def revert_limit(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    item = Faq.objects.filter(id=CHAT_HELP_ID).first()
    if item is None:
        return
    item.answer = ANSWER_PT_OLD
    item.answer_en = ANSWER_EN_OLD
    item.save(update_fields=["answer", "answer_en"])


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0020_denkynho_filter_improvements"),
    ]

    operations = [
        migrations.RunPython(update_limit, revert_limit),
    ]
