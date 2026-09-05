"""Converte o fundo claro das novas poses do Denkynho em canal alpha real.

As gerações de sprite chegam em RGB com margem quase branca. Este script só pinta
de transparente os pixels claros alcançáveis pelas bordas, sem redesenhar o personagem.
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "mascot" / "denkynho"
FILES = (
    "13-dancando-sequencia.png",
    "14-carinho-sequencia.png",
    "13-dancando.png",
    "14-carinho.png",
    "03-pensando-sequencia.png",
    "09-confuso-sequencia.png",
    "02-sucesso-sequencia.png",
)


def extract(path: Path) -> None:
    """Remove o fundo claro conectado às bordas e grava RGBA no mesmo arquivo."""

    image = Image.open(path).convert("RGB")
    pixels = np.asarray(image)
    height, width = pixels.shape[:2]
    light = (pixels[:, :, 0] >= 228) & (pixels[:, :, 1] >= 228) & (pixels[:, :, 2] >= 228)
    visited = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def push(row: int, column: int) -> None:
        if not visited[row, column] and light[row, column]:
            visited[row, column] = True
            queue.append((row, column))

    for column in range(width):
        push(0, column)
        push(height - 1, column)
    for row in range(height):
        push(row, 0)
        push(row, width - 1)
    while queue:
        row, column = queue.popleft()
        if row > 0:
            push(row - 1, column)
        if row + 1 < height:
            push(row + 1, column)
        if column > 0:
            push(row, column - 1)
        if column + 1 < width:
            push(row, column + 1)
    alpha = np.where(visited, 0, 255).astype(np.uint8)
    Image.fromarray(np.dstack([pixels, alpha]), "RGBA").save(path)


def main() -> None:
    for name in FILES:
        extract(ROOT / name)


if __name__ == "__main__":
    main()
