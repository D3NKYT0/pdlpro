"""Atualiza as orientações de privacidade para os três modos de geração."""

from importlib import import_module
from typing import ClassVar
from uuid import UUID

from django.db import migrations

ARTICLE_ID = "c0100000-0000-4000-8000-000000000034"
HANDBOOK_ID = UUID("c0300000-0000-4000-8000-000000000042")
ANSWER = (
    "A Ajuda usa a identidade autenticada para selecionar orientações autorizadas. "
    "As mensagens e o contexto recente passam pelo servidor. A geração pode usar um "
    "modelo local (Ollama), a API remota configurada pela administração, ou ficar "
    "desligada — nesse caso a tela usa só o FAQ. O PDL não grava transcrições no "
    "banco: o navegador mantém o histórico e um token assinado temporário, legível e "
    "válido apenas para o mesmo usuário, papel e idioma. Nova conversa ou recarregar "
    "a tela descarta esse contexto. Não envie senhas ou códigos. O Denkynho não "
    "consulta saldos, personagens ou pagamentos nem executa operações. Se a geração "
    "estiver indisponível, a tela informa o modo de ajuda básica."
)
ANSWER_EN = (
    "Help uses your authenticated identity to select authorized guidance. Messages "
    "and recent context go through the server. Generation may use a local model "
    "(Ollama), the remote API configured by administrators, or stay off — then the "
    "page uses only the FAQ. PDL does not store transcripts in its database: the "
    "browser keeps the history and a temporary signed, readable token valid only for "
    "the same user, role and language. New conversation or reloading the page "
    "discards this context. Never send passwords or codes. Denkynho does not access "
    "balances, characters or payments or perform operations. If generation is "
    "unavailable, the page indicates basic help mode."
)
HANDBOOK = (
    "A Ajuda usa sua identidade autenticada para escolher orientações do seu papel. "
    "Jogadores recebem artigos públicos; equipe recebe também os da staff; "
    "superadministradores recebem todos. O Denkynho não altera senha, não transfere "
    "saldo, não abre chamado sozinho e não acessa dados particulares. Mensagens podem "
    "ir a um modelo local no servidor, à API remota configurada pela administração, "
    "ou só ao FAQ se a geração estiver desligada. Transcrições não ficam no banco. "
    "Para um caso da sua conta, use Atendimento."
)
HANDBOOK_EN = (
    "Help uses your authenticated identity to choose guidance for your role. Players "
    "get public articles; staff also get staff articles; superadministrators get all. "
    "Denkynho does not change passwords, transfer balance, open tickets by himself, "
    "or access private data. Messages may go to a local model on the server, to the "
    "remote API configured by administrators, or only to the FAQ if generation is "
    "off. Transcripts are not stored in the database. For an account-specific case, "
    "use Support."
)


def update_privacy(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    Faq.objects.filter(id=ARTICLE_ID).update(answer=ANSWER, answer_en=ANSWER_EN)
    Faq.objects.filter(id=HANDBOOK_ID).update(answer=HANDBOOK, answer_en=HANDBOOK_EN)


def restore_privacy(apps, schema_editor):
    previous = import_module("apps.content.migrations.0011_local_conversation_privacy")
    handbook = import_module("apps.content.migrations.0013_seed_denkynho_handbook")
    Faq = apps.get_model("content", "Faq")
    Faq.objects.filter(id=ARTICLE_ID).update(answer=previous.ANSWER, answer_en=previous.ANSWER_EN)
    item = next(row for row in handbook.HANDBOOK if row[0] == 42)
    Faq.objects.filter(id=HANDBOOK_ID).update(answer=item[5], answer_en=item[9])


class Migration(migrations.Migration):
    dependencies: ClassVar = [("content", "0015_denkynho_empathy")]
    operations: ClassVar = [migrations.RunPython(update_privacy, restore_privacy)]
