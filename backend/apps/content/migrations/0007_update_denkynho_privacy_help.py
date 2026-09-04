from uuid import UUID

from django.db import migrations


ARTICLE_ID = UUID("c0100000-0000-4000-8000-000000000034")
NEW_SHORT = "Não. O Denkynho reconhece sua sessão e consulta apenas orientações autorizadas para o seu papel."
NEW_ANSWER = "A Ajuda usa a identidade já autenticada para cumprimentar você e selecionar orientações públicas, da equipe ou de superadministradores. Essa seleção é validada no backend. A conversa e o apelido permanecem no navegador; o Denkynho não consulta saldos, personagens, pagamentos ou outros dados particulares e não executa operações. Para analisar uma conta, use Atendimento."
OLD_SHORT = "Não. O Denkynho consulta apenas o FAQ público e orienta você."
OLD_ANSWER = "A conversa da Ajuda acontece no navegador e não consulta dados particulares, pagamentos, personagens ou saldo. O Denkynho não altera configurações nem executa operações. Para uma análise da sua conta, use Atendimento; o histórico deste chat não é enviado automaticamente."


def update_help(apps, schema_editor):
    apps.get_model("content", "Faq").objects.filter(id=ARTICLE_ID).update(short_answer=NEW_SHORT, answer=NEW_ANSWER)


def restore_help(apps, schema_editor):
    apps.get_model("content", "Faq").objects.filter(id=ARTICLE_ID).update(short_answer=OLD_SHORT, answer=OLD_ANSWER)


class Migration(migrations.Migration):
    dependencies = [("content", "0006_seed_internal_help")]
    operations = [migrations.RunPython(update_help, restore_help)]
