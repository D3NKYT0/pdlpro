from uuid import UUID

from django.db import migrations


INTERNAL_ITEMS = [
    (
        "c0200000-0000-4000-8000-000000000001",
        "staff",
        "support",
        "Como a equipe acompanha os chamados?",
        "Abra o painel da equipe e entre em Atendimento para consultar a fila autorizada.",
        "A área interna de Atendimento permite acompanhar chamados conforme as permissões da sua conta. Preserve os dados do jogador, registre orientações no chamado correto e nunca solicite senhas, códigos de autenticação ou links de recuperação.",
        "staff,equipe,chamado,ticket,fila,atendimento interno",
    ),
    (
        "c0200000-0000-4000-8000-000000000002",
        "staff",
        "community",
        "Onde a equipe administra conteúdo e serviços?",
        "Use o painel da equipe; cada módulo aparece conforme suas permissões.",
        "O painel da equipe reúne as áreas administrativas liberadas para a sua conta, como conteúdo, serviços, contas e suporte. A presença do artigo no assistente não concede acesso: cada tela e API continua validando a permissão correspondente.",
        "staff,equipe,admin,conteúdo,serviços,permissão",
    ),
    (
        "c0200000-0000-4000-8000-000000000003",
        "staff",
        "account_security",
        "Que cuidados a equipe deve ter ao atender um jogador?",
        "Confirme o contexto no painel e nunca peça credenciais ou códigos secretos.",
        "Consulte apenas os dados necessários à tarefa e use as ferramentas autorizadas do painel. Senhas, códigos 2FA, passkeys, links de recuperação e credenciais do jogo não devem ser solicitados nem copiados para notas ou chamados.",
        "staff,privacidade,segurança,credencial,2fa,atendimento",
    ),
    (
        "c0200000-0000-4000-8000-000000000004",
        "superadmin",
        "community",
        "Onde o superadministrador gerencia os temas do painel?",
        "Abra a administração de temas, disponível somente para superadministradores.",
        "A instalação, ativação e remoção de pacotes de tema ficam na área administrativa reservada a superadministradores. Revise o pacote e valide o painel antes de ativá-lo; as rotas do backend confirmam o papel mesmo que um link seja acessado diretamente.",
        "superadmin,tema,pacote,instalar,ativar,aparência",
    ),
]


def seed_internal_help(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    for order, (item_id, audience, category, question, short_answer, answer, keywords) in enumerate(INTERNAL_ITEMS, 1000):
        Faq.objects.update_or_create(
            id=UUID(item_id),
            defaults={
                "audience": audience,
                "category": category,
                "question": question,
                "short_answer": short_answer,
                "answer": answer,
                "keywords": keywords,
                "order": order,
                "is_published": True,
            },
        )


def remove_internal_help(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    Faq.objects.filter(id__in=[UUID(item[0]) for item in INTERNAL_ITEMS]).delete()


class Migration(migrations.Migration):
    dependencies = [("content", "0005_faq_audience")]
    operations = [migrations.RunPython(seed_internal_help, remove_internal_help)]
