"""Traduções padrão de iscas e peixes (PT é o nome canônico persistido)."""

from __future__ import annotations

BAIT_CONTENT_I18N: dict[str, dict[str, str]] = {
    "Isca comum": {
        "name_en": "Common bait",
        "name_es": "Cebo común",
        "description_en": "Simple bait to cast the line.",
        "description_es": "Cebo simple para lanzar la línea.",
    },
    "Isca do aprendiz": {
        "name_en": "Apprentice bait",
        "name_es": "Cebo del aprendiz",
        "description_en": "An extra chance to land your next trophy.",
        "description_es": "Una chance extra para traer tu próximo trofeo.",
    },
    "Isca encantada": {
        "name_en": "Enchanted bait",
        "name_es": "Cebo encantado",
        "description_en": "Draws rare fish from the deeper waters.",
        "description_es": "Atrae peces raros en las aguas más profundas.",
    },
}

FISH_CONTENT_I18N: dict[str, dict[str, str]] = {
    "Lambari": {"name_en": "Lambari", "name_es": "Lambari"},
    "Tilápia": {"name_en": "Tilapia", "name_es": "Tilapia"},
    "Traíra": {"name_en": "Traira", "name_es": "Traira"},
    "Dourado": {"name_en": "Dourado", "name_es": "Dorado"},
    "Tucunaré": {"name_en": "Tucunare", "name_es": "Tucunare"},
    "Tambaqui": {"name_en": "Tambaqui", "name_es": "Tambaqui"},
    "Piraíba": {"name_en": "Piraiba", "name_es": "Piraiba"},
    "Surubim": {"name_en": "Surubim", "name_es": "Surubim"},
    "Pirarucu Ancestral": {"name_en": "Ancestral Pirarucu", "name_es": "Pirarucu ancestral"},
    "Koi Etéreo": {"name_en": "Ethereal Koi", "name_es": "Koi etéreo"},
    "Boiúna": {"name_en": "Boiuna", "name_es": "Boiuna"},
    "Serafim de Eva": {"name_en": "Seraph of Eva", "name_es": "Serafín de Eva"},
}
