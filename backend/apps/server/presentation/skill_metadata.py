from apps.server.domain.skill_catalog import ISkillCatalog


def dump_learned_skill(
    skill_id: int,
    stored_level: int,
    class_index: int,
    catalog: ISkillCatalog,
) -> dict:
    """Monta o payload público de uma skill aprendida (nome, ícone, pasta e encanto)."""

    meta = catalog.metadata(skill_id)
    progress = catalog.progress(skill_id, stored_level)
    return {
        "skill_id": skill_id,
        "level": progress["level"],
        "enchant": progress["enchant"],
        "enchant_route": progress["enchant_route"],
        "enchant_max": progress["enchant_max"],
        "enchantable": progress["enchantable"],
        "class_index": class_index,
        "name": meta["name"],
        "icon_url": meta["icon_url"],
        "operate": meta["operate"],
        "kind": meta["kind"],
        "group": meta["group"],
        "skill_type": meta["skill_type"],
    }
