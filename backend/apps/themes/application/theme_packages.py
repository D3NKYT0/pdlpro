from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import BinaryIO

from django.conf import settings
from django.db import IntegrityError, transaction

from apps.themes.infrastructure.models import ThemePackage
from common.architecture.exceptions import ConflictError, EntityNotFoundError, ValidationDomainError

MAX_ARCHIVE_BYTES = 32 * 1024 * 1024
MAX_EXPANDED_BYTES = 64 * 1024 * 1024
MAX_FILES = 256
MAX_FILE_BYTES = 16 * 1024 * 1024
ALLOWED_SUFFIXES = {
    ".css", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif",
    ".woff", ".woff2", ".ttf", ".otf", ".ico", ".json",
}
SLUG_RE = re.compile(r"^[a-z][a-z0-9-]{1,63}$")
VERSION_RE = re.compile(r"^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$")
CSS_URL_RE = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)
FORBIDDEN_CSS_RE = re.compile(
    r"@import|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding|data\s*:",
    re.IGNORECASE,
)


def _themes_root() -> Path:
    root = (Path(settings.MEDIA_ROOT) / "themes").resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _safe_member_name(raw_name: str) -> str:
    normalized = raw_name.replace("\\", "/")
    path = PurePosixPath(normalized)
    if (
        not normalized
        or "\x00" in normalized
        or normalized.startswith("/")
        or re.match(r"^[A-Za-z]:", normalized)
        or any(part in {"", ".", ".."} for part in path.parts)
    ):
        raise ValidationDomainError("O ZIP contém um caminho de arquivo inválido.")
    return path.as_posix()


def _read_manifest(files: dict[str, bytes]) -> dict:
    raw = files.get("theme.json")
    if raw is None:
        raise ValidationDomainError("O pacote precisa conter theme.json na raiz.")
    try:
        manifest = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ValidationDomainError("theme.json não contém JSON UTF-8 válido.") from None
    if not isinstance(manifest, dict):
        raise ValidationDomainError("theme.json precisa conter um objeto JSON.")

    allowed = {
        "schemaVersion", "pdlVersion", "id", "name", "version", "author",
        "description", "entrypoint", "assets", "presentation",
    }
    unknown = sorted(set(manifest) - allowed)
    if unknown:
        raise ValidationDomainError(
            "theme.json contém propriedades desconhecidas.", details={"properties": unknown}
        )
    required = {"schemaVersion", "pdlVersion", "id", "name", "version", "entrypoint", "assets"}
    missing = sorted(required - set(manifest))
    if missing:
        raise ValidationDomainError(
            "theme.json não contém todos os campos obrigatórios.", details={"fields": missing}
        )
    if manifest["schemaVersion"] != 1 or manifest["pdlVersion"] != 2:
        raise ValidationDomainError("O tema não é compatível com o PDL 2.0.")
    if not isinstance(manifest["id"], str) or not SLUG_RE.fullmatch(manifest["id"]):
        raise ValidationDomainError("O identificador do tema é inválido.")
    if manifest["id"] == "default":
        raise ValidationDomainError("O tema default é reservado e não pode ser substituído.")
    if not isinstance(manifest["version"], str) or not VERSION_RE.fullmatch(manifest["version"]):
        raise ValidationDomainError("A versão deve usar SemVer, por exemplo 1.0.0.")
    for field, limit in (("name", 120), ("author", 120), ("description", 500)):
        value = manifest.get(field, "")
        if not isinstance(value, str) or not value.strip() or len(value) > limit:
            if field in {"author", "description"} and value == "":
                continue
            raise ValidationDomainError(f"O campo {field} do manifesto é inválido.")
    if not isinstance(manifest["assets"], dict):
        raise ValidationDomainError("assets precisa ser um objeto de caminhos lógicos.")
    if "presentation" in manifest:
        _validate_presentation(manifest["presentation"], manifest["assets"])
    return manifest


def _object(value, label: str, required: set[str], optional: set[str] | None = None) -> dict:
    if not isinstance(value, dict):
        raise ValidationDomainError(f"{label} precisa ser um objeto.")
    allowed = required | (optional or set())
    unknown = sorted(set(value) - allowed)
    missing = sorted(required - set(value))
    if unknown or missing:
        raise ValidationDomainError(
            f"{label} não respeita o contrato do renderer.",
            details={"unknown": unknown, "missing": missing},
        )
    return value


def _text(value, label: str, *, limit: int = 240) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValidationDomainError(f"{label} contém um texto inválido.")
    return value


