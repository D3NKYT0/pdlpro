"""Pinta os baús em pixel art 3/4, no estilo dos ícones de item do painel."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "public" / "theme" / "default" / "images" / "games"
SCALE = 5
W, H = 60, 58

INK = (12, 10, 7, 255)
WOOD_D = (32, 24, 16, 255)
WOOD = (62, 46, 28, 255)
WOOD_M = (86, 64, 38, 255)
WOOD_H = (118, 88, 52, 255)
SIDE = (44, 32, 20, 255)
SIDE_D = (24, 18, 12, 255)
IRON_D = (48, 42, 36, 255)
IRON = (126, 116, 104, 255)
IRON_H = (176, 166, 152, 255)
GOLD_D = (118, 88, 36, 255)
GOLD = (212, 175, 97, 255)
GOLD_B = (230, 199, 125, 255)
GEM = (176, 54, 44, 255)
GEM_H = (240, 176, 128, 255)
EPIC_GEM = (168, 112, 220, 255)
EPIC_GEM_H = (214, 186, 242, 255)
SHADE = (0, 0, 0, 110)

PALETTES = {
    "common": {
        "metal": IRON,
        "metal_d": IRON_D,
        "metal_h": IRON_H,
        "lid_top": WOOD_M,
        "gem": None,
        "gem_h": None,
        "ornament": False,
    },
    "rare": {
        "metal": GOLD,
        "metal_d": GOLD_D,
        "metal_h": GOLD_B,
        "lid_top": WOOD_H,
        "gem": None,
        "gem_h": None,
        "ornament": False,
    },
    "epic": {
        "metal": GOLD,
        "metal_d": GOLD_D,
        "metal_h": GOLD_B,
        "lid_top": GOLD_D,
        "gem": EPIC_GEM,
        "gem_h": EPIC_GEM_H,
        "ornament": True,
    },
    "legendary": {
        "metal": GOLD_B,
        "metal_d": GOLD,
        "metal_h": GOLD_B,
        "lid_top": GOLD,
        "gem": GEM_H,
        "gem_h": GOLD_B,
        "ornament": True,
    },
}


def pixel(grid, x: int, y: int, color) -> None:
    if 0 <= x < W and 0 <= y < H:
        grid[y][x] = color


def fill(grid, x: int, y: int, w: int, h: int, color) -> None:
    for row in range(h):
        for col in range(w):
            pixel(grid, x + col, y + row, color)


def hline(grid, x: int, y: int, w: int, color) -> None:
    fill(grid, x, y, w, 1, color)


def vline(grid, x: int, y: int, h: int, color) -> None:
    fill(grid, x, y, 1, h, color)


def rivet(grid, x: int, y: int, hi, lo) -> None:
    pixel(grid, x, y, hi)
    pixel(grid, x + 1, y, lo)
    pixel(grid, x, y + 1, lo)
    pixel(grid, x + 1, y + 1, INK)


def diamond(grid, cx: int, cy: int, color, hi=None) -> None:
    pixel(grid, cx, cy - 2, color)
    hline(grid, cx - 1, cy - 1, 3, color)
    hline(grid, cx - 2, cy, 5, color)
    hline(grid, cx - 1, cy + 1, 3, color)
    pixel(grid, cx, cy + 2, color)
    if hi:
        pixel(grid, cx, cy - 1, hi)
        pixel(grid, cx, cy, hi)


def decorate_epic(grid, metal, metal_d, metal_h) -> None:
    fill(grid, 8, 16, 33, 2, EPIC_GEM)
    hline(grid, 9, 16, 10, EPIC_GEM_H)
    fill(grid, 41, 16, 8, 2, EPIC_GEM)
    fill(grid, 8, 37, 33, 3, metal_d)
    hline(grid, 9, 38, 31, EPIC_GEM)
    hline(grid, 10, 37, 8, EPIC_GEM_H)
    fill(grid, 41, 37, 8, 3, EPIC_GEM)
    fill(grid, 9, 16, 5, 8, metal_d)
    fill(grid, 35, 16, 5, 8, metal_d)
    fill(grid, 10, 17, 3, 6, EPIC_GEM)
    fill(grid, 36, 17, 3, 6, EPIC_GEM)
    fill(grid, 17, 32, 16, 12, metal_d)
    fill(grid, 18, 33, 14, 10, metal)
    fill(grid, 20, 35, 10, 7, metal_d)
    fill(grid, 24, 38, 2, 3, INK)
    pixel(grid, 24, 37, INK)
    rivet(grid, 18, 33, metal_h, metal_d)
    rivet(grid, 28, 33, metal_h, metal_d)
    diamond(grid, 24, 26, EPIC_GEM, EPIC_GEM_H)
    fill(grid, 23, 25, 3, 1, metal)
    fill(grid, 22, 26, 1, 3, metal)
    fill(grid, 26, 26, 1, 3, metal)
    fill(grid, 26, 7, 3, 2, EPIC_GEM)
    pixel(grid, 27, 6, EPIC_GEM_H)
    pixel(grid, 16, 8, EPIC_GEM_H)
    pixel(grid, 38, 9, EPIC_GEM)
    pixel(grid, 24, 13, EPIC_GEM_H)


def decorate_legendary(grid, metal, metal_d, metal_h) -> None:
    fill(grid, 8, 16, 33, 2, GOLD_B)
    fill(grid, 41, 16, 8, 2, GOLD)
    fill(grid, 8, 37, 33, 3, GOLD_D)
    hline(grid, 9, 38, 31, GOLD_B)
    fill(grid, 41, 37, 8, 3, GOLD)
    fill(grid, 8, 16, 6, 8, GOLD_D)
    fill(grid, 35, 16, 6, 8, GOLD_D)
    fill(grid, 9, 17, 4, 6, GOLD)
    fill(grid, 36, 17, 4, 6, GOLD)
    hline(grid, 9, 16, 5, GOLD_B)
    hline(grid, 36, 16, 5, GOLD_B)
    fill(grid, 16, 31, 18, 13, GOLD_D)
    fill(grid, 17, 32, 16, 11, GOLD)
    fill(grid, 19, 34, 12, 8, GOLD_D)
    fill(grid, 24, 38, 3, 3, INK)
    pixel(grid, 25, 37, INK)
    rivet(grid, 17, 32, GOLD_B, GOLD_D)
    rivet(grid, 29, 32, GOLD_B, GOLD_D)
    diamond(grid, 25, 25, GEM_H, GOLD_B)
    fill(grid, 24, 23, 3, 2, GOLD)
    pixel(grid, 25, 22, GOLD_B)
    fill(grid, 21, 5, 17, 3, GOLD)
    fill(grid, 24, 3, 3, 3, GOLD_B)
    fill(grid, 28, 2, 3, 4, GOLD_B)
    fill(grid, 32, 3, 3, 3, GOLD_B)
    pixel(grid, 29, 1, GOLD_B)
    pixel(grid, 14, 11, GOLD_B)
    pixel(grid, 42, 11, GOLD_B)
    pixel(grid, 11, 18, GOLD_B)
    pixel(grid, 39, 18, GOLD_B)


def lid_quad(grid, y0: int, y1: int, left0: int, right0: int, left1: int, right1: int, color) -> None:
    span = max(y1 - y0, 1)
    for y in range(y0, y1 + 1):
        t = (y - y0) / span
        x0 = round(left0 + (left1 - left0) * t)
        x1 = round(right0 + (right1 - right0) * t)
        hline(grid, x0, y, x1 - x0 + 1, color)


def paint(rarity: str) -> Image.Image:
    tone = PALETTES[rarity]
    grid: list[list] = [[None] * W for _ in range(H)]
    metal, metal_d, metal_h = tone["metal"], tone["metal_d"], tone["metal_h"]
    lid_top = tone["lid_top"]

    fill(grid, 10, 45, 34, 4, SHADE)
    fill(grid, 16, 48, 26, 2, SHADE)

    # lado direito do corpo
    fill(grid, 40, 24, 10, 20, SIDE_D)
    fill(grid, 41, 25, 8, 18, SIDE)
    for y in (28, 34, 40):
        hline(grid, 41, y, 8, SIDE_D)
    vline(grid, 49, 24, 20, INK)

    # frente do corpo
    fill(grid, 8, 24, 33, 20, WOOD_D)
    fill(grid, 9, 25, 31, 18, WOOD)
    fill(grid, 10, 26, 5, 16, WOOD_H)
    for x in (14, 19, 24, 29, 34):
        vline(grid, x, 26, 16, WOOD_D)
    hline(grid, 9, 31, 31, WOOD_D)
    hline(grid, 9, 38, 31, WOOD_M)
    pixel(grid, 16, 29, WOOD_D)
    pixel(grid, 27, 36, WOOD_D)
    pixel(grid, 33, 28, WOOD_M)

    # pés
    fill(grid, 9, 43, 5, 3, metal_d)
    fill(grid, 34, 43, 5, 3, metal_d)
    fill(grid, 44, 43, 5, 3, metal_d)
    hline(grid, 9, 43, 5, metal)
    hline(grid, 34, 43, 5, metal)

    # tampa: topo em 3/4 encostado na frente
    lid_quad(grid, 9, 16, 16, 46, 8, 40, WOOD_D)
    lid_quad(grid, 10, 15, 17, 44, 10, 38, lid_top)
    lid_quad(grid, 11, 14, 18, 26, 12, 18, WOOD_H)
    for y in (12, 14):
        lid_quad(grid, y, y, 18, 42, 11, 36, WOOD_D)
    # frente da tampa
    fill(grid, 8, 16, 33, 8, WOOD_D)
    fill(grid, 9, 17, 31, 6, WOOD_M)
    fill(grid, 10, 17, 6, 5, WOOD_H)
    for x in (15, 21, 27, 33):
        vline(grid, x, 17, 6, WOOD_D)
    # lado da tampa
    fill(grid, 41, 16, 9, 8, SIDE_D)
    fill(grid, 42, 17, 7, 6, SIDE)

    # ferragens envolvendo
    fill(grid, 8, 20, 33, 3, metal_d)
    hline(grid, 9, 21, 31, metal)
    hline(grid, 10, 20, 8, metal_h)
    fill(grid, 41, 20, 9, 3, metal_d)
    hline(grid, 42, 21, 7, metal)

    fill(grid, 8, 30, 33, 3, metal_d)
    hline(grid, 9, 31, 31, metal)
    hline(grid, 10, 30, 8, metal_h)
    fill(grid, 41, 30, 9, 3, metal_d)

    fill(grid, 22, 16, 5, 28, metal_d)
    fill(grid, 23, 16, 3, 28, metal)
    vline(grid, 23, 17, 6, metal_h)
    fill(grid, 45, 16, 3, 28, metal_d)
    vline(grid, 46, 17, 26, metal)

    # rebites
    for x, y in ((10, 20), (17, 20), (31, 20), (37, 20), (10, 30), (17, 30), (31, 30), (37, 30)):
        rivet(grid, x, y, metal_h, metal_d)
    rivet(grid, 23, 18, metal_h, metal_d)
    rivet(grid, 23, 26, metal_h, metal_d)

    # dobradiças no fundo da tampa
    fill(grid, 20, 9, 4, 3, metal_d)
    fill(grid, 32, 9, 4, 3, metal_d)
    pixel(grid, 21, 9, metal_h)
    pixel(grid, 33, 9, metal_h)

    # fechadura
    fill(grid, 20, 33, 10, 9, metal_d)
    fill(grid, 21, 34, 8, 7, metal)
    fill(grid, 22, 35, 6, 5, metal_d)
    fill(grid, 24, 37, 2, 3, INK)
    pixel(grid, 24, 36, INK)
    pixel(grid, 25, 36, INK)
    rivet(grid, 21, 34, metal_h, metal_d)
    rivet(grid, 26, 34, metal_h, metal_d)
    if rarity == "epic":
        decorate_epic(grid, metal, metal_d, metal_h)
    elif rarity == "legendary":
        decorate_legendary(grid, metal, metal_d, metal_h)
    elif tone["gem"]:
        fill(grid, 23, 27, 4, 3, tone["gem"])
        pixel(grid, 24, 27, tone["gem_h"] or GEM_H)
        pixel(grid, 25, 28, tone["gem"])

    # contornos
    hline(grid, 8, 24, 33, INK)
    hline(grid, 8, 43, 33, INK)
    vline(grid, 8, 16, 28, INK)
    vline(grid, 40, 16, 28, INK)
    hline(grid, 8, 16, 33, INK)
    lid_quad(grid, 9, 9, 16, 46, 16, 46, INK)
    for y in range(9, 17):
        t = (y - 9) / 7
        pixel(grid, round(16 + (8 - 16) * t), y, INK)
        pixel(grid, round(46 + (40 - 46) * t), y, INK)
    vline(grid, 49, 16, 28, INK)
    hline(grid, 40, 43, 10, INK)

    image = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for y, row in enumerate(grid):
        for x, color in enumerate(row):
            if color:
                image.putpixel((x, y), color)
    return image.resize((W * SCALE, H * SCALE), Image.NEAREST)


def render(grid) -> Image.Image:
    height = len(grid)
    width = len(grid[0])
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for y, row in enumerate(grid):
        for x, color in enumerate(row):
            if color:
                image.putpixel((x, y), color)
    return image.resize((width * SCALE, height * SCALE), Image.NEAREST)


def glow_color(rarity: str):
    if rarity == "epic":
        return EPIC_GEM, EPIC_GEM_H
    if rarity == "legendary":
        return GOLD_B, GEM_H
    if rarity == "rare":
        return GOLD_B, GOLD
    return (196, 168, 112, 255), WOOD_H


def paint_body(grid, dy: int, rarity: str) -> None:
    tone = PALETTES[rarity]
    metal, metal_d, metal_h = tone["metal"], tone["metal_d"], tone["metal_h"]
    y = lambda value: value + dy
    fill(grid, 10, y(45), 34, 4, SHADE)
    fill(grid, 16, y(48), 26, 2, SHADE)
    fill(grid, 40, y(24), 10, 20, SIDE_D)
    fill(grid, 41, y(25), 8, 18, SIDE)
    for row in (28, 34, 40):
        hline(grid, 41, y(row), 8, SIDE_D)
    vline(grid, 49, y(24), 20, INK)
    fill(grid, 8, y(24), 33, 20, WOOD_D)
    fill(grid, 9, y(25), 31, 18, WOOD)
    fill(grid, 10, y(26), 5, 16, WOOD_H)
    for x in (14, 19, 24, 29, 34):
        vline(grid, x, y(26), 16, WOOD_D)
    hline(grid, 9, y(31), 31, WOOD_D)
    hline(grid, 9, y(38), 31, WOOD_M)
    fill(grid, 9, y(43), 5, 3, metal_d)
    fill(grid, 34, y(43), 5, 3, metal_d)
    fill(grid, 44, y(43), 5, 3, metal_d)
    hline(grid, 9, y(43), 5, metal)
    hline(grid, 34, y(43), 5, metal)
    fill(grid, 8, y(30), 33, 3, metal_d)
    hline(grid, 9, y(31), 31, metal)
    hline(grid, 10, y(30), 8, metal_h)
    fill(grid, 41, y(30), 9, 3, metal_d)
    fill(grid, 22, y(24), 5, 20, metal_d)
    fill(grid, 23, y(24), 3, 20, metal)
    fill(grid, 45, y(24), 3, 20, metal_d)
    vline(grid, 46, y(24), 20, metal)
    for x, row in ((10, 30), (17, 30), (31, 30), (37, 30)):
        rivet(grid, x, y(row), metal_h, metal_d)
    fill(grid, 20, y(33), 10, 9, metal_d)
    fill(grid, 21, y(34), 8, 7, metal)
    fill(grid, 22, y(35), 6, 5, metal_d)
    fill(grid, 24, y(37), 2, 3, INK)
    pixel(grid, 24, y(36), INK)
    pixel(grid, 25, y(36), INK)
    rivet(grid, 21, y(34), metal_h, metal_d)
    rivet(grid, 26, y(34), metal_h, metal_d)
    if rarity == "epic":
        fill(grid, 8, y(37), 33, 3, metal_d)
        hline(grid, 9, y(38), 31, EPIC_GEM)
        hline(grid, 10, y(37), 8, EPIC_GEM_H)
        fill(grid, 41, y(37), 8, 3, EPIC_GEM)
        fill(grid, 17, y(32), 16, 12, metal_d)
        fill(grid, 18, y(33), 14, 10, metal)
        fill(grid, 20, y(35), 10, 7, metal_d)
        fill(grid, 24, y(38), 2, 3, INK)
    elif rarity == "legendary":
        fill(grid, 8, y(37), 33, 3, GOLD_D)
        hline(grid, 9, y(38), 31, GOLD_B)
        fill(grid, 41, y(37), 8, 3, GOLD)
        fill(grid, 16, y(31), 18, 13, GOLD_D)
        fill(grid, 17, y(32), 16, 11, GOLD)
        fill(grid, 19, y(34), 12, 8, GOLD_D)
        fill(grid, 24, y(38), 3, 3, INK)
    hline(grid, 8, y(24), 33, INK)
    hline(grid, 8, y(43), 33, INK)
    vline(grid, 8, y(24), 20, INK)
    vline(grid, 40, y(24), 20, INK)
    vline(grid, 49, y(24), 20, INK)
    hline(grid, 40, y(43), 10, INK)


def paint_interior(grid, dy: int, rarity: str, opened: bool) -> None:
    glow, gleam = glow_color(rarity)
    y = lambda value: value + dy
    fill(grid, 10, y(20), 29, 5, (18, 12, 8, 255))
    fill(grid, 11, y(21), 27, 3, (32, 22, 14, 255))
    fill(grid, 40, y(20), 8, 5, (14, 10, 7, 255))
    if opened:
        fill(grid, 14, y(21), 20, 3, glow)
        pixel(grid, 23, y(22), gleam)
        pixel(grid, 27, y(21), gleam)
        pixel(grid, 19, y(22), gleam)
        hline(grid, 16, y(20), 16, gleam)
    else:
        hline(grid, 12, y(22), 24, glow)
        pixel(grid, 24, y(21), gleam)
    hline(grid, 10, y(20), 29, INK)
    hline(grid, 40, y(20), 8, INK)


def paint_lid_ajar(grid, dy: int, rarity: str) -> None:
    tone = PALETTES[rarity]
    metal, metal_d, metal_h = tone["metal"], tone["metal_d"], tone["metal_h"]
    lid_top = tone["lid_top"]
    y = lambda value: value + dy - 5
    lid_quad(grid, y(9), y(16), 16, 46, 8, 40, WOOD_D)
    lid_quad(grid, y(10), y(15), 17, 44, 10, 38, lid_top)
    lid_quad(grid, y(11), y(14), 18, 26, 12, 18, WOOD_H)
    fill(grid, 8, y(16), 33, 8, WOOD_D)
    fill(grid, 9, y(17), 31, 6, WOOD_M)
    fill(grid, 10, y(17), 6, 5, WOOD_H)
    fill(grid, 41, y(16), 9, 8, SIDE_D)
    fill(grid, 42, y(17), 7, 6, SIDE)
    fill(grid, 8, y(20), 33, 3, metal_d)
    hline(grid, 9, y(21), 31, metal)
    fill(grid, 41, y(20), 9, 3, metal_d)
    fill(grid, 22, y(16), 5, 8, metal_d)
    fill(grid, 23, y(16), 3, 8, metal)
    fill(grid, 20, y(9), 4, 3, metal_d)
    fill(grid, 32, y(9), 4, 3, metal_d)
    fill(grid, 21, y(23), 3, 4, metal_d)
    fill(grid, 33, y(23), 3, 4, metal_d)
    vline(grid, 22, y(22), 6, metal)
    vline(grid, 34, y(22), 6, metal)
    if rarity == "epic":
        fill(grid, 8, y(16), 33, 2, EPIC_GEM)
        diamond(grid, 24, y(13), EPIC_GEM, EPIC_GEM_H)
        pixel(grid, 27, y(6), EPIC_GEM_H)
    elif rarity == "legendary":
        fill(grid, 8, y(16), 33, 2, GOLD_B)
        fill(grid, 21, y(5), 17, 3, GOLD)
        fill(grid, 24, y(3), 3, 3, GOLD_B)
        fill(grid, 28, y(2), 3, 4, GOLD_B)
        fill(grid, 32, y(3), 3, 3, GOLD_B)
        pixel(grid, 29, y(1), GOLD_B)
    hline(grid, 8, y(16), 33, INK)
    lid_quad(grid, y(9), y(9), 16, 46, 16, 46, INK)
    for row in range(y(9), y(17)):
        t = (row - y(9)) / 7
        pixel(grid, round(16 + (8 - 16) * t), row, INK)
        pixel(grid, round(46 + (40 - 46) * t), row, INK)
    vline(grid, 49, y(16), 8, INK)


def paint_lid_open(grid, dy: int, rarity: str) -> None:
    tone = PALETTES[rarity]
    metal, metal_d, metal_h = tone["metal"], tone["metal_d"], tone["metal_h"]
    y = lambda value: value + dy
    # tampa aberta para trás: vemos o verso em 3/4, dobradiça no fundo
    lid_quad(grid, y(2), y(18), 18, 48, 14, 42, WOOD_D)
    lid_quad(grid, y(3), y(17), 19, 46, 16, 40, WOOD)
    lid_quad(grid, y(5), y(15), 22, 32, 18, 24, WOOD_M)
    fill(grid, 14, y(18), 29, 3, WOOD_D)
    fill(grid, 15, y(19), 27, 2, metal_d)
    hline(grid, 16, y(19), 24, metal)
    fill(grid, 42, y(8), 7, 12, SIDE_D)
    fill(grid, 43, y(9), 5, 10, SIDE)
    fill(grid, 21, y(18), 4, 3, metal_d)
    fill(grid, 33, y(18), 4, 3, metal_d)
    pixel(grid, 22, y(18), metal_h)
    pixel(grid, 34, y(18), metal_h)
    if rarity == "epic":
        hline(grid, 16, y(19), 24, EPIC_GEM)
        diamond(grid, 28, y(10), EPIC_GEM, EPIC_GEM_H)
        pixel(grid, 29, y(4), EPIC_GEM_H)
    elif rarity == "legendary":
        hline(grid, 16, y(19), 24, GOLD_B)
        fill(grid, 24, y(1), 3, 3, GOLD_B)
        fill(grid, 28, y(0), 3, 4, GOLD_B)
        fill(grid, 32, y(1), 3, 3, GOLD_B)
        pixel(grid, 29, y(0), GOLD_B)
        diamond(grid, 28, y(10), GEM_H, GOLD_B)
    lid_quad(grid, y(2), y(2), 18, 48, 18, 48, INK)
    for row in range(y(2), y(19)):
        t = (row - y(2)) / 16
        pixel(grid, round(18 + (14 - 18) * t), row, INK)
        pixel(grid, round(48 + (42 - 48) * t), row, INK)
    hline(grid, 14, y(20), 29, INK)
    vline(grid, 48, y(8), 12, INK)


def paint_opening(rarity: str, pose: str) -> Image.Image:
    dy = 14
    grid: list[list] = [[None] * W for _ in range(H + dy)]
    paint_body(grid, dy, rarity)
    paint_interior(grid, dy, rarity, opened=pose == "open")
    if pose == "ajar":
        paint_lid_ajar(grid, dy, rarity)
    else:
        paint_lid_open(grid, dy, rarity)
    return render(grid)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for rarity in PALETTES:
        closed = paint(rarity)
        webp = OUT / f"box-{rarity}.webp"
        closed.save(webp, "WEBP", lossless=True, quality=100)
        print(webp)
        for pose in ("ajar", "open"):
            sprite = paint_opening(rarity, pose)
            frame = OUT / f"box-{rarity}-{pose}.webp"
            sprite.save(frame, "WEBP", lossless=True, quality=100)
            print(frame)


if __name__ == "__main__":
    main()
