from apps.server.infrastructure.crypto.whirlpool2003 import Whirlpool2003
from apps.server.infrastructure.passwords import LineagePasswordHasher, SHA1_LENGTH, WHIRLPOOL_LENGTH


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