def _route(value, label: str) -> str:
    route = _text(value, label, limit=160)
    if not route.startswith("/") or route.startswith("//") or "\\" in route:
        raise ValidationDomainError(f"{label} precisa ser uma rota interna do PDL.")
    return route


def _validate_presentation(value, assets: dict) -> None:
    """Valida a experiência declarativa executada pelos renderers confiáveis do frontend."""

    presentation = _object(value, "presentation", {"renderer", "navigation", "home", "footer"})
    if presentation["renderer"] != "portal-v1":
        raise ValidationDomainError("O renderer solicitado pelo tema não é suportado.")

    navigation = presentation["navigation"]
    if not isinstance(navigation, list) or not 1 <= len(navigation) <= 12:
        raise ValidationDomainError("presentation.navigation precisa ter entre 1 e 12 links.")
    for index, raw_link in enumerate(navigation):
        link = _object(raw_link, f"navigation[{index}]", {"label", "to"})
        _text(link["label"], f"navigation[{index}].label", limit=40)
        _route(link["to"], f"navigation[{index}].to")

    home = _object(
        presentation["home"], "presentation.home",
        {"hero", "features", "ranking", "cta", "news"},
    )
    hero = _object(
        home["hero"], "presentation.home.hero",
        {"title", "description", "countdownLabel", "countdownAt", "actionLabel", "actionTo"},
    )
    for key in ("title", "description", "countdownLabel", "actionLabel"):
        _text(hero[key], f"presentation.home.hero.{key}", limit=500 if key == "description" else 120)
    _route(hero["actionTo"], "presentation.home.hero.actionTo")
    try:
        datetime.fromisoformat(_text(hero["countdownAt"], "presentation.home.hero.countdownAt").replace("Z", "+00:00"))
    except ValueError:
        raise ValidationDomainError("presentation.home.hero.countdownAt precisa usar data ISO 8601.") from None

    features = _object(
        home["features"], "presentation.home.features",
        {"title", "subtitle", "actionLabel", "actionTo", "items"},
    )
    for key in ("title", "subtitle", "actionLabel"):
        _text(features[key], f"presentation.home.features.{key}")
    _route(features["actionTo"], "presentation.home.features.actionTo")
    items = features["items"]
    if not isinstance(items, list) or not 1 <= len(items) <= 12:
        raise ValidationDomainError("presentation.home.features.items precisa ter entre 1 e 12 itens.")
    for index, raw_item in enumerate(items):
        item = _object(raw_item, f"features.items[{index}]", {"title", "description", "asset"})
        _text(item["title"], f"features.items[{index}].title", limit=100)
        _text(item["description"], f"features.items[{index}].description", limit=500)
        asset = _text(item["asset"], f"features.items[{index}].asset", limit=160)
        if asset not in assets:
            raise ValidationDomainError("Um recurso visual da apresentação não foi declarado em assets.")

    ranking = _object(
        home["ranking"], "presentation.home.ranking",
        {"title", "subtitle", "actionLabel", "actionTo", "tabs"},
    )
    for key in ("title", "subtitle", "actionLabel"):
        _text(ranking[key], f"presentation.home.ranking.{key}")
    _route(ranking["actionTo"], "presentation.home.ranking.actionTo")
    tabs = ranking["tabs"]
    allowed_rankings = {"pvp", "pk", "clans", "level", "adena", "online"}
    if not isinstance(tabs, list) or not 1 <= len(tabs) <= 8:
        raise ValidationDomainError("presentation.home.ranking.tabs precisa ter entre 1 e 8 abas.")
    for index, raw_tab in enumerate(tabs):
        tab = _object(raw_tab, f"ranking.tabs[{index}]", {"id", "label", "kind"})
        if not isinstance(tab["id"], str) or not SLUG_RE.fullmatch(tab["id"]):
            raise ValidationDomainError("Uma aba do ranking possui identificador inválido.")
        _text(tab["label"], f"ranking.tabs[{index}].label", limit=40)
        if tab["kind"] not in allowed_rankings:
            raise ValidationDomainError("Uma aba solicita um ranking não permitido.")

    for section_name in ("cta", "news"):
        section = home[section_name]
        if section_name == "cta":
            section = _object(section, "presentation.home.cta", {"title", "description", "actionLabel", "actionTo"})
            _text(section["description"], "presentation.home.cta.description", limit=500)
            _text(section["actionLabel"], "presentation.home.cta.actionLabel", limit=80)
            _route(section["actionTo"], "presentation.home.cta.actionTo")
        else:
            section = _object(section, "presentation.home.news", {"title"})
        _text(section["title"], f"presentation.home.{section_name}.title", limit=120)

    footer = _object(presentation["footer"], "presentation.footer", {"tagline", "copyright"})
    _text(footer["tagline"], "presentation.footer.tagline", limit=300)
    _text(footer["copyright"], "presentation.footer.copyright", limit=200)


