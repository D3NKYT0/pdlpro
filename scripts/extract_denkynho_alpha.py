"""Remove o fundo das poses novas do Denkynho com chroma verde.

O gerador entrega RGB com margem clara ou xadrez. Verde saturado não aparece no
cabelo, na roupa preta nem na pele; por isso é a chave. Papel branco normalmente
só some num anel junto do fundo externo, para não apagar dentes, olhos e o pano
do carinho. A sequência de carinho, que não tem pano branco real, remove também
o papel conectado à margem. O banho usa uma chave neutra mais restrita para
preservar espuma, gotas e brilhos coloridos. O xadrez interno vira alpha.
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "mascot" / "denkynho"
FILES = (
    "13-dancando-sequencia.png",
    "14-carinho-sequencia.png",
    "15-banho-sequencia.png",
    "13-dancando.png",
    "14-carinho.png",
    "03-pensando-sequencia.png",
    "09-confuso-sequencia.png",
    "02-sucesso-sequencia.png",
)

# A sequência de carinho ainda traz papel/xadrez claro ligado ao fundo externo
# atrás do braço e do pente. Nela não há objeto branco encostando na margem; já
# a pose estática contém um pano branco real e precisa do modo conservador.
PAPER_BACKGROUND_FILES = {"14-carinho-sequencia.png"}
STRICT_PAPER_BACKGROUND_FILES = {"15-banho-sequencia.png"}

GREEN_EXCESS = 28
GREEN_FLOOR = 70
PAPER_LUMA = 160
PAPER_CHROMA = 52
FLOOD_STRENGTH = 0.28
FRINGE_STRENGTH = 0.16
CHECKER_LUMA = 145
CHECKER_CHROMA = 40
CHECKER_DELTA = 18


def chroma_green_strength(pixels: np.ndarray) -> np.ndarray:
    """1 = verde de chroma; 0 = qualquer outra cor."""

    red = pixels[:, :, 0].astype(np.float32)
    green = pixels[:, :, 1].astype(np.float32)
    blue = pixels[:, :, 2].astype(np.float32)
    excess = green - np.maximum(red, blue)
    strength = np.clip((excess - GREEN_EXCESS) / 70.0, 0, 1)
    return np.where((green > GREEN_FLOOR) & (excess > GREEN_EXCESS), strength, 0)


def paper_strength(pixels: np.ndarray) -> np.ndarray:
    """1 = papel claro de baixa saturação (só na beirada do fundo)."""

    red = pixels[:, :, 0].astype(np.float32)
    green = pixels[:, :, 1].astype(np.float32)
    blue = pixels[:, :, 2].astype(np.float32)
    luma = 0.299 * red + 0.587 * green + 0.114 * blue
    chroma = np.maximum(np.maximum(red, green), blue) - np.minimum(np.minimum(red, green), blue)
    strength = np.clip((luma - PAPER_LUMA) / 70.0, 0, 1)
    return np.where((luma >= PAPER_LUMA) & (chroma <= PAPER_CHROMA), strength, 0)


def strict_paper_mask(pixels: np.ndarray) -> np.ndarray:
    """Papel/xadrez quase neutro, sem alcançar espuma, água ou brilhos coloridos."""

    values = pixels.astype(np.int16)
    chroma = values.max(axis=2) - values.min(axis=2)
    luma = values.mean(axis=2)
    return (luma >= 205) & (chroma <= 6)


def checkerboard_mask(pixels: np.ndarray) -> np.ndarray:
    """Xadrez claro-escuro que o gerador desenha no lugar de transparência."""

    luma = (
        0.299 * pixels[:, :, 0].astype(np.float32)
        + 0.587 * pixels[:, :, 1].astype(np.float32)
        + 0.114 * pixels[:, :, 2].astype(np.float32)
    )
    chroma = pixels.max(axis=2).astype(np.float32) - pixels.min(axis=2).astype(np.float32)
    gray = (chroma <= CHECKER_CHROMA) & (luma >= CHECKER_LUMA)
    contrast = np.maximum(np.abs(luma - np.roll(luma, 1, axis=1)), np.abs(luma - np.roll(luma, 1, axis=0)))
    checker = gray & (contrast >= CHECKER_DELTA) & (contrast <= 110)
    checker[:, 0] = False
    checker[0, :] = False
    return checker


def flood_from(seeds: np.ndarray, walkable: np.ndarray) -> np.ndarray:
    """Expande as sementes só por pixels caminháveis, em dilatações vetorizadas."""

    opened = seeds & walkable
    if not opened.any():
        return opened
    while True:
        nxt = opened | (walkable & _adjacent8(opened, outside=False))
        if nxt.sum() == opened.sum():
            return nxt
        opened = nxt


def _adjacent8(mask: np.ndarray, *, outside: bool) -> np.ndarray:
    padded = np.pad(mask, 1, constant_values=outside)
    return (
        padded[1:-1, 2:] | padded[1:-1, :-2] | padded[2:, 1:-1] | padded[:-2, 1:-1]
        | padded[:-2, :-2] | padded[:-2, 2:] | padded[2:, :-2] | padded[2:, 2:]
    )


def flood_background(
    pixels: np.ndarray,
    alpha: np.ndarray,
    *,
    remove_connected_paper: bool = False,
    remove_strict_paper: bool = False,
) -> np.ndarray:
    """Verde e xadrez andam livremente; papel branco só num anel junto do fundo externo."""

    green = chroma_green_strength(pixels) >= FLOOD_STRENGTH
    paper = paper_strength(pixels) >= FLOOD_STRENGTH
    checker = checkerboard_mask(pixels)
    strict_paper = strict_paper_mask(pixels)
    walkable = green | checker | (paper if remove_connected_paper else False) | (strict_paper if remove_strict_paper else False)
    transparent = alpha == 0
    passable = walkable | transparent
    next_to_open = _adjacent8(transparent, outside=True)
    edge_bg = flood_from(passable & next_to_open, passable)
    holes = flood_from(checker, walkable)
    paper_ring = paper & _adjacent8(edge_bg, outside=False) & ~edge_bg
    return edge_bg | holes | paper_ring


def despill_fringe(rgb: np.ndarray, alpha: np.ndarray, background: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Tira o halo branco/cinza da silhueta sem apagar pele ou o pano do carinho."""

    padded = np.pad(background, 1, constant_values=False)
    fringe = (
        padded[1:-1, 2:] | padded[1:-1, :-2] | padded[2:, 1:-1] | padded[:-2, 1:-1]
        | padded[:-2, :-2] | padded[:-2, 2:] | padded[2:, :-2] | padded[2:, 2:]
    ) & ~background & (alpha > 0)
    red = rgb[:, :, 0].astype(np.float32)
    green = rgb[:, :, 1].astype(np.float32)
    blue = rgb[:, :, 2].astype(np.float32)
    chroma = np.maximum(np.maximum(red, green), blue) - np.minimum(np.minimum(red, green), blue)
    mix = np.minimum(np.minimum(red, green), blue) / 255.0
    halo = fringe & (chroma <= 40) & (mix >= 0.22) & (mix <= 0.78)
    keep = np.clip(1.0 - mix, 0, 1)
    new_alpha = alpha.astype(np.float32)
    new_alpha[halo] = np.minimum(new_alpha[halo], keep[halo] * 255.0)
    scale = np.divide(1.0, np.maximum(keep, 1e-6))
    for channel in (red, green, blue):
        channel[halo] = np.clip((channel[halo] - mix[halo] * 255.0) * scale[halo], 0, 255)
    return np.stack([red, green, blue], axis=2), new_alpha


