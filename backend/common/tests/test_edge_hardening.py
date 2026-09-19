"""Contrato de endurecimento da borda: cabeçalhos do Nginx e segredos do Compose.

Estes arquivos não são executados pela suíte, então o teste verifica as garantias que
dependem deles: herança de ``add_header``, bloqueio da árvore antiga de pacotes LGPD,
chave de rate limit não forjável e Redis autenticado com volume privado separado.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
PRODUCTION_CONF = REPO_ROOT / "frontend" / "nginx.production.conf"
DEVELOPMENT_CONF = REPO_ROOT / "nginx" / "nginx.conf"
PRODUCTION_COMPOSE = REPO_ROOT / "docker-compose.prod.yml"

SECURITY_HEADERS = (
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Content-Security-Policy",
)


def location_blocks(config: str) -> dict[str, str]:
    """Mapeia o alvo de cada ``location`` para o corpo do bloco, sem blocos aninhados."""

    blocks: dict[str, str] = {}
    lines = config.splitlines()
    index = 0
    while index < len(lines):
        stripped = lines[index].strip()
        if stripped.startswith("location ") and stripped.endswith("{"):
            target = stripped[len("location ") : -1].strip()
            depth = 1
            body: list[str] = []
            index += 1
            while index < len(lines) and depth > 0:
                current = lines[index]
                depth += current.count("{") - current.count("}")
                if depth > 0:
                    body.append(current)
                index += 1
            blocks[target] = "\n".join(body)
            continue
        index += 1
    return blocks


@pytest.fixture(params=[PRODUCTION_CONF, DEVELOPMENT_CONF], ids=["production", "development"])
def nginx_config(request) -> str:
    return request.param.read_text(encoding="utf-8")


def test_every_location_with_add_header_repeats_the_security_baseline(nginx_config):
    for target, body in location_blocks(nginx_config).items():
        if "add_header" not in body:
            continue
        for header in SECURITY_HEADERS:
            assert f"add_header {header}" in body, f"{target} perdeu {header}"


def test_default_csp_omits_script_unsafe_inline(nginx_config):
    match = re.search(r'add_header Content-Security-Policy "([^"]+)"', nginx_config)
    assert match
    policy = match.group(1)
    script = next(part.strip() for part in policy.split(";") if part.strip().startswith("script-src "))
    assert "'unsafe-inline'" not in script


def test_uploaded_media_is_served_without_permission_to_run_script(nginx_config):
    media = location_blocks(nginx_config)["^~ /media/"]

    assert "default-src 'none'" in media
    assert "script-src" not in media


def test_legacy_lgpd_export_tree_is_not_served_as_static(nginx_config):
    assert location_blocks(nginx_config)["^~ /media/lgpd_exports/"].strip() == "return 404;"


def test_rate_limit_key_only_trusts_forwarded_for_from_internal_proxies():
    config = PRODUCTION_CONF.read_text(encoding="utf-8")
    geo = re.search(r"geo \$pdl_trusted_proxy \{(.+?)\}", config, re.DOTALL)
    mapping = re.search(r"map \"\$pdl_trusted_proxy:.+?\{(.+?)\}", config, re.DOTALL)

    assert geo and "default        0;" in geo.group(1)
    assert mapping and "default $remote_addr;" in mapping.group(1)
    assert "limit_req_zone $pdl_rate_limit_client" in config


@pytest.fixture(scope="module")
def production_compose() -> dict:
    return yaml.safe_load(PRODUCTION_COMPOSE.read_text(encoding="utf-8"))


def test_redis_requires_a_password_and_the_apps_use_it(production_compose):
    redis = production_compose["services"]["redis"]
    backend_environment = production_compose["services"]["backend"]["environment"]

    assert "--requirepass ${REDIS_PASSWORD:?" in redis["command"]
    assert "REDIS_PASSWORD" in redis["environment"]["REDIS_PASSWORD"]
    assert backend_environment["REDIS_URL"].startswith("redis://:${REDIS_PASSWORD")


@pytest.mark.parametrize("service", ["backend", "asgi", "celery_worker"])
def test_private_storage_has_its_own_volume_outside_media(production_compose, service):
    volumes = production_compose["services"][service]["volumes"]

    assert "private_files:/app/private" in volumes
    assert "private_files" in production_compose["volumes"]
    assert not any(volume.startswith("private_files:/app/media") for volume in volumes)


def test_web_edge_never_mounts_the_private_storage(production_compose):
    volumes = production_compose["services"]["web"]["volumes"]

    assert all("private" not in volume for volume in volumes)


def test_entrypoint_makes_media_readable_for_the_web_nginx():
    text = (REPO_ROOT / "backend" / "entrypoint.sh").read_text(encoding="utf-8")

    assert "chmod -R a+rX /app/media" in text
    assert text.index("chmod -R a+rX /app/media") < text.index("migrate --noinput")
