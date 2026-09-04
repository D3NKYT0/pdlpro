"""Atualiza somente a orientação de privacidade fornecida pelo projeto."""

from importlib import import_module
from typing import ClassVar

from django.db import migrations

ARTICLE_ID = "c0100000-0000-4000-8000-000000000034"
ANSWER = "A Ajuda usa a identidade autenticada para selecionar orientações autorizadas. As mensagens e o contexto recente são processados no servidor por um modelo local, quando habilitado, sem envio para uma IA na nuvem. O PDL não grava transcrições no banco: o navegador mantém o histórico e um token assinado temporário, legível e válido apenas para o mesmo usuário, papel e idioma. Nova conversa ou recarregar a tela descarta esse contexto. Não envie senhas ou códigos. O Denkynho não consulta saldos, personagens ou pagamentos nem executa operações. Se a geração estiver indisponível, a tela informa o modo de ajuda básica."
ANSWER_EN = "Help uses your authenticated identity to select authorized guidance. Messages and recent context are processed by a local model on the server when enabled, without sending them to cloud AI. PDL does not store transcripts in its database: the browser keeps the history and a temporary signed, readable token valid only for the same user, role and language. New conversation or reloading the page discards this context. Never send passwords or codes. Denkynho does not access balances, characters or payments or perform operations. If generation is unavailable, the page indicates basic help mode."


def update_privacy(apps, schema_editor):
    apps.get_model("content", "Faq").objects.filter(id=ARTICLE_ID).update(answer=ANSWER, answer_en=ANSWER_EN)


def restore_privacy(apps, schema_editor):
    previous = import_module("apps.content.migrations.0010_update_semantic_privacy")
    english = import_module("apps.content.migrations.0009_seed_english_faq")
    old_english = next(answer for number, _, answer, _ in english.ENGLISH if number == 34)
    apps.get_model("content", "Faq").objects.filter(id=ARTICLE_ID).update(answer=previous.ANSWER, answer_en=old_english)


class Migration(migrations.Migration):
    dependencies: ClassVar = [("content", "0010_update_semantic_privacy")]
    operations: ClassVar = [migrations.RunPython(update_privacy, restore_privacy)]