def extract(path: Path) -> None:
    """Aplica chroma no fundo e suaviza o halo da silhueta."""

    image = Image.open(path).convert("RGBA")
    pixels = np.asarray(image).copy()
    rgb = pixels[:, :, :3]
    alpha = pixels[:, :, 3]
    background = flood_background(
        rgb,
        alpha,
        remove_connected_paper=path.name in PAPER_BACKGROUND_FILES,
        remove_strict_paper=path.name in STRICT_PAPER_BACKGROUND_FILES,
    )
    green_strength = chroma_green_strength(rgb)
    rgb, new_alpha = despill_fringe(rgb, np.where(background, 0, alpha), background)
    padded = np.pad(background, 1, constant_values=False)
    near_bg = padded[1:-1, 2:] | padded[1:-1, :-2] | padded[2:, 1:-1] | padded[:-2, 1:-1]
    fade = (~background) & near_bg & (green_strength >= FRINGE_STRENGTH)
    new_alpha = np.minimum(new_alpha, np.where(fade, (1.0 - green_strength) * 255.0, new_alpha))
    pixels[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    pixels[:, :, 3] = np.clip(new_alpha, 0, 255).astype(np.uint8)
    pixels[pixels[:, :, 3] == 0, :3] = 0
    result = Image.fromarray(pixels, "RGBA")
    temporary = path.with_suffix(".tmp.png")
    result.save(temporary)
    temporary.replace(path)


def main() -> None:
    for name in FILES:
        extract(ROOT / name)


if __name__ == "__main__":
    main()
