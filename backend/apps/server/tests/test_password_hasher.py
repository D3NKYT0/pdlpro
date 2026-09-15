from apps.server.infrastructure.crypto.whirlpool2003 import Whirlpool2003
from apps.server.infrastructure.passwords import (
    SHA1_LENGTH,
    WHIRLPOOL_LENGTH,
    LineagePasswordHasher,
)


def test_whirlpool2003_empty_digest_matches_vector():
    assert Whirlpool2003().self_test() is True


def test_lucera_hash_is_whirlpool(settings):
    settings.LINEAGE_QUERY_MODULE = "lucerav2"
    hasher = LineagePasswordHasher()
    hashed = hasher.hash("yang")
    assert len(hashed) == WHIRLPOOL_LENGTH
    assert hasher.verify("yang", hashed)
    assert not hasher.verify("errado", hashed)


def test_verify_detects_sha1_even_on_lucera(settings):
    settings.LINEAGE_QUERY_MODULE = "lucerav2"
    hasher = LineagePasswordHasher()
    sha1 = hasher._sha1("l2pass1")
    assert len(sha1) == SHA1_LENGTH
    assert hasher.verify("l2pass1", sha1)


def test_custom_dialect_defaults_to_sha1(settings):
    settings.LINEAGE_QUERY_MODULE = "acme_l2j"
    settings.LINEAGE_PASSWORD_ALGO = ""
    hashed = LineagePasswordHasher().hash("yang")
    assert len(hashed) == SHA1_LENGTH


def test_password_algo_forces_whirlpool_on_custom_dialect(settings):
    settings.LINEAGE_QUERY_MODULE = "acme_l2j"
    settings.LINEAGE_PASSWORD_ALGO = "whirlpool"
    hashed = LineagePasswordHasher().hash("yang")
    assert len(hashed) == WHIRLPOOL_LENGTH


def test_password_algo_forces_sha1_on_lucera(settings):
    settings.LINEAGE_QUERY_MODULE = "lucerav2"
    settings.LINEAGE_PASSWORD_ALGO = "sha1"
    hashed = LineagePasswordHasher().hash("yang")
    assert len(hashed) == SHA1_LENGTH
