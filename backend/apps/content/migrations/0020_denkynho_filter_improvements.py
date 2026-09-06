from uuid import UUID

from django.db import migrations

# Amplia palavras-chave da apresentação do PDL e acrescenta o passo a passo do armário.
FAQ_INTRO_ID = UUID("c0100000-0000-4000-8000-000000000001")
WARDROBE_ID = UUID("c0300000-0000-4000-8000-000000000062")


def improve_filters(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    intro = Faq.objects.filter(id=FAQ_INTRO_ID).first()
    if intro is not None:
        intro.keywords = "portal,painel,o que é,recursos,pdl,como funciona,what is,how works,how pdl works"
        intro.keywords_en = "portal,dashboard,features,pdl,what is,how works,how pdl works,how does pdl work"
        intro.save(update_fields=["keywords", "keywords_en"])

    Faq.objects.update_or_create(
        id=WARDROBE_ID,
        defaults={
            "audience": "public",
            "category": "getting_started",
            "question": "Como desbloquear a Biblioteca aconchegante e outras cenas do Denkynho",
            "short_answer": "Cuide do Denkynho para subir de nível; no nível 4 o armário libera a Biblioteca aconchegante.",
            "answer": (
                "1) Abra Ajuda (/painel/ajuda) e cuide do Denkynho (alimentar, dormir, brincar, banho, "
                "caminhar ou dançar quando liberado). 2) Cada cuidado válido concede XP do mascote; ao "
                "subir de nível, o armário libera peças e cenas. 3) Nível 2: broche de estrela. Nível 3: "
                "dançar juntos. Nível 4: cena Biblioteca aconchegante. Nível 5: Acampamento noturno. "
                "4) Em Armário, escolha a cena ou peça liberada; item_id vazio retira a peça. 5) "
                "Desbloqueios são cosméticos do companheiro e não alteram o personagem no servidor de jogo. "
                "Perguntas como “como passar a biblioteca aconchegante” referem-se a essa cena do armário, "
                "não a decoração de interiores."
            ),
            "keywords": (
                "biblioteca aconchegante,cozy library,passar biblioteca,desbloquear cena,armário,"
                "wardrobe,nível 4,acampamento,broche,dançar juntos,cena do denkynho"
            ),
            "question_en": "How to unlock the Cozy library and other Denkynho scenes",
            "short_answer_en": "Care for Denkynho to level up; at level 4 the wardrobe unlocks the Cozy library scene.",
            "answer_en": (
                "1) Open Help (/painel/ajuda) and care for Denkynho (feed, sleep, play, bath, walk, or dance "
                "when unlocked). 2) Valid care grants mascot XP; leveling unlocks wardrobe pieces and scenes. "
                "3) Level 2: star pin. Level 3: dance together. Level 4: Cozy library scene. Level 5: Night "
                "campsite. 4) In Wardrobe, select an unlocked scene or piece; empty item_id removes it. 5) "
                "Unlocks are companion cosmetics and do not change the in-game character. Questions like "
                "“how to pass the cozy library” refer to that wardrobe scene, not interior design."
            ),
            "keywords_en": (
                "cozy library,biblioteca aconchegante,unlock scene,wardrobe,level 4,campsite,"
                "star pin,dance together,denkynho scene"
            ),
            "assistant_only": True,
            "is_published": True,
            "order": 2062,
        },
    )


def revert_filters(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    intro = Faq.objects.filter(id=FAQ_INTRO_ID).first()
    if intro is not None:
        intro.keywords = "portal,painel,o que é,recursos"
        intro.keywords_en = "portal,dashboard,features"
        intro.save(update_fields=["keywords", "keywords_en"])
    Faq.objects.filter(id=WARDROBE_ID).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0019_alter_denkynhocareaction_action"),
    ]

    operations = [
        migrations.RunPython(improve_filters, revert_filters),
    ]
