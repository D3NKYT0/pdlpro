from importlib import import_module

from django.db import migrations


ARTICLE_ID = 'c0100000-0000-4000-8000-000000000034'
ANSWER = 'A Ajuda usa a identidade autenticada para cumprimentar você e selecionar orientações autorizadas no backend. Perguntas de conhecimento são enviadas ao servidor para busca semântica local, sem gravação e sem envio a um provedor de IA. O histórico e o apelido ficam no navegador. O Denkynho não consulta saldos, personagens ou pagamentos e não executa operações. Para analisar uma conta, use Atendimento.'


def update_privacy(apps, schema_editor):
    apps.get_model('content', 'Faq').objects.filter(id=ARTICLE_ID).update(answer=ANSWER)


def restore_privacy(apps, schema_editor):
    previous = import_module('apps.content.migrations.0007_update_denkynho_privacy_help')
    apps.get_model('content', 'Faq').objects.filter(id=ARTICLE_ID).update(answer=previous.NEW_ANSWER)


class Migration(migrations.Migration):
    dependencies = [('content', '0009_seed_english_faq')]
    operations = [migrations.RunPython(update_privacy, restore_privacy)]
