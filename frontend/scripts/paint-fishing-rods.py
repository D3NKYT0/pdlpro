"""As varas da pescaria (nível 1 a 10) são ícones realistas em

``frontend/public/theme/default/images/games/rod-*.webp``.

Não regenere no estilo pixel: a progressão (junco → madeira → ouro →
glow teal encantado → aura divina no 10) está pintada nesses arquivos.
"""

from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "theme" / "default" / "images" / "games"


def main() -> None:
    missing = [OUT / f"rod-{level}.webp" for level in range(1, 11) if not (OUT / f"rod-{level}.webp").exists()]
    if missing:
        raise SystemExit("Faltam sprites: " + ", ".join(path.name for path in missing))
    for level in range(1, 11):
        print(OUT / f"rod-{level}.webp")


if __name__ == "__main__":
    main()
