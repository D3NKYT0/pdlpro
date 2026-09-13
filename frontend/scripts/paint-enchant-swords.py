"""As espadas da Arena (+0 a +10) são ícones realistas em

``frontend/public/theme/default/images/games/sword-*.webp``.

Não regenere no estilo pixel: a progressão de luz (aço → ouro → glow
azul de Lineage → aura santa no +10) está pintada nesses arquivos.
"""

from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "theme" / "default" / "images" / "games"


def main() -> None:
    missing = [OUT / f"sword-{level}.webp" for level in range(11) if not (OUT / f"sword-{level}.webp").exists()]
    if missing:
        raise SystemExit("Faltam sprites: " + ", ".join(path.name for path in missing))
    for level in range(11):
        print(OUT / f"sword-{level}.webp")


if __name__ == "__main__":
    main()
