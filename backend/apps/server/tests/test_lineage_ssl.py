"""TLS opcional na conexão SQLAlchemy do banco Lineage."""

from __future__ import annotations

import ssl

from apps.server.infrastructure.lineage_ssl import (
    build_lineage_connect_args,
    lineage_connect_args_from_settings,
)


def test_ssl_disabled_keeps_plain_connection():
    assert build_lineage_connect_args(ssl_enabled=False) == {}


def test_ssl_with_verification_requires_certificate():
    args = build_lineage_connect_args(ssl_enabled=True, verify=True, ca="/etc/ssl/game-ca.pem")
    assert args["ssl"]["ca"] == "/etc/ssl/game-ca.pem"
    assert args["ssl"]["verify_mode"] == ssl.CERT_REQUIRED
    assert args["ssl"]["check_hostname"] is True


def test_ssl_without_verification_encrypts_only():
    args = build_lineage_connect_args(ssl_enabled=True, verify=False)
    assert args["ssl"]["verify_mode"] == ssl.CERT_NONE
    assert args["ssl"]["check_hostname"] is False


def test_settings_adapter_reads_lineage_flags(settings):
    settings.LINEAGE_DB_SSL = True
    settings.LINEAGE_DB_SSL_VERIFY = True
    settings.LINEAGE_DB_SSL_CA = "/ca.pem"
    settings.LINEAGE_DB_SSL_CERT = ""
    settings.LINEAGE_DB_SSL_KEY = ""
    args = lineage_connect_args_from_settings(settings)
    assert args["ssl"]["ca"] == "/ca.pem"


def test_default_settings_keep_ssl_off(settings):
    assert settings.LINEAGE_DB_SSL is False
    assert lineage_connect_args_from_settings(settings) == {}
