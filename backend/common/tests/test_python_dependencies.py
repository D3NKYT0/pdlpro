from pathlib import Path

REQUIREMENTS = Path(__file__).resolve().parents[2] / "requirements.txt"


def _requirement_lines() -> list[str]:
    return [
        line.strip()
        for line in REQUIREMENTS.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]


def test_linux_backend_pins_cpu_torch_instead_of_pypi_cuda():
    lines = _requirement_lines()
    assert "--extra-index-url https://download.pytorch.org/whl/cpu" in lines
    cpu_pins = [line for line in lines if line.startswith("torch==") and "+cpu" in line]
    assert cpu_pins, "o Linux/Docker precisa de torch==…+cpu para não instalar CUDA"
    assert any('sys_platform != "darwin"' in line for line in cpu_pins)
    assert any(line.startswith("sentence-transformers==") for line in lines)
