"""Empacota a release publicada do PDL PRO (ZIP + nomes de imagem + URLs)."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

DEFAULT_GITHUB_REPO = "D3NKYT0/pdlpro"
DEFAULT_IMAGE_REGISTRY = "ghcr.io/d3nkyt0/pdlpro"
BUNDLE_ROOT_PREFIX = "pdl-pro-{version}"
COMPOSE_RELEASE_HEADER = (
    "# Pacote de release: sem contexto de build. As imagens vêm de\n"
    "# PDL_BACKEND_IMAGE e PDL_WEB_IMAGE (GHCR). Gerado a partir de\n"
    "# docker-compose.prod.yml.\n"
)

BUNDLE_FILES = (
    ".env.example",
    "LICENSE",
    "README.md",
    "docker-compose.ollama.yml",
    "docs/configuracao/ambiente.md",
    "docs/operacao/backup-e-restauracao.md",
    "docs/operacao/distribuicao.md",
    "docs/operacao/implantacao.md",
    "packaging/install.ps1",
    "packaging/install.sh",
    "scripts/backup.sh",
    "scripts/configure-production.ps1",
    "scripts/configure-production.sh",
    "scripts/deploy.sh",
    "scripts/install.sh",
    "scripts/lib/common.sh",
    "scripts/pdl_release.py",
    "scripts/restore.sh",
    "setup.sh",
    "version.json",
)

_BUILD_LINE = re.compile(r"^(\s*)build:\s*$")


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def read_product_version(version_file: Path | None = None) -> str:
    path = version_file or (repo_root() / "version.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    version = str(data.get("version") or "").strip()
    if not version:
        raise ValueError("version.json não define version")
    return normalize_version(version)


def normalize_version(value: str) -> str:
    text = (value or "").strip()
    if text.lower() in {"", "latest"}:
        return "latest"
    if text[:1] in {"v", "V"} and re.match(r"^v\d", text, flags=re.IGNORECASE):
        text = text[1:]
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?", text):
        raise ValueError(f"versão inválida: {value}")
    return text


def release_tag(version: str) -> str:
    normalized = normalize_version(version)
    if normalized == "latest":
        return "latest"
    return f"v{normalized}"


def image_ref(name: str, tag: str, registry: str = DEFAULT_IMAGE_REGISTRY) -> str:
    return f"{registry.rstrip('/')}/{name}:{normalize_version(tag)}"


def image_names(version: str, registry: str = DEFAULT_IMAGE_REGISTRY) -> dict[str, str]:
    tag = normalize_version(version)
    return {
        "registry": registry.rstrip("/"),
        "tag": tag,
        "backend": image_ref("backend", tag, registry),
        "web": image_ref("web", tag, registry),
    }


def bundle_name(version: str) -> str:
    return f"pdl-pro-{normalize_version(version)}.zip"


def checksum_name(version: str) -> str:
    return f"{bundle_name(version)}.sha256"


def github_release_asset_url(repo: str, version: str, filename: str) -> str:
    return (
        f"https://github.com/{repo}/releases/download/"
        f"{release_tag(version)}/{filename}"
    )


def github_latest_api_url(repo: str) -> str:
    return f"https://api.github.com/repos/{repo}/releases/latest"


def github_release_urls(version: str, repo: str = DEFAULT_GITHUB_REPO) -> dict[str, str]:
    normalized = normalize_version(version)
    filename = bundle_name(normalized)
    return {
        "repo": repo,
        "tag": release_tag(normalized),
        "api_latest": github_latest_api_url(repo),
        "bundle": github_release_asset_url(repo, normalized, filename),
        "checksum": github_release_asset_url(repo, normalized, checksum_name(normalized)),
        "install_sh": github_release_asset_url(repo, normalized, "install.sh"),
        "install_ps1": github_release_asset_url(repo, normalized, "install.ps1"),
    }


def parse_latest_tag(payload: str) -> str:
    match = re.search(r'"tag_name"\s*:\s*"([^"]+)"', payload)
    if not match:
        raise ValueError("resposta de release sem tag_name")
    return normalize_version(match.group(1))


def strip_compose_build_sections(text: str) -> str:
    lines = text.splitlines(keepends=True)
    kept: list[str] = []
    skip_indent: int | None = None
    for line in lines:
        if skip_indent is not None:
            if not line.strip():
                continue
            indent = len(line) - len(line.lstrip(" "))
            if indent > skip_indent:
                continue
            skip_indent = None
        match = _BUILD_LINE.match(line)
        if match:
            skip_indent = len(match.group(1))
            continue
        kept.append(line)
    return "".join(kept)


def render_release_compose(prod_text: str) -> str:
    body = strip_compose_build_sections(prod_text)
    if not body.startswith("# Pacote de release"):
        body = COMPOSE_RELEASE_HEADER + body
    if "PDL_BACKEND_IMAGE" not in body or "PDL_WEB_IMAGE" not in body:
        raise ValueError("docker-compose.prod.yml precisa interpolar PDL_BACKEND_IMAGE e PDL_WEB_IMAGE")
    if re.search(r"^\s*build:", body, flags=re.MULTILINE):
        raise ValueError("o compose de release ainda contém build:")
    return body


def compose_service_names(text: str) -> list[str]:
    services: list[str] = []
    in_services = False
    for raw in text.splitlines():
        if raw.startswith("services:"):
            in_services = True
            continue
        if in_services:
            if raw and not raw.startswith(" ") and not raw.startswith("\t"):
                break
            match = re.match(r"^  ([A-Za-z0-9_]+):\s*$", raw)
            if match:
                services.append(match.group(1))
    return services


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _add_zip_file(archive: zipfile.ZipFile, source: Path, arcname: str) -> None:
    info = zipfile.ZipInfo(arcname.replace("\\", "/"))
    info.compress_type = zipfile.ZIP_DEFLATED
    data = source.read_bytes()
    if source.suffix == ".sh" or source.name == "setup.sh":
        info.external_attr = 0o755 << 16
    archive.writestr(info, data)


def pack_release(
    root: Path | None = None,
    output_dir: Path | None = None,
    version: str | None = None,
) -> dict[str, Path]:
    base = root or repo_root()
    resolved = normalize_version(version or read_product_version(base / "version.json"))
    dest_dir = output_dir or (base / "dist")
    dest_dir.mkdir(parents=True, exist_ok=True)
    zip_path = dest_dir / bundle_name(resolved)
    checksum_path = dest_dir / checksum_name(resolved)
    prefix = BUNDLE_ROOT_PREFIX.format(version=resolved)

    missing = [rel for rel in BUNDLE_FILES if not (base / rel).is_file()]
    if missing:
        raise FileNotFoundError("arquivos ausentes no pacote: " + ", ".join(missing))

    compose_text = render_release_compose(
        (base / "docker-compose.prod.yml").read_text(encoding="utf-8")
    )

    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w") as archive:
        for relative in BUNDLE_FILES:
            _add_zip_file(archive, base / relative, f"{prefix}/{relative}")
        info = zipfile.ZipInfo(f"{prefix}/docker-compose.prod.yml")
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, compose_text)

    checksum_path.write_text(f"{sha256_file(zip_path)}  {zip_path.name}\n", encoding="utf-8")
    return {"bundle": zip_path, "checksum": checksum_path}


def _print_json(payload: dict[str, str]) -> None:
    json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Empacota e descreve a release do PDL PRO.")
    sub = parser.add_subparsers(dest="command", required=True)

    pack = sub.add_parser("pack", help="Gera o ZIP da release e o checksum SHA-256")
    pack.add_argument("--output-dir", type=Path, default=None)
    pack.add_argument("--version", default=None)

    images = sub.add_parser("images", help="Mostra as tags de imagem da versão")
    images.add_argument("--version", default=None)
    images.add_argument("--registry", default=DEFAULT_IMAGE_REGISTRY)

    urls = sub.add_parser("urls", help="Mostra as URLs públicas da release")
    urls.add_argument("--version", required=True)
    urls.add_argument("--repo", default=DEFAULT_GITHUB_REPO)

    args = parser.parse_args(argv)
    if args.command == "pack":
        artifacts = pack_release(output_dir=args.output_dir, version=args.version)
        _print_json({key: str(path) for key, path in artifacts.items()})
        return 0
    if args.command == "images":
        version = args.version or read_product_version()
        _print_json(image_names(version, args.registry))
        return 0
    if args.command == "urls":
        _print_json(github_release_urls(args.version, args.repo))
        return 0
    parser.error("comando desconhecido")
    return 2


if __name__ == "__main__":
    sys.exit(main())
