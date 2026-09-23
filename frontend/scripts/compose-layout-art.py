"""Compõe os slots dos layouts a partir de cenas completas do Classic.

Não cola recortes de personagem. Cada hero, CTA e feature é um enquadramento
de uma placa que já é uma cena (personagem no espaço, exército no cerco,
arquivo, arena). Logo e brasão ficam de fora.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "public" / "theme" / "default" / "images"

# Só placas com ambiente. Sem PNG de estúdio, chroma ou screenshot isométrico.
# Retrato de estúdio fica de fora: não é cena.
PLATES = {
    "cinema": "home/cinematic-v2.webp",
    "siege": "home/castle-siege-v2.webp",
    "archive": "home/archive-v2.webp",
    "map": "home/chronicle-rates-v2.webp",
    "fame": "home/hall-of-fame-v2.webp",
    "arena": "home/rankings-v2.webp",
    "council": "home/clans-v2.webp",
    "ember": "bg/coming-soon.png",
    "host": "bg/coming-soon-open.png",
    "peaks": "bg/4.jpg",
}

# (placa, foco_x, foco_y, zoom) — zoom 1 cobre o quadro; >1 aproxima o foco.
LAYOUTS: dict[str, dict] = {
    "vesperlyn": {
        "hero": ("cinema", 0.50, 0.46, 1.00),
        "cta": ("cinema", 0.82, 0.52, 1.34),
        "features": [
            ("cinema", 0.13, 0.72, 1.78),
            ("cinema", 0.24, 0.18, 1.62),
            ("cinema", 0.86, 0.48, 1.48),
        ],
    },
    "gemwright": {
        "hero": ("cinema", 0.50, 0.46, 1.00),
        "cta": ("ember", 0.50, 0.44, 1.00),
        "features": [
            ("archive", 0.86, 0.52, 1.58),
            ("map", 0.16, 0.50, 1.52),
            ("peaks", 0.50, 0.40, 1.14),
        ],
    },
    "ironspine": {
        "hero": ("host", 0.50, 0.42, 1.00),
        "cta": ("ember", 0.50, 0.46, 1.08),
        "features": [
            ("host", 0.50, 0.70, 1.52),
            ("ember", 0.50, 0.38, 1.28),
            ("siege", 0.50, 0.32, 1.36),
        ],
    },
    "ashenledger": {
        "hero": ("archive", 0.42, 0.48, 1.00),
        "cta": ("map", 0.55, 0.42, 1.18),
        "features": [
            ("archive", 0.38, 0.55, 1.38),
            ("map", 0.72, 0.48, 1.42),
            ("arena", 0.70, 0.42, 1.32),
        ],
    },
    "warhorn": {
        "hero": ("siege", 0.50, 0.42, 1.00),
        "cta": ("host", 0.50, 0.40, 1.06),
        "features": [
            ("siege", 0.16, 0.62, 1.58),
            ("siege", 0.50, 0.28, 1.48),
            ("host", 0.18, 0.48, 1.42),
        ],
    },
    "ironpatch": {
        "hero": ("ember", 0.50, 0.44, 1.00),
        "cta": ("host", 0.50, 0.52, 1.16),
        "features": [
            ("ember", 0.50, 0.62, 1.40),
            ("host", 0.50, 0.28, 1.38),
            ("map", 0.50, 0.40, 1.22),
        ],
    },
    "laurelwake": {
        "hero": ("fame", 0.50, 0.42, 1.02),
        "cta": ("arena", 0.58, 0.44, 1.10),
        "features": [
            ("fame", 0.50, 0.32, 1.48),
            ("arena", 0.16, 0.58, 1.55),
            ("council", 0.78, 0.42, 1.50),
        ],
    },
    "meridian": {
        "hero": ("map", 0.55, 0.46, 1.00),
        "cta": ("archive", 0.48, 0.50, 1.12),
        "features": [
            ("map", 0.18, 0.48, 1.50),
            ("map", 0.68, 0.42, 1.38),
            ("archive", 0.78, 0.48, 1.46),
        ],
    },
    "twinwake": {
        "hero": ("cinema", 0.22, 0.55, 1.18),
        "cta": ("host", 0.50, 0.46, 1.08),
        "features": [
            ("cinema", 0.14, 0.70, 1.70),
            ("host", 0.50, 0.58, 1.36),
            ("siege", 0.50, 0.50, 1.20),
        ],
    },
    "cartograph": {
        "hero": ("map", 0.62, 0.44, 1.04),
        "cta": ("peaks", 0.50, 0.38, 1.08),
        "features": [
            ("map", 0.78, 0.52, 1.48),
            ("peaks", 0.50, 0.55, 1.32),
            ("archive", 0.58, 0.40, 1.40),
        ],
    },
    "classing": {
        "hero": ("council", 0.58, 0.46, 1.04),
        "cta": ("fame", 0.50, 0.48, 1.12),
        "features": [
            ("fame", 0.50, 0.36, 1.42),
            ("council", 0.48, 0.58, 1.32),
            ("council", 0.82, 0.40, 1.62),
        ],
    },
    "parchment": {
        "hero": ("archive", 0.70, 0.48, 1.08),
        "cta": ("archive", 0.28, 0.58, 1.28),
        "features": [
            ("archive", 0.86, 0.48, 1.62),
            ("archive", 0.50, 0.30, 1.50),
            ("map", 0.22, 0.52, 1.46),
        ],
    },
    "obsidian": {
        "hero": ("arena", 0.52, 0.44, 1.00),
        "cta": ("cinema", 0.48, 0.38, 1.22),
        "features": [
            ("arena", 0.14, 0.58, 1.58),
            ("cinema", 0.50, 0.22, 1.48),
            ("council", 0.42, 0.48, 1.32),
        ],
    },
    "hearthspire": {
        "hero": ("council", 0.48, 0.48, 1.00),
        "cta": ("archive", 0.36, 0.52, 1.16),
        "features": [
            ("council", 0.50, 0.55, 1.42),
            ("council", 0.80, 0.38, 1.55),
            ("archive", 0.80, 0.55, 1.48),
        ],
    },
    "goldleaf": {
        "hero": ("fame", 0.50, 0.44, 1.04),
        "cta": ("fame", 0.50, 0.22, 1.16),
        "features": [
            ("fame", 0.18, 0.42, 1.34),
            ("fame", 0.50, 0.48, 1.22),
            ("arena", 0.55, 0.32, 1.40),
        ],
    },
    "lampmarket": {
        "hero": ("council", 0.62, 0.50, 1.08),
        "cta": ("archive", 0.55, 0.58, 1.22),
        "features": [
            ("council", 0.22, 0.52, 1.48),
            ("archive", 0.42, 0.58, 1.40),
            ("map", 0.55, 0.58, 1.36),
        ],
    },
    "bracket": {
        "hero": ("arena", 0.48, 0.46, 1.00),
        "cta": ("siege", 0.50, 0.50, 1.14),
        "features": [
            ("arena", 0.50, 0.30, 1.42),
            ("siege", 0.82, 0.58, 1.50),
            ("fame", 0.50, 0.42, 1.28),
        ],
    },
    "eventide": {
        "hero": ("cinema", 0.46, 0.40, 1.06),
        "cta": ("arena", 0.62, 0.38, 1.18),
        "features": [
            ("cinema", 0.78, 0.46, 1.50),
            ("arena", 0.18, 0.62, 1.52),
            ("council", 0.55, 0.42, 1.30),
        ],
    },
    "wayfarer": {
        "hero": ("map", 0.48, 0.46, 1.00),
        "cta": ("peaks", 0.50, 0.46, 1.10),
        "features": [
            ("map", 0.14, 0.52, 1.55),
            ("peaks", 0.50, 0.28, 1.36),
            ("cinema", 0.50, 0.62, 1.40),
        ],
    },
    "watchfire": {
        "hero": ("host", 0.50, 0.68, 1.22),
        "cta": ("siege", 0.50, 0.36, 1.16),
        "features": [
            ("host", 0.16, 0.55, 1.48),
            ("ember", 0.50, 0.50, 1.22),
            ("siege", 0.50, 0.58, 1.34),
        ],
    },
}

SIZES = {
    "hero": (1600, 720),
    "cta": (1600, 520),
    "feature": (800, 500),
}


def open_rgb(relative: str) -> Image.Image:
    return Image.open(IMG / relative).convert("RGB")


def frame(source: Image.Image, size: tuple[int, int], fx: float, fy: float, zoom: float) -> Image.Image:
    sw, sh = source.size
    tw, th = size
    scale = max(tw / sw, th / sh) * max(1.0, zoom)
    rw = max(tw, int(round(sw * scale)))
    rh = max(th, int(round(sh * scale)))
    resized = source.resize((rw, rh), Image.Resampling.LANCZOS)
    left = int(round(fx * rw - tw / 2))
    top = int(round(fy * rh - th / 2))
    left = max(0, min(left, rw - tw))
    top = max(0, min(top, rh - th))
    return resized.crop((left, top, left + tw, top + th))


def vignette(image: Image.Image, strength: float = 0.42) -> Image.Image:
    width, height = image.size
    small = Image.new("L", (64, 36), 0)
    pixels = small.load()
    for y in range(36):
        for x in range(64):
            nx = (x + 0.5) / 64 * 2 - 1
            ny = (y + 0.5) / 36 * 2 - 1
            distance = (nx * nx * 0.72 + ny * ny) ** 0.5
            alpha = max(0.0, min(1.0, (distance - 0.52) / 0.78))
            pixels[x, y] = int(255 * alpha * strength)
    mask = small.resize((width, height), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(8))
    overlay = Image.new("RGB", (width, height), (6, 5, 4))
    return Image.composite(overlay, image, mask)


def finish(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Contrast(image).enhance(1.06)
    image = ImageEnhance.Color(image).enhance(1.03)
    return vignette(image)


def scene(plate: str, fx: float, fy: float, zoom: float, size: tuple[int, int]) -> Image.Image:
    return finish(frame(open_rgb(PLATES[plate]), size, fx, fy, zoom))


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=88, method=4)


def paint_template(template_id: str, cache: dict[str, Image.Image] | None = None) -> None:
    if template_id not in LAYOUTS:
        raise KeyError(template_id)
    plates = cache or {name: open_rgb(relative) for name, relative in PLATES.items()}
    shots = LAYOUTS[template_id]

    def make(spec: tuple, size: tuple[int, int]) -> Image.Image:
        plate, fx, fy, zoom = spec
        return finish(frame(plates[plate], size, fx, fy, zoom))

    save_webp(make(shots["hero"], SIZES["hero"]), IMG / "bg" / f"{template_id}-hero.webp")
    save_webp(make(shots["cta"], SIZES["cta"]), IMG / "bg" / f"{template_id}-cta.webp")
    for index, spec in enumerate(shots["features"], start=1):
        save_webp(make(spec, SIZES["feature"]), IMG / "home" / f"{template_id}-{index}.webp")


def paint_all() -> None:
    cache = {name: open_rgb(relative) for name, relative in PLATES.items()}
    for template_id in LAYOUTS:
        paint_template(template_id, cache)
    classic_cta = finish(frame(cache[LAYOUTS["vesperlyn"]["cta"][0]], SIZES["cta"], *LAYOUTS["vesperlyn"]["cta"][1:]))
    classic_cta.save(IMG / "cta-banner.jpg", "JPEG", quality=90)


if __name__ == "__main__":
    import sys
    targets = sys.argv[1:]
    if targets:
        for template_id in targets:
            paint_template(template_id)
        print(f"composed {', '.join(targets)} -> {IMG / 'bg'} and {IMG / 'home'}")
    else:
        paint_all()
        print(f"composed scene slots -> {IMG / 'bg'} and {IMG / 'home'}")
