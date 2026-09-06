from typing import ClassVar
from uuid import UUID

from django.db import migrations

WARDROBE_ID = UUID("c0300000-0000-4000-8000-000000000062")

OLD_PT = (
    "1) Abra Ajuda (/painel/ajuda) e cuide do Denkynho (alimentar, dormir, brincar, banho, "
    "caminhar ou dançar quando liberado). 2) Cada cuidado válido concede XP do mascote; ao "
    "subir de nível, o armário libera peças e cenas. 3) Nível 2: broche de estrela. Nível 3: "
    "dançar juntos. Nível 4: cena Biblioteca aconchegante. Nível 5: Acampamento noturno. "
    "4) Em Armário, escolha a cena ou peça liberada; item_id vazio retira a peça. 5) "
    "Desbloqueios são cosméticos do companheiro e não alteram o personagem no servidor de jogo. "
    "Perguntas como “como passar a biblioteca aconchegante” referem-se a essa cena do armário, "
    "não a decoração de interiores."
)
NEW_PT = OLD_PT.replace(
    "3) Nível 2:",
    "3) Nível 1: Lago sereno, onde o Denkynho pode pescar. Nível 2:",
)
OLD_EN = (
    "1) Open Help (/painel/ajuda) and care for Denkynho (feed, sleep, play, bath, walk, or dance "
    "when unlocked). 2) Valid care grants mascot XP; leveling unlocks wardrobe pieces and scenes. "
    "3) Level 2: star pin. Level 3: dance together. Level 4: Cozy library scene. Level 5: Night "
    "campsite. 4) In Wardrobe, select an unlocked scene or piece; empty item_id removes it. 5) "
    "Unlocks are companion cosmetics and do not change the in-game character. Questions like "
    "“how to pass the cozy library” refer to that wardrobe scene, not interior design."
)
NEW_EN = OLD_EN.replace(
    "3) Level 2:",
    "3) Level 1: Peaceful lake, where Denkynho can fish. Level 2:",
)


def add_lake_help(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    item = Faq.objects.filter(id=WARDROBE_ID).first()
    if item is None:
        return
    item.answer = NEW_PT
    item.answer_en = NEW_EN
    item.keywords = f"{item.keywords},lago sereno,pescar,cena lago"
    item.keywords_en = f"{item.keywords_en},peaceful lake,fishing,lake scene"
    item.save(update_fields=["answer", "answer_en", "keywords", "keywords_en"])


def remove_lake_help(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    item = Faq.objects.filter(id=WARDROBE_ID).first()
    if item is None:
        return
    item.answer = OLD_PT
    item.answer_en = OLD_EN
    item.keywords = item.keywords.replace(",lago sereno,pescar,cena lago", "")
    item.keywords_en = item.keywords_en.replace(",peaceful lake,fishing,lake scene", "")
    item.save(update_fields=["answer", "answer_en", "keywords", "keywords_en"])


class Migration(migrations.Migration):
    dependencies: ClassVar = [("content", "0021_update_denkynho_message_limit_help")]
    operations: ClassVar = [migrations.RunPython(add_lake_help, remove_lake_help)]
