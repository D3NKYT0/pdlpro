import hashlib
import json
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.cache import cache

FAILURE_LIMIT = 3
FAILURE_TTL = 15 * 60


def failure_key(request, login: str) -> str:
    ip = request.META.get("REMOTE_ADDR", "")
    digest = hashlib.sha256(f"{ip}:{login.strip().lower()}".encode()).hexdigest()
    return f"pdl:login-fail:{digest}"


def captcha_required(request, login: str) -> bool:
    return settings.HCAPTCHA_ENABLED and int(cache.get(failure_key(request, login), 0)) >= FAILURE_LIMIT


def register_failure(request, login: str) -> None:
    key = failure_key(request, login)
    cache.set(key, int(cache.get(key, 0)) + 1, FAILURE_TTL)


def clear_failures(request, login: str) -> None:
    cache.delete(failure_key(request, login))


def verify_hcaptcha(token: str, remote_ip: str = "") -> bool:
    if not settings.HCAPTCHA_ENABLED:
        return True
    if not token:
        return False
    data = urllib.parse.urlencode({"secret": settings.HCAPTCHA_SECRET_KEY, "response": token, "remoteip": remote_ip}).encode()
    try:
        with urllib.request.urlopen("https://api.hcaptcha.com/siteverify", data=data, timeout=8) as response:
            return bool(json.loads(response.read().decode()).get("success"))
    except Exception:
        return False
