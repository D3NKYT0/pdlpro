import multiprocessing
import os

bind = "0.0.0.0:8000"

_reload = os.environ.get("GUNICORN_RELOAD", "").lower() in ("1", "true", "yes")
reload = _reload
preload_app = not _reload

workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gthread"
threads = 4

timeout = 60
keepalive = 5

loglevel = "info"
# HTTP access events are emitted by ObservabilityMiddleware and by the edge proxy.
# Keeping Gunicorn's access log disabled avoids duplicate records with different schemas.
accesslog = None
errorlog = "-"

limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

max_requests = 1000
max_requests_jitter = 50

graceful_timeout = 30

forwarded_allow_ips = "*"
secure_scheme_headers = {"X-FORWARDED-PROTO": "https"}