def _validate_css(path: str, content: bytes, available: set[str]) -> None:
    try:
        css = content.decode("utf-8")
    except UnicodeDecodeError:
        raise ValidationDomainError(f"{path} precisa estar codificado em UTF-8.") from None
    if FORBIDDEN_CSS_RE.search(css):
        raise ValidationDomainError(f"{path} contém uma construção CSS não permitida.")
    parent = PurePosixPath(path).parent
    for match in CSS_URL_RE.finditer(css):
        target = match.group(2).strip()
        if not target or target.startswith("#"):
            continue
        if ":" in target or target.startswith("//") or "?" in target or "#" in target:
            raise ValidationDomainError(f"{path} referencia um recurso externo ou inválido.")
        resolved = PurePosixPath(parent, target)
        if ".." in resolved.parts:
            raise ValidationDomainError(f"{path} tenta acessar um recurso fora do pacote.")
        if resolved.as_posix() not in available:
            raise ValidationDomainError(
                f"{path} referencia um arquivo ausente.", details={"asset": target}
            )


def _validate_package(archive: bytes) -> tuple[dict, dict[str, bytes]]:
    try:
        from io import BytesIO
        zip_file = zipfile.ZipFile(BytesIO(archive))
    except (zipfile.BadZipFile, OSError):
        raise ValidationDomainError("O arquivo enviado não é um ZIP válido.") from None

    files: dict[str, bytes] = {}
    total = 0
    infos = zip_file.infolist()
    if len(infos) > MAX_FILES:
        raise ValidationDomainError(f"O pacote pode conter no máximo {MAX_FILES} arquivos.")
    for info in infos:
        name = _safe_member_name(info.filename.rstrip("/"))
        if info.is_dir():
            continue
        if (info.external_attr >> 16) & 0o170000 == 0o120000:
            raise ValidationDomainError("Links simbólicos não são permitidos no pacote.")
        if name in files:
            raise ValidationDomainError("O ZIP contém nomes de arquivo duplicados.")
        suffix = PurePosixPath(name).suffix.lower()
        if suffix not in ALLOWED_SUFFIXES:
            raise ValidationDomainError(
                "O pacote contém um tipo de arquivo não permitido.", details={"file": name}
            )
        if suffix == ".json" and name != "theme.json":
            raise ValidationDomainError(
                "Somente o manifesto theme.json pode usar o formato JSON.", details={"file": name}
            )
        if info.file_size > MAX_FILE_BYTES:
            raise ValidationDomainError(f"O arquivo {name} excede o limite individual.")
        total += info.file_size
        if total > MAX_EXPANDED_BYTES:
            raise ValidationDomainError("O conteúdo descompactado excede 64 MB.")
        if info.compress_size and info.file_size / info.compress_size > 200:
            raise ValidationDomainError("O pacote contém uma taxa de compressão suspeita.")
        files[name] = zip_file.read(info)
    zip_file.close()

    manifest = _read_manifest(files)
    entrypoint = _safe_member_name(str(manifest["entrypoint"]))
    if not entrypoint.endswith(".css") or entrypoint not in files:
        raise ValidationDomainError("O entrypoint CSS declarado não existe no pacote.")
    for logical_name, asset_path in manifest["assets"].items():
        if not isinstance(logical_name, str) or not logical_name or not isinstance(asset_path, str):
            raise ValidationDomainError("O mapa de assets contém uma entrada inválida.")
        safe_asset = _safe_member_name(asset_path)
        if safe_asset not in files or safe_asset == "theme.json":
            raise ValidationDomainError(
                "O manifesto referencia um asset ausente.", details={"asset": asset_path}
            )
    available = set(files)
    for path, content in files.items():
        if path.endswith(".css"):
            _validate_css(path, content, available)
    return manifest, files


def serialize_theme(theme: ThemePackage | None = None) -> dict:
    """Produz o contrato público; sem registro ativo retorna o default imutável."""

    if theme is None:
        return {
            "id": "default", "package_id": None, "name": "PDL Default", "version": "2.0.0",
            "author": "PDL", "description": "Tema original preservado do PDL PRO.",
            "active": True, "builtin": True, "base_url": "/theme/default/",
            "stylesheet_url": None, "assets": {}, "presentation": None,
        }
    base_url = f"{settings.MEDIA_URL.rstrip('/')}/themes/{theme.storage_path}/"
    assets = {
        key: f"{base_url}{value}" for key, value in theme.manifest.get("assets", {}).items()
    }
    return {
        "id": theme.slug, "package_id": str(theme.id), "name": theme.name,
        "version": theme.version, "author": theme.author, "description": theme.description,
        "active": theme.is_active, "builtin": False, "base_url": base_url,
        "stylesheet_url": f"{base_url}{theme.entrypoint}", "assets": assets,
        "presentation": theme.manifest.get("presentation"),
    }


