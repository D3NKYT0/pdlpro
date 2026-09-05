"""Chroma verde e xadrez viram transparência; branco isolado do mascote permanece."""

import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[4] / "scripts" / "extract_denkynho_alpha.py"


def _load():
    spec = importlib.util.spec_from_file_location("extract_denkynho_alpha", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_green_and_checker_become_transparent_and_keep_character_white(tmp_path):
    extract = _load()
    image = np.zeros((24, 24, 4), dtype=np.uint8)
    image[:, :] = (0, 220, 0, 255)
    image[6:18, 6:18] = (20, 20, 20, 255)
    image[10:12, 10:12] = (250, 248, 245, 255)
    image[7:13, 19:23:2] = (240, 240, 240, 255)
    image[7:13, 20:23:2] = (170, 170, 170, 255)
    path = tmp_path / "sprite.png"
    Image.fromarray(image, "RGBA").save(path)
    extract.extract(path)
    result = np.asarray(Image.open(path).convert("RGBA"))
    assert result[0, 0, 3] == 0
    assert result[8, 20, 3] == 0
    assert result[11, 11, 3] == 255
    assert result[11, 11, 0] >= 240
    assert result[12, 12, 3] == 255


def test_white_cloth_touching_green_keeps_the_interior(tmp_path):
    extract = _load()
    image = np.zeros((24, 24, 4), dtype=np.uint8)
    image[:, :] = (0, 220, 0, 255)
    image[6:18, 6:18] = (20, 20, 20, 255)
    image[10:18, 8:16] = (250, 248, 245, 255)
    path = tmp_path / "carinho.png"
    Image.fromarray(image, "RGBA").save(path)
    extract.extract(path)
    result = np.asarray(Image.open(path).convert("RGBA"))
    assert result[0, 0, 3] == 0
    assert result[13, 12, 3] == 255
    assert result[13, 12, 0] >= 240


def test_enclosed_white_hole_does_not_eat_the_cloth(tmp_path):
    extract = _load()
    image = np.zeros((24, 24, 4), dtype=np.uint8)
    image[:, :] = (0, 220, 0, 255)
    image[6:18, 6:18] = (20, 20, 20, 255)
    image[10:16, 8:16] = (250, 248, 245, 255)
    image[13, 12] = (250, 248, 245, 0)
    path = tmp_path / "olho.png"
    Image.fromarray(image, "RGBA").save(path)
    extract.extract(path)
    result = np.asarray(Image.open(path).convert("RGBA"))
    assert result[13, 13, 3] == 255
    assert result[12, 12, 3] == 255


def test_carinho_sequence_removes_connected_fake_paper_background(tmp_path):
    extract = _load()
    image = np.zeros((32, 32, 4), dtype=np.uint8)
    image[:, :] = (0, 220, 0, 255)
    image[5:27, 5:27] = (24, 24, 24, 255)
    image[5:18, 13:19] = (244, 244, 244, 255)
    image[10:14, 14:18] = (226, 226, 226, 255)
    path = tmp_path / "14-carinho-sequencia.png"
    Image.fromarray(image, "RGBA").save(path)

    extract.extract(path)

    result = np.asarray(Image.open(path).convert("RGBA"))
    assert result[0, 0, 3] == 0
    assert result[8, 15, 3] == 0
    assert result[12, 16, 3] == 0
    assert result[20, 20, 3] == 255
