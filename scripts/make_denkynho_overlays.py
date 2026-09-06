"""Overlays alinhados aos olhos detectados na própria base."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(r'd:\PROJETOS\PDL\PRO\frontend\public\mascot\denkynho\poses')
POSES_JSON = Path(r'd:\PROJETOS\PDL\PRO\frontend\src\components\help\poses.json')

MOUTH_MODE = {
    '05-dormindo': ('open', False),
    '11-comendo': ('open', False),
    '12-jogando': ('closed', True),
    '13-dancando': ('closed', True),
    '14-carinho': ('open', False),
    '15-banho': ('open', False),
    '16-andando': ('open', False),
}

# Poses com olhos abertos na base → overlay de piscada.
BLINK = ['11-comendo', '12-jogando', '13-dancando', '15-banho', '16-andando']


def to_px(box: list[float], size: tuple[int, int]) -> tuple[int, int, int, int]:
    w, h = size
    l, t, r, b = box
    return int(l / 256 * w), int(t / 384 * h), int(r / 256 * w), int(b / 384 * h)


def find_irises(im: Image.Image) -> list[tuple[int, int, int]]:
    """Retorna [(cx, cy, radius_px), ...] em pixels da imagem."""
    w, h = im.size
    px = im.load()
    pts: list[tuple[int, int]] = []
    # Faixa estreita onde costumam ficar os olhos nas poses de corpo inteiro.
    for y in range(int(h * 0.10), int(h * 0.28)):
        for x in range(int(w * 0.25), int(w * 0.75)):
            r, g, b, a = px[x, y]
            if a < 220:
                continue
            # Iris castanha: evita cabelo quase preto e sobrancelha.
            if 45 < r < 105 and 25 < g < 75 and 10 < b < 55 and (r - b) > 15 and r > g + 5:
                pts.append((x, y))
    if len(pts) < 40:
        return []
    xs = sorted(p[0] for p in pts)
    # Usa os quartis para separar os dois olhos sem incluir o nariz.
    q1, q3 = xs[len(xs) // 4], xs[(3 * len(xs)) // 4]
    mid = (q1 + q3) // 2
    groups = [[p for p in pts if p[0] < mid], [p for p in pts if p[0] >= mid]]
    out = []
    for group in groups:
        if len(group) < 15:
            continue
        cx = sum(p[0] for p in group) // len(group)
        cy = sum(p[1] for p in group) // len(group)
        dist = sorted(((p[0] - cx) ** 2 + (p[1] - cy) ** 2) ** 0.5 for p in group)
        radius = max(6, min(28, int(dist[int(len(dist) * 0.55)])))
        out.append((cx, cy, radius))
    if len(out) != 2:
        return []
    # Olhos devem ficar na mesma altura aproximada.
    if abs(out[0][1] - out[1][1]) > h * 0.06:
        return []
    return sorted(out, key=lambda item: item[0])


def sample_skin_around(im: Image.Image, cx: int, cy: int, radius: int) -> tuple[int, int, int]:
    px = im.load()
    w, h = im.size
    samples = []
    for y in range(max(0, cy - radius * 2), min(h, cy + radius * 2)):
        for x in range(max(0, cx - radius * 2), min(w, cx + radius * 2)):
            r, g, b, a = px[x, y]
            if a < 200:
                continue
            if r > 145 and g > 95 and b > 70 and r >= g and (r - b) > 18:
                samples.append((r, g, b))
    if not samples:
        return (214, 140, 90)
    n = len(samples)
    return (sum(c[0] for c in samples) // n, sum(c[1] for c in samples) // n, sum(c[2] for c in samples) // n)


def feather(img: Image.Image) -> Image.Image:
    w, h = img.size
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).ellipse((1, 1, w - 2, h - 2), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=max(1.2, min(w, h) / 10)))
    out = img.convert('RGBA')
    out.putalpha(Image.composite(out.getchannel('A'), Image.new('L', (w, h), 0), mask))
    return out


def make_blink(im: Image.Image) -> tuple[Image.Image, list[float]] | None:
    irises = find_irises(im)
    if len(irises) < 2:
        return None
    w, h = im.size
    pad = max(irises[0][2], irises[1][2]) + 4
    left, right = irises[0], irises[1]
    l = max(0, left[0] - pad)
    r = min(w, right[0] + pad)
    t = max(0, min(left[1], right[1]) - pad)
    b = min(h, max(left[1], right[1]) + pad + int(pad * 0.8))
    ow, oh = r - l, b - t
    out = Image.new('RGBA', (ow, oh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)
    for cx, cy, radius in irises:
        skin = sample_skin_around(im, cx, cy, radius)
        shade = (max(40, skin[0] - 105), max(25, skin[1] - 100), max(18, skin[2] - 90))
        # Desce um pouco: a detecção tende a subir na sobrancelha/íris superior.
        lx, ly = cx - l, cy - t + int(radius * 0.35)
        rx, ry = int(radius * 1.05), int(radius * 0.72)
        draw.ellipse((lx - rx, ly - ry, lx + rx, ly + ry), fill=(*skin, 255))
        draw.arc((lx - rx + 1, ly - 1, lx + rx - 1, ly + max(2, ry // 2)), 200, 340, fill=(*shade, 245), width=max(2, max(2, ry // 3)))
    box = [round(l / w * 256, 2), round(t / h * 384, 2), round(r / w * 256, 2), round(b / h * 384, 2)]
    return feather(out), box


def make_mouth(im: Image.Image, box: list[float], mode: str) -> Image.Image:
    region = to_px(box, im.size)
    # canvas no tamanho da box em px
    ow, oh = max(24, region[2] - region[0]), max(18, region[3] - region[1])
    # amostra pele na região
    crop = im.crop(region).convert('RGBA')
    px = crop.load()
    samples = []
    for y in range(crop.size[1]):
        for x in range(crop.size[0]):
            r, g, b, a = px[x, y]
            if a > 200 and r > 145 and g > 95 and b > 70 and r >= g and (r - b) > 18:
                samples.append((r, g, b))
    skin = (
        (sum(c[0] for c in samples) // len(samples), sum(c[1] for c in samples) // len(samples), sum(c[2] for c in samples) // len(samples))
        if samples else (214, 140, 90)
    )
    out = Image.new('RGBA', (ow, oh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)
    draw.ellipse((1, 1, ow - 2, oh - 2), fill=(*skin, 255))
    mx, my = ow // 2, int(oh * 0.55)
    if mode == 'closed':
        lip = (max(70, skin[0] - 85), max(40, skin[1] - 85), max(35, skin[2] - 65))
        draw.arc((mx - ow // 4, my - 1, mx + ow // 4, my + oh // 4), 20, 160, fill=(*lip, 250), width=max(2, oh // 9))
    else:
        draw.ellipse((mx - ow // 5, my - oh // 7, mx + ow // 5, my + oh // 4), fill=(48, 24, 22, 255))
        draw.rectangle((mx - ow // 6, my - oh // 8, mx + ow // 6, my), fill=(248, 244, 238, 255))
    return feather(out)


def mouth_box_from_eyes(im: Image.Image, eyes_box: list[float] | None) -> list[float]:
    w, h = im.size
    if eyes_box:
        mid_x = (eyes_box[0] + eyes_box[2]) / 2
        eye_bottom = eyes_box[3]
        width = max(28.0, (eyes_box[2] - eyes_box[0]) * 0.55)
        top = eye_bottom + 28.0
        return [round(mid_x - width / 2, 2), round(top, 2), round(mid_x + width / 2, 2), round(top + 24.0, 2)]
    # fallback centrado
    return [110.0, 100.0, 150.0, 126.0]


def main() -> None:
    poses = json.loads(POSES_JSON.read_text(encoding='utf-8'))
    by_id = {p['id']: p for p in poses}
    written: list[str] = []

    for pose_id in ['05-dormindo', '06-rindo', '11-comendo', '12-jogando', '13-dancando', '14-carinho', '15-banho', '16-andando']:
        entry = by_id[pose_id]
        im = Image.open(ROOT / f'{pose_id}.png').convert('RGBA')
        eyes_box = None

        if pose_id in BLINK:
            built = make_blink(im)
            if built:
                img, box = built
                file = f'{pose_id}-olhos.png'
                img.save(ROOT / file)
                entry['eyes'] = {'src': file, 'box': box}
                eyes_box = box
                written.append(file)
            else:
                entry['eyes'] = None
        else:
            entry['eyes'] = None

        if pose_id in MOUTH_MODE:
            mode, open_mouth = MOUTH_MODE[pose_id]
            if pose_id == '05-dormindo':
                box = [100.0, 148.0, 136.0, 168.0]
            else:
                box = mouth_box_from_eyes(im, eyes_box)
            file = f'{pose_id}-boca.png'
            make_mouth(im, box, mode).save(ROOT / file)
            entry['mouth'] = {'src': file, 'box': box}
            entry['openMouth'] = open_mouth
            written.append(file)

    POSES_JSON.write_text(json.dumps(poses, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('wrote', written)
    for pose_id in BLINK:
        eyes = by_id[pose_id].get('eyes')
        mouth = by_id[pose_id].get('mouth')
        print(pose_id, 'eyes', eyes['box'] if eyes else None, 'mouth', mouth['box'] if mouth else None)


if __name__ == '__main__':
    main()