def get_active_theme() -> dict:
    return serialize_theme(ThemePackage.objects.filter(is_active=True).first())


def list_themes() -> list[dict]:
    active_package = ThemePackage.objects.filter(is_active=True).exists()
    default = serialize_theme()
    default["active"] = not active_package
    return [default, *(serialize_theme(theme) for theme in ThemePackage.objects.all())]


def install_theme(upload: BinaryIO, *, size: int, user) -> dict:
    """Valida e publica um ZIP sem extrair caminhos fornecidos diretamente pelo cliente."""

    if size <= 0 or size > MAX_ARCHIVE_BYTES:
        raise ValidationDomainError("O ZIP deve ter no máximo 32 MB.")
    archive = upload.read(MAX_ARCHIVE_BYTES + 1)
    if len(archive) > MAX_ARCHIVE_BYTES:
        raise ValidationDomainError("O ZIP deve ter no máximo 32 MB.")
    manifest, files = _validate_package(archive)
    digest = hashlib.sha256(archive).hexdigest()
    slug, version = manifest["id"], manifest["version"]
    if ThemePackage.objects.filter(slug=slug, version=version).exists():
        raise ConflictError("Esta versão do tema já está instalada.")

    relative = f"{slug}/{version}-{digest[:12]}"
    root = _themes_root()
    final = (root / relative).resolve()
    if root not in final.parents or final.exists():
        raise ConflictError("O destino desta versão do tema já existe.")
    staging = Path(tempfile.mkdtemp(prefix=".install-", dir=root))
    try:
        for name, content in files.items():
            destination = (staging / name).resolve()
            if staging not in destination.parents:
                raise ValidationDomainError("O ZIP contém um caminho inseguro.")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
        final.parent.mkdir(parents=True, exist_ok=True)
        os.replace(staging, final)
        try:
            with transaction.atomic():
                theme = ThemePackage.objects.create(
                    slug=slug,
                    name=manifest["name"].strip(),
                    version=version,
                    author=manifest.get("author", "").strip(),
                    description=manifest.get("description", "").strip(),
                    manifest=manifest,
                    content_hash=digest,
                    storage_path=relative,
                    entrypoint=manifest["entrypoint"],
                    installed_by=user,
                )
        except IntegrityError:
            shutil.rmtree(final, ignore_errors=True)
            raise ConflictError("Esta versão do tema já está instalada.") from None
        return serialize_theme(theme)
    except Exception:
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)
        if final.exists():
            shutil.rmtree(final, ignore_errors=True)
        raise


def activate_theme(package_id: str | None) -> dict:
    """Ativa uma versão sob transação; ``None`` restaura o tema default."""

    with transaction.atomic():
        ThemePackage.objects.select_for_update().filter(is_active=True).update(is_active=False)
        if package_id is None:
            return serialize_theme()
        try:
            theme = ThemePackage.objects.select_for_update().get(id=package_id)
        except (ThemePackage.DoesNotExist, ValueError):
            raise EntityNotFoundError("Tema não encontrado.") from None
        theme.is_active = True
        theme.save(update_fields=("is_active", "updated_at"))
        return serialize_theme(theme)


def delete_theme(package_id: str) -> None:
    """Remove somente pacotes inativos e valida o destino antes da exclusão recursiva."""

    try:
        theme = ThemePackage.objects.get(id=package_id)
    except (ThemePackage.DoesNotExist, ValueError):
        raise EntityNotFoundError("Tema não encontrado.") from None
    if theme.is_active:
        raise ConflictError("Ative outro tema antes de remover este pacote.")
    root = _themes_root()
    target = (root / theme.storage_path).resolve()
    if root not in target.parents:
        raise ValidationDomainError("O caminho armazenado para o tema é inválido.")
    trash = (root / f".delete-{theme.id}").resolve()
    if target.exists():
        os.replace(target, trash)
    try:
        with transaction.atomic():
            theme.delete()
    except Exception:
        if trash.exists():
            os.replace(trash, target)
        raise
    if trash.exists():
        shutil.rmtree(trash)
